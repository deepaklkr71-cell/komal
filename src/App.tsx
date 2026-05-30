import { useStore } from "./store/useStore";
import LiveSessionProvider, { useLiveSession } from "./components/LiveSessionProvider";
import Visualizer3D from "./components/Visualizer3D";
import Controls from "./components/Controls";
import ChatConsole from "./components/ChatConsole";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Eye, Shield, Cpu, Activity, Info, Heart } from "lucide-react";

// KOMAL Status mapping for rich verbal subtitles & panels
const TOGGLE_BUTTON_THEME_MAP: Record<string, string> = {
  rose: "bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-rose-950/20",
  cyan: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-cyan-950/20",
  amber: "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-amber-950/20",
  emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-emerald-950/20",
  indigo: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-indigo-950/20",
  purple: "bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-purple-950/20",
  fuchsia: "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300 shadow-fuchsia-950/20",
  orange: "bg-orange-500/10 border-orange-500/30 text-orange-300 shadow-orange-950/20",
  lime: "bg-lime-500/10 border-lime-500/30 text-lime-300 shadow-lime-950/20",
  sky: "bg-sky-500/10 border-sky-500/30 text-sky-300 shadow-sky-950/20",
  violet: "bg-violet-500/10 border-violet-500/30 text-violet-300 shadow-violet-950/20",
  yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300 shadow-yellow-950/20",
  slate: "bg-slate-500/10 border-slate-500/30 text-slate-300 shadow-slate-950/20",
};

const STATUS_DESCRIPTIONS = {
  disconnected: {
    label: "OFFLINE",
    sub: "Tap the phone below to ignite KOMAL",
    accent: "bg-gray-500",
  },
  connecting: {
    label: "COGNITIVE SYNAPSE SYNCING...",
    sub: "Initializing neural pathways and teasing engines",
    accent: "bg-yellow-400 font-bold tracking-widest animate-pulse",
  },
  listening: {
    label: "AWAITING USER VOICE INPUT",
    sub: "Go ahead, tell me something sweet or tease me...",
    accent: "bg-emerald-500 animate-ping",
  },
  speaking: {
    label: "KOMAL TRANSMITTING STATE",
    sub: "Listen carefully, sweetie...",
    accent: "bg-rose-500 animate-ping",
  },
  error: {
    label: "NEXUS INTERRUPT",
    sub: "Failing to build live Gemini stream. Reload!",
    accent: "bg-red-500",
  },
};

const GLOW_COLOR_BORDER_MAP: Record<string, string> = {
  rose: "border-rose-500/20 shadow-rose-950/20",
  cyan: "border-cyan-500/20 shadow-cyan-950/20",
  amber: "border-amber-500/20 shadow-amber-950/20",
  emerald: "border-emerald-500/20 shadow-emerald-950/20",
  indigo: "border-indigo-500/20 shadow-indigo-950/20",
  purple: "border-purple-500/20 shadow-purple-950/20",
  fuchsia: "border-fuchsia-500/20 shadow-fuchsia-950/20",
  orange: "border-orange-500/20 shadow-orange-950/20",
  lime: "border-lime-500/20 shadow-lime-950/20",
  sky: "border-sky-500/20 shadow-sky-950/20",
  violet: "border-violet-500/20 shadow-violet-950/20",
  yellow: "border-yellow-500/20 shadow-yellow-950/20",
  slate: "border-slate-500/20 shadow-slate-950/20",
};

const GLOW_BG_COLORS: Record<string, { start: string; end: string; glow: string }> = {
  rose: { start: "rgba(35, 3, 15, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(244, 63, 94, 0.14)" },
  cyan: { start: "rgba(2, 20, 24, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(6, 182, 212, 0.14)" },
  amber: { start: "rgba(24, 12, 2, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(245, 158, 11, 0.12)" },
  emerald: { start: "rgba(2, 22, 10, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(16, 185, 129, 0.12)" },
  indigo: { start: "rgba(8, 6, 32, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(99, 102, 241, 0.14)" },
  purple: { start: "rgba(18, 5, 30, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(168, 85, 247, 0.14)" },
  fuchsia: { start: "rgba(26, 3, 28, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(217, 70, 239, 0.14)" },
  orange: { start: "rgba(35, 15, 2, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(249, 115, 22, 0.12)" },
  lime: { start: "rgba(12, 28, 2, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(132, 204, 22, 0.12)" },
  sky: { start: "rgba(2, 18, 30, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(14, 165, 233, 0.14)" },
  violet: { start: "rgba(15, 5, 32, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(139, 92, 246, 0.14)" },
  yellow: { start: "rgba(28, 24, 2, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(234, 179, 8, 0.12)" },
  slate: { start: "rgba(18, 20, 24, 0.45)", end: "rgba(1, 1, 3, 1)", glow: "rgba(100, 116, 139, 0.12)" },
};

