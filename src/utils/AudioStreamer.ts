export class AudioStreamer {
  private inputCtx: AudioContext | null = null;
  private outputCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private activeSources: AudioBufferSourceNode[] = [];
  public outputAnalyser: AnalyserNode | null = null;
  private worker: Worker | null = null;
  private nextStartTime: number = 0;
  private isRecording: boolean = false;
  private isInitializing: boolean = false;
  public isSimulatedMic: boolean = false;

  // Callbacks
  public onAudioInput: ((base64Pcm: string) => void) | null = null;
  public onUserSpeechDetected: (() => void) | null = null;

  constructor() {
    this.initWorker();
  }

  // Initialise inline Web Worker to offload computing encoding from main thread
  private initWorker() {
    const workerCode = `
      self.onmessage = function(e) {
        const { type, float32Data } = e.data;
        if (type === "encode_pcm16") {
          const len = float32Data.length;
          const buffer = new ArrayBuffer(len * 2);
          const view = new DataView(buffer);
          
          let offset = 0;
          for (let i = 0; i < len; i++) {
            // Clip Float32 range [-1.0, 1.0] to prevent overflow distortion
            let s = Math.max(-1.0, Math.min(1.0, float32Data[i]));
            // Scale and map to Int16
            const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
            view.setInt16(offset, val, true); // Little endian PCM
            offset += 2;
          }
          
          // Fast binary encoding to base64
          let binary = "";
          const bytes = new Uint8Array(buffer);
          const bytesLen = bytes.byteLength;
          for (let idx = 0; idx < bytesLen; idx++) {
            binary += String.fromCharCode(bytes[idx]);
          }
          const base64 = btoa(binary);
          
          self.postMessage({ type: "pcm_data", base64 });
        }
      };
    `;

    try {
      const blob = new Blob([workerCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);
      this.worker.onmessage = (e) => {
        if (e.data.type === "pcm_data" && this.onAudioInput && this.isRecording) {
          this.onAudioInput(e.data.base64);
        }
      };
    } catch (err) {
      console.error("Failed to construct audio Web Worker:", err);
    }
  }

  // Start microphone capture and VAD processing
  public async startRecording(): Promise<void> {
    if (this.isRecording || this.isInitializing) return;

    this.isInitializing = true;
    this.isRecording = true;
    this.isSimulatedMic = false;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported in this browser.");
      }

      try {
        this.inputCtx = new AudioContextClass({
          sampleRate: 16000,
        });
      } catch (ctxErr) {
        console.warn("Could not create AudioContext with sampleRate: 16000, falling back to default:", ctxErr);
        this.inputCtx = new AudioContextClass();
      }

      // If we were stopped or cancelled while allocating context
      if (!this.inputCtx || !this.isRecording) {
        this.isInitializing = false;
        return;
      }

      let userStream: MediaStream | null = null;
      // 2. Strict getUserMedia constraints (Echo cancellation & Noise suppression enabled)
      try {
        userStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      } catch (innerErr) {
        console.warn("SIFRA strict audio constraints failed, trying basic audio stream fallback...", innerErr);
        if (this.isRecording && this.inputCtx) {
          try {
            userStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            });
          } catch (basicErr: any) {
            console.warn("No physical microphone available or allowed. Initializing silent virtual audio stream destination fallback...", basicErr);
            if (this.isRecording && this.inputCtx) {
              this.isSimulatedMic = true;
              
              const dummyDest = this.inputCtx.createMediaStreamDestination();
              const osc = this.inputCtx.createOscillator();
              const gain = this.inputCtx.createGain();
              gain.gain.value = 1e-10;  // Perfectly silent
              osc.connect(gain);
              gain.connect(dummyDest);
              osc.start();
              
              userStream = dummyDest.stream;
            }
          }
        }
      }

      // Check if we were stopped / destroyed while awaiting media stream
      if (!this.isRecording || !this.inputCtx || !userStream) {
        if (userStream) {
          userStream.getTracks().forEach((track) => track.stop());
        }
        this.isInitializing = false;
        return;
      }

      this.stream = userStream;
      this.sourceNode = this.inputCtx.createMediaStreamSource(this.stream);
      // Create ScriptProcessor Node (Buffer size 2048 samples, 1 channel)
      this.processor = this.inputCtx.createScriptProcessor(2048, 1, 1);

      this.sourceNode.connect(this.processor);
      this.processor.connect(this.inputCtx.destination);

      this.isInitializing = false;

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;

        const float32Data = e.inputBuffer.getChannelData(0);

        // 3. Local Voice Activity Detection (VAD) via RMS calculation
        let sum = 0;
        for (let i = 0; i < float32Data.length; i++) {
          sum += float32Data[i] * float32Data[i];
        }
        const rms = Math.sqrt(sum / float32Data.length);

        // Standard speech detection threshold (0.012 to 0.015)
        if (rms > 0.014) {
          if (this.onUserSpeechDetected) {
            this.onUserSpeechDetected();
          }
        }

        // 4. Offload PCM conversion + Base64 encoding work to background worker thread
        if (this.worker) {
          const clonedData = new Float32Array(float32Data);
          this.worker.postMessage(
            { type: "encode_pcm16", float32Data: clonedData },
            [clonedData.buffer] // Structured clone transferables for zero-copy performance
          );
        }
      };
    } catch (err) {
      console.error("Error accessing microphone for SIFRA:", err);
      this.isInitializing = false;
      this.stopRecording();
      throw err;
    }
  }

  // Mutes/stops mic recording pipeline
  public stopRecording() {
    this.isRecording = false;
    this.isInitializing = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.inputCtx) {
      this.inputCtx.close().catch((e) => console.log("Error closing input audio context:", e));
      this.inputCtx = null;
    }
  }

  // Setup separate audio context at 24000Hz specifically for SIFRA voice playback outputs
  public initPlaybackContext(): AnalyserNode {
    if (!this.outputCtx) {
      this.outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000, // SIFRA speakers at 24kHz
      });
      this.outputAnalyser = this.outputCtx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.connect(this.outputCtx.destination);
    }
    
    // Resume context if suspended (Browser interaction safety)
    if (this.outputCtx.state === "suspended") {
      this.outputCtx.resume().catch((e) => console.log("Failed to resume playback audio:", e));
    }

    return this.outputAnalyser;
  }

  // Play SIFRA response chunks gaplessly
  public playAudioChunk(base64Data: string) {
    if (!this.outputCtx) {
      this.initPlaybackContext();
    }

    const outputCtx = this.outputCtx!;
    const analyser = this.outputAnalyser!;

    try {
      // 1. Convert Base64 data to Int16 ArrayBuffer
      const binary = atob(base64Data);
      const len = binary.length;
      const buffer = new ArrayBuffer(len);
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const int16Array = new Int16Array(buffer);

      // 2. Decode Int16 PCM to Float32 [-1, 1] range values
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // 3. Mount float array into Web AudioBuffer (sampleRate 24000)
      const audioBuffer = outputCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = outputCtx.createBufferSource();
      source.buffer = audioBuffer;

      // Connect source to analyser and output
      source.connect(analyser);

      const currentTime = outputCtx.currentTime;

      // Gapless scheduler implementation
      if (this.nextStartTime < currentTime) {
        // Fallbehind: schedule slightly in the future to absorb potential network delays
        this.nextStartTime = currentTime + 0.045;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      // Retain tracking of playback source nodes to wipe instantly during user interruptions
      this.activeSources.push(source);

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
      };
    } catch (e) {
      console.error("Failed to decode and play SIFRA audio chunk:", e);
    }
  }

  // Stop SIFRA speech playback instantly (Interruption barge-in / Phone hang-up)
  public stopPlayback() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (err) {
        // Catch silent if node is already stopped/disposed
      }
    });
    this.activeSources = [];
    this.nextStartTime = 0;
  }

  // Completely destroy audio pipeline instances
  public destroy() {
    this.stopRecording();
    this.stopPlayback();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.outputCtx) {
      this.outputCtx.close().catch((e) => console.log("Error closing output audio context:", e));
      this.outputCtx = null;
      this.outputAnalyser = null;
    }
  }
}
