import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useStore, SifraStatus } from "../store/useStore";
import { AudioStreamer } from "../utils/AudioStreamer";

interface LiveSessionContextType {
  startCall: () => void;
  endCall: () => void;
  analyserNode: AnalyserNode | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  sendTextMessage: (text: string) => void;
}

const LiveSessionContext = createContext<LiveSessionContextType | null>(null);

export function useLiveSession() {
  const context = useContext(LiveSessionContext);
  if (!context) {
    throw new Error("useLiveSession must be used within LiveSessionProvider");
  }
  return context;
}

export default function LiveSessionProvider({ children }: { children: React.ReactNode }) {
  const status = useStore((state) => state.status);
  const setStatus = useStore((state) => state.setStatus);
  const isMicActive = useStore((state) => state.isMicActive);
  const isCameraActive = useStore((state) => state.isCameraActive);
  const glowColor = useStore((state) => state.glowColor);
  const setGlowColor = useStore((state) => state.setGlowColor);
  const saveMemory = useStore((state) => state.saveMemory);
  const memory = useStore((state) => state.memory);
  const setUserTranscript = useStore((state) => state.setUserTranscript);
  const setSifraTranscript = useStore((state) => state.setSifraTranscript);

  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // Refs for tracking connections
  const wsRef = useRef<WebSocket | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const visionIntervalRef = useRef<any>(null);

  // Create or retrieve AudioStreamer instance
  const getAudioStreamer = () => {
    if (!audioStreamerRef.current) {
      audioStreamerRef.current = new AudioStreamer();
    }
    return audioStreamerRef.current;
  };

  // 1. Core Connection Controller (Start Call)
  const startCall = async () => {
    if (status !== "disconnected" && status !== "error") return;

    setStatus("connecting");
    setUserTranscript("");
    setSifraTranscript("");
    useStore.getState().clearMessages();
    useStore.getState().setChatOpen(true);

    let currentKomalText = "";
    let currentUserText = "";

    const streamer = getAudioStreamer();

    try {
      // Initialize output playback context and fetch AnalyserNode for Three.js
      const activeAnalyser = streamer.initPlaybackContext();
      setAnalyserNode(activeAnalyser);

      // Establish secure/insecure WebSocket matching the current origin protocol
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const memoryParam = encodeURIComponent(JSON.stringify(memory));
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws?memory=${memoryParam}`;
      
      console.log("Connecting SIFRA live stream on:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Set up streamer handlers
      streamer.onAudioInput = (base64) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "audio", data: base64 }));
        }
      };

      // VAD Barge-in trigger: if user volume triggers, instantly halt SIFRA speakers
      streamer.onUserSpeechDetected = () => {
        streamer.stopPlayback();
        setStatus("listening");
        setUserTranscript("Listening to you speak...");
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "interrupt" }));
        }
      };

      ws.onopen = () => {
        console.log("WebSocket connection to SIFRA established.");
        // Start recording immediately if mic toggle starts as true
        if (isMicActive) {
          streamer.startRecording().then(() => {
            if (streamer.isSimulatedMic) {
              setSifraTranscript("Aww, honey, I can't hear you! Did you unplug your mic? 😘 (No microphone detected - running in viewer-only mode)");
            }
          }).catch((err) => {
            console.error("Mic initialization failed on startup connection:", err);
            setStatus("error");
            setSifraTranscript("Aww, honey, I can't access your microphone! 🎤 Make sure you have a microphone connected and have granted permissions.");
          });
        }
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === "session_established") {
            setStatus("listening");
            currentKomalText = "";
            currentUserText = "";
          } else if (msg.type === "audio") {
            // Play conversational chunk from SIFRA
            setStatus("speaking");
            streamer.playAudioChunk(msg.data);
          } else if (msg.type === "transcription") {
            // Live subtitling transcript text
            currentKomalText += msg.text;
            setSifraTranscript(currentKomalText);
            useStore.getState().updateLiveMessage("komal", currentKomalText, true);
          } else if (msg.type === "user_transcription") {
            // Live user voice transcription
            currentUserText += msg.text;
            setUserTranscript(currentUserText);
            useStore.getState().updateLiveMessage("user", currentUserText, true);
          } else if (msg.type === "interrupted") {
            console.log("Server interrupted SIFRA's output playback.");
            streamer.stopPlayback();
            setStatus("listening");
            useStore.getState().updateLiveMessage("komal", currentKomalText ? (`${currentKomalText} [interrupted]`) : "...", false);
            setSifraTranscript("");
            setUserTranscript("");
            currentKomalText = "";
            currentUserText = "";
          } else if (msg.type === "turnComplete") {
            setStatus("listening");
            if (currentKomalText) {
              useStore.getState().updateLiveMessage("komal", currentKomalText, false);
            }
            if (currentUserText) {
              useStore.getState().updateLiveMessage("user", currentUserText, false);
            }
            setSifraTranscript("");
            setUserTranscript("");
            currentKomalText = "";
            currentUserText = "";
          } else if (msg.type === "toolCall") {
            // Executing client-side tools/functions from SIFRA
            handleClientToolCall(msg.name, msg.args);
          } else if (msg.type === "error") {
            console.error("SIFRA Socket reported error:", msg.message);
            setStatus("error");
          }
        } catch (e) {
          console.error("Error processing message from server ws:", e);
        }
      };

      ws.onclose = () => {
        console.log("SIFRA Live WebSocket closed.");
        endCall();
      };

      ws.onerror = (err) => {
        console.error("SIFRA WS connection error:", err);
        setStatus("error");
      };

    } catch (err) {
      console.error("Failed to connect live session:", err);
      setStatus("error");
      endCall();
    }
  };

  // 2. Client-Side Tool/Functions Executor (openWebsite, changeTheme, saveUserMemory)
  const handleClientToolCall = (name: string, args: any) => {
    switch (name) {
      case "openWebsite":
        if (args.url) {
          console.log(`SIFRA requested: Opening URL ${args.url}`);
          window.open(args.url, "_blank");
        }
        break;
      case "changeTheme":
        if (args.color) {
          console.log(`SIFRA requested theme adjustment to: ${args.color}`);
          setGlowColor(args.color.toLowerCase());
        }
        break;
      case "saveUserMemory":
        console.log("SIFRA requested memory saving:", args);
        saveMemory({
          name: args.name || memory.name,
          likes: args.likes || memory.likes,
          dislikes: args.dislikes || memory.dislikes,
        });
        break;
      default:
        console.warn(`Unknown tool call from SIFRA: ${name}`, args);
    }
  };

  // 3. Connection Termination Controller (End Call)
  const endCall = () => {
    setStatus("disconnected");
    setSifraTranscript("");
    setUserTranscript("");

    // Stop and clean up audio
    if (audioStreamerRef.current) {
      audioStreamerRef.current.destroy();
      audioStreamerRef.current = null;
    }
    setAnalyserNode(null);

    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    // Stop camera
    stopCamera();
  };

  // 4. Reactive State Handlers (Mic state toggled in store)
  useEffect(() => {
    const streamer = audioStreamerRef.current;
    if (!streamer || status === "disconnected" || status === "error") return;

    if (isMicActive) {
      streamer.startRecording().then(() => {
        if (streamer.isSimulatedMic) {
          setSifraTranscript("Aww, honey, I can't hear you! Did you unplug your mic? 😘 (No microphone detected - running in viewer-only mode)");
        }
      }).catch((e) => {
        console.log("Failed to start mic recording:", e);
        setStatus("error");
        setSifraTranscript("Aww, honey, I can't access your microphone! 🎤 Make sure you have a microphone connected and have granted permissions.");
      });
    } else {
      streamer.stopRecording();
    }
  }, [isMicActive, status]);

  // 5. Reactive Vision Camera Setup & Frame Grabber (1 fps)
  useEffect(() => {
    if (isCameraActive && (status === "listening" || status === "speaking" || status === "connecting")) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isCameraActive, status]);

  // Starts webcam capture and schedules 1 fps frame grabs
  const startCamera = async () => {
    if (cameraStreamRef.current) return;
    try {
      console.log("Requesting webcam stream for SIFRA vision...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 400 },
          height: { ideal: 300 },
          frameRate: { ideal: 5 },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.log("Video preview autoplay blocked:", e));
      }

      // Schedule background captures (JPEG/64) sent over websocket to SIFRA
      // Set to 1000ms (1 fps) for responsive vision with nominal resource load
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = 240; // Downscale frame size for lightweight base64 transfers
      offscreenCanvas.height = 180;
      const ctx = offscreenCanvas.getContext("2d");

      visionIntervalRef.current = setInterval(() => {
        const videoElement = videoRef.current;
        const ws = wsRef.current;

        if (videoElement && ctx && ws && ws.readyState === WebSocket.OPEN) {
          try {
            // Clear and draw frame on canvas
            ctx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
            
            // Extract lightweight 60%-quality compressed JPEG data URL to save bandwidth
            const dataUrl = offscreenCanvas.toDataURL("image/jpeg", 0.6);
            const base64Data = dataUrl.split(",")[1]; // Extract raw base64 data only

            if (base64Data) {
              ws.send(JSON.stringify({ type: "video", data: base64Data }));
            }
          } catch (e) {
            console.error("Failed to capture vision frame:", e);
          }
        }
      }, 1000);

    } catch (err) {
      console.error("Camera access failed:", err);
      useStore.getState().setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // 4. Send Custom Typed Text Messages to KOMAL Live
  const sendTextMessage = (text: string) => {
    if (!text.trim()) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Append user message immediately
      useStore.getState().addMessage("user", text, false);
      // Sync userTranscript text
      setUserTranscript(text);
      // Send to backend via text type payload
      ws.send(JSON.stringify({ type: "text", text }));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return (
    <LiveSessionContext.Provider value={{ startCall, endCall, analyserNode, videoRef, sendTextMessage }}>
      {children}
    </LiveSessionContext.Provider>
  );
}