function Dashboard() {
  const { startCall, endCall, analyserNode, videoRef } = useLiveSession();
  const status = useStore((state) => state.status);
  const glowColor = useStore((state) => state.glowColor);
  const isCameraActive = useStore((state) => state.isCameraActive);
  const sifraTranscript = useStore((state) => state.sifraTranscript);
  const userTranscript = useStore((state) => state.userTranscript);
  const memory = useStore((state) => state.memory);
  const isChatOpen = useStore((state) => state.isChatOpen);
  const setChatOpen = useStore((state) => state.setChatOpen);

  const [welcomeAlert, setWelcomeAlert] = useState(true);

  // Auto clean-up alert
  useEffect(() => {
    const timer = setTimeout(() => {
      setWelcomeAlert(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  const currentDesc = STATUS_DESCRIPTIONS[status] || STATUS_DESCRIPTIONS.disconnected;
  const isConnected = status !== "disconnected" && status !== "error";
  const borderClass = GLOW_COLOR_BORDER_MAP[glowColor] || GLOW_COLOR_BORDER_MAP.rose;
  const bgTheme = GLOW_BG_COLORS[glowColor] || GLOW_BG_COLORS.rose;

  return (
    <div 
      id="sifra-applet-root" 
      className="relative w-screen h-screen overflow-hidden text-white flex flex-col justify-between p-10 select-none transition-all duration-1000"
      style={{
        background: "#000000"
      }}
    >
        {/* Dynamic ambient moving soft halo background rings */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full blur-[130px] opacity-25 pointer-events-none transition-all duration-1000 z-0"
          style={{
            background: `radial-gradient(circle, ${bgTheme.glow} 0%, transparent 70%)`
          }}
        />
        
        {/* Secondary subtle offset drift glow for background volume */}
        <div 
          className="absolute top-10 left-10 w-96 h-96 rounded-full blur-[140px] opacity-15 pointer-events-none transition-all duration-1000 z-0"
          style={{
            background: `radial-gradient(circle, ${bgTheme.glow} 0%, transparent 70%)`
          }}
        />

        {/* 1. Top Gap/Spacer (Header) */}
        <div className="h-4 w-full max-w-7xl mx-auto z-30 shrink-0" />

        {/* 2. SIFRA Cognitive Center (Grid Split of Three.js 3D Orb & ChatConsole) */}
        <div className="flex-grow w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 z-20 min-h-0 items-stretch my-2 px-4">
          
          {/* Main Visualizer Left Pane */}
          <main className={`flex flex-col items-center justify-center relative min-h-0 ${isChatOpen ? "lg:col-span-7" : "lg:col-span-12"} transition-all duration-500`}>
            <Visualizer3D analyser={analyserNode} />
            
            {/* Holographic Cinematic Subtitles / Text Captions overlay */}
            <div className="w-full max-w-xl px-4 min-h-[50px] mt-4 flex flex-col justify-center items-center text-center select-text">
              <AnimatePresence mode="wait">
                {sifraTranscript ? (
                  <motion.div
                    key="sifra-cap"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span style={{ letterSpacing: '2.5px' }} className={`text-[8px] font-mono uppercase tracking-[3px] opacity-70 mb-0.5 ${
                      glowColor === "rose" ? "text-rose-400" : "text-cyan-400"
                    }`}>
                      KOMAL
                    </span>
                    <p className="text-xs md:text-sm font-sans font-medium text-white/95 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      {sifraTranscript}
                    </p>
                  </motion.div>
                ) : userTranscript ? (
                  <motion.div
                    key="user-cap"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span style={{ letterSpacing: '2.5px' }} className="text-[8px] font-mono text-gray-500 uppercase tracking-[3px] mb-0.5">
                      YOU
                    </span>
                    <p className="text-xs md:text-xs font-sans text-gray-400 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] italic">
                      "{userTranscript}"
                    </p>
                  </motion.div>
                ) : isConnected ? (
                  <motion.div
                    key="listening-cap"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    exit={{ opacity: 0 }}
                    className="text-[9px] font-mono text-gray-500 uppercase tracking-[3px]"
                  >
                    {status === "listening" ? "Listening to your voice..." : "Speaking..."}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </main>

          {/* Chat Console Right Pane */}
          <AnimatePresence>
            {isChatOpen && (
              <motion.div 
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="lg:col-span-5 h-full min-h-[300px] lg:min-h-0 max-h-[45vh] lg:max-h-[60vh] flex flex-col z-20"
              >
                <ChatConsole />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live HUD activity nodes in the bottom-left corner */}
        <div id="sifra-status-hud" className="absolute bottom-10 left-10 z-50 pointer-events-auto">
          <div 
            style={{ letterSpacing: '2px' }}
            className="text-[10px] font-mono uppercase bg-white/10 px-3.5 py-1.5 rounded-full border border-white/20 text-gray-300 flex items-center gap-2 tracking-widest backdrop-blur-md shadow-lg"
          >
            <span className={`w-2 h-2 rounded-full ${currentDesc.accent}`} />
            {currentDesc.label}
          </div>
        </div>

        {/* 3. Floating structures (Webcam, welcoming tips) */}
        {/* Local floating Glassmorphic Webcam preview block */}
        <div id="corner-float-container" className="absolute bottom-28 right-10 z-40 pointer-events-none">
          <AnimatePresence>
            {isCameraActive && isConnected && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 30 }}
                className="p-1.5 w-44 h-28 bg-black rounded-xl overflow-hidden pointer-events-auto border border-white/10 shadow-2xl relative"
              >
                <div className="relative w-full h-full bg-black/95 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover scale-x-[-1]"
                    muted
                    playsInline
                  />
                  <div style={{ letterSpacing: '1px' }} className="absolute top-2 left-2 flex items-center gap-1 bg-rose-500/80 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest">
                    Vision: ACTIVE
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floater memory visual indicator */}
        {memory.name && isConnected && (
          <div id="sifra-memory-floater" className="absolute top-24 left-10 z-30 hidden lg:block">
            <div className={`glass-panel py-2.5 px-3.5 rounded-2xl border ${borderClass} shadow-xl flex items-center gap-2.5 max-w-xs`}>
              <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-gray-500 uppercase">Recognized User</span>
                <span className="text-xs font-semibold text-white tracking-wide truncate">
                  {memory.name}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Subtle flirty welcoming card on first applet boot */}
        <div id="sifra-welcome-badge" className="absolute top-24 right-10 z-30 pointer-events-none hidden md:block">
          <AnimatePresence>
            {welcomeAlert && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                className="glass-panel py-3 px-4 rounded-2xl border border-white/5 shadow-2xl max-w-xs flex gap-3"
              >
                <Cpu className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-bold tracking-wide text-white uppercase font-sans">
                    KOMAL is Online
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-normal font-sans">
                    Hello! Tap the pink glowing phone to start flirting with KOMAL. Support vision by toggling camera.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. Glass Control Dock (Footer) */}
        <footer className="w-full max-w-7xl mx-auto flex flex-col gap-4 z-30 shrink-0 relative">
          <Controls onStartCall={startCall} onEndCall={endCall} />

          {/* Floating Chat Panel Toggle button inside the container */}
          <div id="sifra-chat-toggle" className="absolute bottom-3 right-0 z-50 pointer-events-auto hidden md:block">
            <button
              onClick={() => setChatOpen(!isChatOpen)}
              style={{ letterSpacing: '2.5px' }}
              className={`text-[9px] font-mono uppercase px-4 py-2 rounded-full border flex items-center gap-2 tracking-widest backdrop-blur-md shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer ${
                isChatOpen 
                  ? TOGGLE_BUTTON_THEME_MAP[glowColor] || TOGGLE_BUTTON_THEME_MAP.rose
                  : "bg-white/10 border-white/10 text-gray-400 hover:bg-white/15"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isChatOpen ? "bg-emerald-500 animate-pulse" : "bg-gray-500"}`} />
              {isChatOpen ? "CLOSE FEED" : "OPEN FEED"}
            </button>
          </div>
        </footer>
    </div>
  );
}

export default function App() {
  return (
    <LiveSessionProvider>
      <Dashboard />
    </LiveSessionProvider>
  );
}
