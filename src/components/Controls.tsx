import { useState } from "react";
import { useStore } from "../store/useStore";
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Phone, Settings, Sparkles, Heart, Trash2 } from "lucide-react";

interface ControlsProps {
  onStartCall: () => void;
  onEndCall: () => void;
}

export default function Controls({ onStartCall, onEndCall }: ControlsProps) {
  const status = useStore((state) => state.status);
  const isMicActive = useStore((state) => state.isMicActive);
  const isCameraActive = useStore((state) => state.isCameraActive);
  const glowColor = useStore((state) => state.glowColor);
  const memory = useStore((state) => state.memory);
  const saveMemory = useStore((state) => state.saveMemory);

  const setMicActive = useStore((state) => state.setMicActive);
  const setCameraActive = useStore((state) => state.setCameraActive);

  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [userName, setUserName] = useState(memory.name || "");
  const [userLikes, setUserLikes] = useState(memory.likes || "");
  const [userDislikes, setUserDislikes] = useState(memory.dislikes || "");

  const handleSaveMemory = () => {
    saveMemory({ name: userName, likes: userLikes, dislikes: userDislikes });
    setIsMemoryOpen(false);
  };

  const handleClearMemory = () => {
    saveMemory({ name: "", likes: "", dislikes: "" });
    setUserName("");
    setUserLikes("");
    setUserDislikes("");
    setIsMemoryOpen(false);
  };

  const isConnected = status === "listening" || status === "speaking" || status === "connecting";

  // Map glowColor to hover effects
  const glowHoverMap: Record<string, string> = {
    rose: "hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400",
    cyan: "hover:bg-cyan-500/10 hover:border-cyan-500/30 text-cyan-400",
    amber: "hover:bg-amber-500/10 hover:border-amber-500/30 text-amber-400",
    emerald: "hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-400",
    indigo: "hover:bg-indigo-500/10 hover:border-indigo-500/30 text-indigo-400",
    purple: "hover:bg-purple-500/10 hover:border-purple-500/30 text-purple-400",
    fuchsia: "hover:bg-fuchsia-500/10 hover:border-fuchsia-500/30 text-fuchsia-400",
    orange: "hover:bg-orange-500/10 hover:border-orange-500/30 text-orange-400",
    lime: "hover:bg-lime-500/10 hover:border-lime-500/30 text-lime-400",
    sky: "hover:bg-sky-500/10 hover:border-sky-500/30 text-sky-400",
    violet: "hover:bg-violet-500/10 hover:border-violet-500/30 text-violet-400",
    yellow: "hover:bg-yellow-500/10 hover:border-yellow-500/30 text-yellow-400",
    slate: "hover:bg-slate-500/10 hover:border-slate-500/30 text-slate-400",
  };

  const activeColorText = glowHoverMap[glowColor] || glowHoverMap.rose;

  return (
    <div className="relative w-full max-w-sm mx-auto flex flex-col items-center gap-4 z-40">
      {/* Central Glass Dock - Centered and smaller */}
      <div id="glass-control-dock" className="glass-dock py-2.5 px-5 rounded-full flex items-center justify-between gap-4 shadow-xl w-full border border-white/5">
        {/* Memory Toggle */}
        <button
          id="toggle-memory"
          onClick={() => setIsMemoryOpen(!isMemoryOpen)}
          className={`p-2.5 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 transition-all transform hover:scale-105 active:scale-95 ${
            memory.name ? activeColorText : "text-gray-400"
          }`}
          title="KOMAL's Memory Base"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        {/* Mic Toggle */}
        <button
          id="toggle-mic"
          onClick={() => setMicActive(!isMicActive)}
          className={`p-3 rounded-full border transition-all transform hover:scale-105 active:scale-95 ${
            isMicActive
              ? "bg-white/10 border-white/10 text-white"
              : "bg-red-500/15 border-red-500/20 text-red-400 hover:bg-red-500/25"
          }`}
          title={isMicActive ? "Mute Microphone" : "Unmute Microphone"}
        >
          {isMicActive ? <Mic className="w-5.5 h-5.5" /> : <MicOff className="w-5.5 h-5.5" />}
        </button>

        {/* Call Connect/Disconnect Button */}
        {isConnected ? (
          <button
            id="end-call"
            onClick={onEndCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-900/40 hover:shadow-red-950/60 transition-all transform hover:scale-105 active:scale-95 border border-red-500/40"
            title="End Call with KOMAL"
          >
            <PhoneOff className="w-6 h-6 animate-pulse" />
          </button>
        ) : (
          <button
            id="start-call"
            onClick={onStartCall}
            className={`p-4 rounded-full text-black shadow-xl shadow-black/50 hover:scale-105 active:scale-95 transition-all border border-white/10`}
            style={{
              backgroundColor: COLOR_MAP_RGB[glowColor] || "#f43f5e",
            }}
            title="Ignite KOMAL Session"
          >
            <Phone className="w-6 h-6" />
          </button>
        )}

        {/* Camera Toggle */}
        <button
          id="toggle-camera"
          onClick={() => setCameraActive(!isCameraActive)}
          className={`p-3 rounded-full border transition-all transform hover:scale-105 active:scale-95 ${
            isCameraActive
              ? "bg-white/10 border-white/10 text-white"
              : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
          }`}
          title={isCameraActive ? "Deactivate KOMAL Vision" : "Feed Vision to KOMAL (1 fps)"}
        >
          {isCameraActive ? <Camera className="w-5.5 h-5.5" /> : <CameraOff className="w-5.5 h-5.5" />}
        </button>

        {/* Color Palette customization panel */}
        <div className="relative group">
          <button
            id="theme-customizer"
            className="p-2.5 rounded-full border border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all transform hover:scale-105 active:scale-95"
            title="Color Tone Palette"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Pop-up selector list */}
          <div className="absolute bottom-14 right-0 glass-panel p-2.5 rounded-2xl hidden group-hover:flex flex-col gap-2.5 shadow-2xl border border-white/10 w-44">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest text-center px-2">Palette</span>
            <div className="grid grid-cols-5 gap-2.5">
              {Object.keys(COLOR_MAP_RGB).map((c) => (
                <button
                  key={c}
                  onClick={() => useStore.getState().setGlowColor(c)}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    glowColor === c ? "scale-125 border-white border-2" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: COLOR_MAP_RGB[c] }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Persistent KOMAL Local Memory Modal Overlay */}
      {isMemoryOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-400 fill-rose-400/20" />
                <h3 className="font-semibold text-white tracking-wide">KOMAL's Memory Database</h3>
              </div>
              <button
                onClick={() => setIsMemoryOpen(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              KOMAL uses local storage memory to remember your trait profile. These variables are injected directly so KOMAL knows who you are!
            </p>

            <div className="flex flex-col gap-3 mt-1">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-gray-500">Your Name / Handle</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Handsome, Johnny, Alice"
                  className="w-full bg-white/5 border border-white/5 focus:border-white/15 focus:outline-none rounded-xl py-2 px-3 text-sm text-white font-sans"
                />
              </div>

              {/* Likes */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-gray-500">Your Likes / Interests</label>
                <input
                  type="text"
                  value={userLikes}
                  onChange={(e) => setUserLikes(e.target.value)}
                  placeholder="e.g. coffee, fast cars, gaming, coding"
                  className="w-full bg-white/5 border border-white/5 focus:border-white/15 focus:outline-none rounded-xl py-2 px-3 text-sm text-white font-sans"
                />
              </div>

              {/* Dislikes */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-gray-500">Your Dislikes / Pet Peeves</label>
                <input
                  type="text"
                  value={userDislikes}
                  onChange={(e) => setUserDislikes(e.target.value)}
                  placeholder="e.g. slow talkers, cold weather"
                  className="w-full bg-white/5 border border-white/5 focus:border-white/15 focus:outline-none rounded-xl py-2 px-3 text-sm text-white font-sans"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={handleClearMemory}
                className="w-12 bg-red-950/30 border border-red-900/40 hover:bg-red-900/30 hover:border-red-800/50 text-red-400 flex items-center justify-center rounded-xl py-2.5 transition-all"
                title="Wipe Memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleSaveMemory}
                className="flex-1 text-black font-semibold rounded-xl py-2.5 hover:scale-[1.02] active:scale-95 transition-all text-sm"
                style={{ backgroundColor: COLOR_MAP_RGB[glowColor] || "#f43f5e" }}
              >
                Remember Me
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const COLOR_MAP_RGB: Record<string, string> = {
  rose: "#f43f5e",
  cyan: "#06b6d4",
  amber: "#f59e0b",
  emerald: "#10b881",
  indigo: "#6366f1",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  orange: "#f97316",
  lime: "#84cc16",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  yellow: "#eab308",
  slate: "#64748b",
};
