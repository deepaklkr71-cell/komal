import { useEffect, useRef } from "react";
import { useStore, SifraStatus } from "../store/useStore";

interface Visualizer3DProps {
  analyser: AnalyserNode | null;
}

// Accent RGB mappings for dynamic glowing alpha combinations
const RGB_COLOR_MAP: Record<string, string> = {
  rose: "244, 63, 94",
  cyan: "6, 182, 212",
  amber: "245, 158, 11",
  emerald: "16, 184, 129",
  indigo: "99, 102, 241",
  purple: "168, 85, 247",
  fuchsia: "217, 70, 239",
  orange: "249, 115, 22",
  lime: "132, 204, 22",
  sky: "14, 165, 233",
  violet: "139, 92, 246",
  yellow: "234, 179, 8",
  slate: "100, 116, 139",
};

class SifraParticle {
  x: number = 0;
  y: number = 0;
  z: number = 0;
  hx: number = 0;
  hy: number = 0;
  hz: number = 0;
  theta: number;
  phi: number;
  baseR: number;
  phase: number;
  brightnessMult: number;
  isAccent: boolean;

  constructor(radius: number) {
    this.theta = Math.random() * Math.PI * 2;
    this.phi = Math.acos((Math.random() * 2) - 1);
    
    // Spherical distribution with thickness
    this.baseR = radius * (0.85 + Math.random() * 0.15);
    
    this.phase = Math.random() * Math.PI * 2;
    this.brightnessMult = 0.5 + Math.random() * 0.5;
    
    // Accentuate some particles to light up with user chosen theme
    this.isAccent = Math.random() > 0.65;
    
    this.recalculate();

    // Parametric 3D Heart coordinates for morphing transformation
    const t = this.theta;
    const heartScale = radius * 0.052; // relative scale matching sphere
    this.hx = 15 * Math.pow(Math.sin(t), 3) * heartScale;
    this.hy = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * heartScale;
    // Volumetric Z depth
    this.hz = Math.cos(this.phi) * radius * 0.42;
  }

  recalculate() {
    this.x = this.baseR * Math.sin(this.phi) * Math.cos(this.theta);
    this.y = this.baseR * Math.sin(this.phi) * Math.sin(this.theta);
    this.z = this.baseR * Math.cos(this.phi);
  }

  update(time: number, status: SifraStatus, normLevel: number, heartActive: boolean) {
    let r = this.baseR;

    if (heartActive) {
      // Rapid heart rate double-beat lub-dub rhythm
      const beat = time * 8.5;
      const heartPulse = Math.max(0, Math.sin(beat)) * 0.62 + Math.max(0, Math.sin(beat * 2 - Math.PI / 2)) * 0.38;
      const pulsingRadius = heartPulse * 16.5 * (1.0 + normLevel * 1.5);
      r = this.baseR + pulsingRadius;
    } else if (status === "connecting") {
      // Swirling cosmic wormhole vortex
      const wave = Math.sin(time * 9.0 + this.baseR * 0.05) * 14;
      r = this.baseR + wave;
    } else if (status === "listening") {
      // Highly excited vocal frequency response
      const noise = Math.sin(time * 26.0 + this.phase) * 6.0 * (1.0 + normLevel * 6.5);
      r = this.baseR + noise;
    } else if (status === "speaking") {
      // Harmonic radial respiration waves
      const wave = Math.sin(this.theta * 5.0 + time * 14.0) * Math.cos(this.phi * 4.0 - time * 9.0) * 24.0 * normLevel;
      const waveSecondary = Math.sin(this.baseR * 0.1 - time * 8.0) * 8.0 * normLevel;
      r = this.baseR + wave + waveSecondary;
    } else {
      // Calm, organic breathing idle motion
      const breathing = Math.sin(time * 2.0 + this.phase) * 4.5;
      r = this.baseR + breathing;
    }

    this.x = r * Math.sin(this.phi) * Math.cos(this.theta);
    this.y = r * Math.sin(this.phi) * Math.sin(this.theta);
    this.z = r * Math.cos(this.phi);
  }
}

class FloatingHeart2D {
  x: number;
  y: number;
  sz: number;
  speedY: number;
  speedX: number;
  alpha: number;
  rot: number;
  rotSpeed: number;

  constructor(centerX: number, centerY: number) {
    this.x = centerX + (Math.random() - 0.5) * 60;
    this.y = centerY + (Math.random() - 0.5) * 60;
    this.sz = 5 + Math.random() * 9;
    this.speedY = -(1.1 + Math.random() * 1.5);
    this.speedX = (Math.random() - 0.5) * 0.8;
    this.alpha = 1.0;
    this.rot = (Math.random() - 0.5) * 0.6;
    this.rotSpeed = (Math.random() - 0.5) * 0.05;
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    this.rot += this.rotSpeed;
    this.alpha -= 0.012; // slow premium fade out
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = `rgba(244, 63, 94, ${this.alpha * 0.8})`; // beautiful warm rose/pink
    
    // Smooth parametric vector heart path
    ctx.beginPath();
    const d = this.sz;
    ctx.moveTo(0, -d / 4);
    ctx.bezierCurveTo(-d / 2, -d / 2, -d, -d / 4, -d, d / 4);
    ctx.bezierCurveTo(-d, d * 0.7, -d / 4, d * 0.9, 0, d);
    ctx.bezierCurveTo(d / 4, d * 0.9, d, d * 0.7, d, d / 4);
    ctx.bezierCurveTo(d, -d / 4, d / 2, -d / 2, 0, -d / 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export default function Visualizer3D({ analyser }: Visualizer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const status = useStore((state) => state.status);
  const glowColor = useStore((state) => state.glowColor);
  const userTranscript = useStore((state) => state.userTranscript);
  const sifraTranscript = useStore((state) => state.sifraTranscript);

  // Mutable refs to keep high density rendering loop completely fluid
  const heartActiveRef = useRef(false);
  const lastProcessedUserText = useRef("");
  const lastProcessedSifraText = useRef("");
  const heartTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor transcripts for emotive keywords to trigger the romantic state
  useEffect(() => {
    const checkEmotiveTrigger = (text: string) => {
      if (!text) return false;
      const lowerText = text.toLowerCase();
      const loveKeywords = [
        "love", "kiss", "muah", "chumma", "pyaar", "pyar", "dil", "heart", 
        "mohabat", "mohabbat", "jaan", "sweet", "honey", "sassy", "flirt", 
        "cute", "प्यार", "मोहब्बत", "चूमना", "दिलों", "दिल", "इश्क", "ishq"
      ];
      return loveKeywords.some((word) => lowerText.includes(word));
    };

    let triggerEffect = false;

    if (userTranscript && userTranscript !== lastProcessedUserText.current) {
      lastProcessedUserText.current = userTranscript;
      if (checkEmotiveTrigger(userTranscript)) {
        triggerEffect = true;
      }
    }

    if (sifraTranscript && sifraTranscript !== lastProcessedSifraText.current) {
      lastProcessedSifraText.current = sifraTranscript;
      if (checkEmotiveTrigger(sifraTranscript)) {
        triggerEffect = true;
      }
    }

    if (triggerEffect) {
      if (heartTimerRef.current) {
        clearTimeout(heartTimerRef.current);
      }
      heartActiveRef.current = true;

      // Retain the heart morph layout for 7 seconds, then morph back
      heartTimerRef.current = setTimeout(() => {
        heartActiveRef.current = false;
      }, 7000);
    }
  }, [userTranscript, sifraTranscript]);

  useEffect(() => {
    return () => {
      if (heartTimerRef.current) {
        clearTimeout(heartTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = container.clientWidth || 400;
    let height = container.clientHeight || 400;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Dynamic sizing based on canvas viewport
    const baseSphereRadius = Math.min(width, height) * 0.28;
    const focalLength = baseSphereRadius * 1.4;

    // Generate pristine high-density particles
    const numParticles = 3800;
    const particles: SifraParticle[] = [];
    for (let i = 0; i < numParticles; i++) {
      particles.push(new SifraParticle(baseSphereRadius));
    }

    // List of 2D drifting romantic hearts
    const floatingHeartsList: FloatingHeart2D[] = [];

    // Interactive mouse rotation tracking
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 1.5;
      targetY = y * 1.5;
    };
    container.addEventListener("mousemove", onMouseMove);

    // Click canvas to trigger heart-rate as a responsive Easter-egg
    const onCanvasClick = () => {
      if (heartTimerRef.current) {
        clearTimeout(heartTimerRef.current);
      }
      heartActiveRef.current = true;
      heartTimerRef.current = setTimeout(() => {
        heartActiveRef.current = false;
      }, 7000);
    };
    canvas.addEventListener("click", onCanvasClick);

    // Responsive Canvas Resize logic
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      const { width: newWidth, height: newHeight } = entry.contentRect;
      if (newWidth && newHeight) {
        requestAnimationFrame(() => {
          if (!canvas) return;
          width = newWidth;
          height = newHeight;
          canvas.width = newWidth * window.devicePixelRatio;
          canvas.height = newHeight * window.devicePixelRatio;
          const currentCtx = canvas.getContext("2d");
          if (currentCtx) {
            currentCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
          }
        });
      }
    });
    resizeObserver.observe(container);

    // Audio Analysis buffer setup
    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 128);

    let animationFrameId = 0;
    let time = 0;
    let morphFactor = 0;

    // Sort particles with depth buffer for beautiful layered occlusion
    const zDepthBuffer: { p: SifraParticle; rotX: number; rotY: number; zProjected: number }[] = [];

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, width, height);

      // Extract real time audio volume
      let audioLevel = 0;
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        const limit = Math.min(dataArray.length, 64);
        for (let i = 0; i < limit; i++) {
          sum += dataArray[i];
        }
        audioLevel = sum / limit;
      }
      const normLevel = Math.min(audioLevel / 160, 1.0);

      // Metrobic speed tracking based on Status
      let speedFactor = 0.0075;
      if (heartActiveRef.current) speedFactor = 0.015; // accelerated pulse speed
      else if (status === "connecting") speedFactor = 0.045;
      else if (status === "speaking") speedFactor = 0.012;
      else if (status === "listening") speedFactor = 0.0095;

      const increment = speedFactor * (1.0 + normLevel * 0.85);
      time += increment;

      // Mouse Lerp positioning for cinematic parallax
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;

      // Combined 3D angles
      const rotationX = time * 0.45 + currentY * 0.4;
      const rotationY = time * 0.85 + currentX * 0.4;

      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);
      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);

      const centerX = width / 2;
      const centerY = height / 2;

      const activeRGB = RGB_COLOR_MAP[glowColor] || RGB_COLOR_MAP.rose;

      // Heart shape interpolation speed (morphing equation)
      const targetMorph = heartActiveRef.current ? 1.0 : 0.0;
      morphFactor += (targetMorph - morphFactor) * 0.075;

      // Clear & rebuild depth buffer
      zDepthBuffer.length = 0;

      for (let i = 0; i < numParticles; i++) {
        const p = particles[i];
        p.update(time, status, normLevel, heartActiveRef.current);

        // Linear interpolation coordinates for 3D sphere -> romantic heart shape morphing
        const px = p.x * (1 - morphFactor) + p.hx * morphFactor;
        const py = p.y * (1 - morphFactor) + p.hy * morphFactor;
        const pz = p.z * (1 - morphFactor) + p.hz * morphFactor;

        // 3D rotations around Y and X axes on interpolated coordinates
        const x1 = px * cosY - pz * sinY;
        const z1 = pz * cosY + px * sinY;

        const y1 = py * cosX - z1 * sinX;
        const z2 = z1 * cosX + py * sinX;

        zDepthBuffer.push({ p, rotX: x1, rotY: y1, zProjected: z2 });
      }

      // Sort back-to-front (depth sort)
      zDepthBuffer.sort((a, b) => b.zProjected - a.zProjected);

      // Render sorted projected particles
      for (let i = 0; i < zDepthBuffer.length; i++) {
        const { p, rotX, rotY, zProjected } = zDepthBuffer[i];

        if (zProjected > -focalLength) {
          const scale = focalLength / (focalLength + zProjected);
          const px = centerX + rotX * scale;
          const py = centerY + rotY * scale;

          // Adjust size and intensity based on volumetric depth
          const size = Math.max(0.4, 1.55 * scale);
          const depthAlpha = Math.min(1.0, Math.max(0.08, scale));
          const finalAlpha = depthAlpha * p.brightnessMult;

          // Smooth pink & hot-rose gradient color shift when morphed
          if (morphFactor > 0.02) {
            if (p.isAccent) {
              const gVal = Math.floor(40 + 70 * (1 - morphFactor));
              const bVal = Math.floor(95 + 45 * (1 - morphFactor));
              ctx.fillStyle = `rgba(255, ${gVal}, ${bVal}, ${finalAlpha})`;
            } else {
              const gVal = Math.floor(165 + 75 * (1 - morphFactor));
              const bVal = Math.floor(190 + 52 * (1 - morphFactor));
              ctx.fillStyle = `rgba(255, ${gVal}, ${bVal}, ${finalAlpha * 0.9})`;
            }
          } else {
            // Standard chosen theme state
            if (p.isAccent) {
              ctx.fillStyle = `rgba(${activeRGB}, ${finalAlpha})`;
            } else {
              // Sand white dust texture particles
              ctx.fillStyle = `rgba(240, 242, 255, ${finalAlpha * 0.9})`;
            }
          }

          // Optimized rendering using quick square sand grains for retro-digital styling
          ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }
      }

      // Periodically spawn beautiful drifting 2D hearts during the hyper-emotive state
      if (heartActiveRef.current && Math.random() < 0.12) {
        floatingHeartsList.push(new FloatingHeart2D(centerX, centerY));
      }

      // Draw and cycle drifting custom 2D heart particles
      for (let i = floatingHeartsList.length - 1; i >= 0; i--) {
        const fh = floatingHeartsList[i];
        fh.update();
        if (fh.alpha <= 0) {
          floatingHeartsList.splice(i, 1);
        } else {
          fh.draw(ctx);
        }
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onCanvasClick);
      resizeObserver.disconnect();
    };
  }, [analyser, status, glowColor]);

  return (
    <div
      ref={containerRef}
      id="3d-orb-container"
      className="relative w-full h-[72vh] max-w-4xl mx-auto flex items-center justify-center overflow-visible"
    >
      {/* Dynamic atmospheric backdrops matching SIFRA glow configuration */}
      <div
        style={{
          boxShadow: `0 0 100px rgba(${RGB_COLOR_MAP[glowColor] || "244, 63, 94"}, 0.1)`,
        }}
        className="absolute w-[360px] h-[360px] rounded-full blur-[80px] bg-white/[0.01] pointer-events-none transition-all duration-1000"
      />
      <canvas ref={canvasRef} id="sifra-3d-visualizer" className="w-full h-full block cursor-pointer z-10" />
    </div>
  );
}
