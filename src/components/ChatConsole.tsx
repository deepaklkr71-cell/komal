import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import { useLiveSession } from "./LiveSessionProvider";
import { Send, Trash2 } from "lucide-react";

const GLOW_COLOR_TEXT_MAP: Record<string, string> = {
  rose: "text-rose-400 focus:border-rose-500/50 focus:ring-rose-500/10",
  cyan: "text-cyan-400 focus:border-cyan-500/50 focus:ring-cyan-500/10",
  amber: "text-amber-400 focus:border-amber-500/50 focus:ring-amber-500/10",
  emerald: "text-emerald-400 focus:border-emerald-500/50 focus:ring-emerald-500/10",
  indigo: "text-indigo-400 focus:border-indigo-500/50 focus:ring-indigo-500/10",
  purple: "text-purple-400 focus:border-purple-500/50 focus:ring-purple-500/10",
  fuchsia: "text-fuchsia-400 focus:border-fuchsia-500/50 focus:ring-fuchsia-500/10",
  orange: "text-orange-400 focus:border-orange-500/50 focus:ring-orange-500/10",
  lime: "text-lime-400 focus:border-lime-500/50 focus:ring-lime-500/10",
  sky: "text-sky-400 focus:border-sky-500/50 focus:ring-sky-500/10",
  violet: "text-violet-400 focus:border-violet-500/50 focus:ring-violet-500/10",
  yellow: "text-yellow-400 focus:border-yellow-500/50 focus:ring-yellow-500/10",
  slate: "text-slate-400 focus:border-slate-500/50 focus:ring-slate-500/10",
};

const GLOW_COLOR_BORDER_MAP: Record<string, string> = {
  rose: "border-rose-500/20 shadow-rose-950/10",
  cyan: "border-cyan-500/20 shadow-cyan-950/10",
  amber: "border-amber-500/20 shadow-amber-950/10",
  emerald: "border-emerald-500/20 shadow-emerald-950/10",
  indigo: "border-indigo-500/20 shadow-indigo-950/10",
  purple: "border-purple-500/20 shadow-purple-950/10",
  fuchsia: "border-fuchsia-500/20 shadow-fuchsia-950/10",
  orange: "border-orange-500/20 shadow-orange-950/10",
  lime: "border-lime-500/20 shadow-lime-950/10",
  sky: "border-sky-500/20 shadow-sky-950/10",
  violet: "border-violet-500/20 shadow-violet-950/10",
  yellow: "border-yellow-500/20 shadow-yellow-950/10",
  slate: "border-slate-500/20 shadow-slate-950/10",
};

const GLOW_COLOR_BG_MAP: Record<string, string> = {
  rose: "bg-rose-500/4 border-rose-500/15",
  cyan: "bg-cyan-500/4 border-cyan-500/15",
  amber: "bg-amber-500/4 border-amber-500/15",
  emerald: "bg-emerald-500/4 border-emerald-500/15",
  indigo: "bg-indigo-500/4 border-indigo-500/15",
  purple: "bg-purple-500/4 border-purple-500/15",
  fuchsia: "bg-fuchsia-500/4 border-fuchsia-500/15",
  orange: "bg-orange-500/4 border-orange-500/15",
  lime: "bg-lime-500/4 border-lime-500/15",
  sky: "bg-sky-500/4 border-sky-500/15",
  violet: "bg-violet-500/4 border-violet-500/15",
  yellow: "bg-yellow-500/4 border-yellow-500/15",
  slate: "bg-slate-500/4 border-slate-500/15",
};

const THEME_SEND_BTN: Record<string, string> = {
  rose: "bg-rose-600 hover:bg-rose-500 shadow-rose-950/30 text-white",
  cyan: "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-950/30 text-white",
  amber: "bg-amber-600 hover:bg-amber-500 shadow-amber-950/30 text-white",
  emerald: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/30 text-white",
  indigo: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/30 text-white",
  purple: "bg-purple-600 hover:bg-purple-500 shadow-purple-950/30 text-white",
  fuchsia: "bg-fuchsia-600 hover:bg-fuchsia-500 shadow-fuchsia-950/30 text-white",
  orange: "bg-orange-600 hover:bg-orange-500 shadow-orange-950/30 text-white",
  lime: "bg-lime-600 hover:bg-lime-500 shadow-lime-950/30 text-white",
  sky: "bg-sky-600 hover:bg-sky-500 shadow-sky-950/30 text-white",
  violet: "bg-violet-600 hover:bg-violet-500 shadow-violet-950/30 text-white",
  yellow: "bg-yellow-600 hover:bg-yellow-500 shadow-yellow-950/30 text-white",
  slate: "bg-slate-600 hover:bg-slate-500 shadow-slate-950/30 text-white",
};

export default function ChatConsole() {
  const { sendTextMessage } = useLiveSession();
  const messages = useStore((state) => state.messages);
  const clearMessages = useStore((state) => state.clearMessages);
  const glowColor = useStore((state) => state.glowColor);
  const status = useStore((state) => state.status);

  const [inputVal, setInputVal] = useState("");
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to latest speech messages
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendTextMessage(inputVal);
    setInputVal("");
  };

  const isConnected = status !== "disconnected" && status !== "error";
  const glowBorder = GLOW_COLOR_BORDER_MAP[glowColor] || GLOW_COLOR_BORDER_MAP.rose;
  const glowText = GLOW_COLOR_TEXT_MAP[glowColor] || GLOW_COLOR_TEXT_MAP.rose;
  const glowBg = GLOW_COLOR_BG_MAP[glowColor] || GLOW_COLOR_BG_MAP.rose;
  const sendBtnClass = THEME_SEND_BTN[glowColor] || THEME_SEND_BTN.rose;

  return (
    <div 
      id="chat-console-wrapper" 
      className={`w-full h-full flex flex-col rounded-3xl border ${glowBorder} bg-[#020202]/50 backdrop-blur-3xl shadow-2xl overflow-hidden relative`}
    >
      {/* Floating Wipe/Trash function when messages are active */}
      {messages.length > 0 && (
        <button
          onClick={clearMessages}
          title="Clear Feed Logs"
          className="absolute top-4 right-4 z-25 text-gray-500 hover:text-rose-400 transition-all duration-200 p-2 rounded-full hover:bg-white/5 border border-white/5 backdrop-blur-md cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Messages Feed */}
      <div 
        id="chat-feed-container" 
        className="flex-grow overflow-y-auto px-5 py-6 space-y-4 scrollbar-thin select-text min-h-0"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-6">
            <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest leading-relaxed max-w-xs">
              {isConnected 
                ? "Speak through your mic or type a message below..." 
                : "Awaiting feed ignition..."}
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isKomal = msg.sender === "komal";
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  isKomal ? "self-start items-start" : "self-end items-end ml-auto"
                } animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                {/* Message Body */}
                <div
                  className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed select-text ${
                    isKomal
                      ? `text-white ${glowBg} border backdrop-blur-md`
                      : "bg-white/5 border border-white/5 text-gray-200"
                  }`}
                >
                  {msg.text}
                  {msg.isStreaming && (
                    <span className="inline-flex gap-0.5 ml-1.5 items-end">
                      <span className={`w-1.5 h-1.5 rounded-full inline-block animate-bounce [animation-delay:-0.3s] ${isKomal ? "bg-rose-400" : "bg-gray-400"}`} />
                      <span className={`w-1.5 h-1.5 rounded-full inline-block animate-bounce [animation-delay:-0.15s] ${isKomal ? "bg-rose-400" : "bg-gray-400"}`} />
                      <span className={`w-1.5 h-1.5 rounded-full inline-block animate-bounce ${isKomal ? "bg-rose-400" : "bg-gray-400"}`} />
                    </span>
                  )}
                </div>

                {/* Subtitle stamp */}
                <span className="text-[8px] font-mono text-gray-600 mt-1 uppercase tracking-widest px-1">
                  {isKomal ? "Komal" : "You"} · {msg.timestamp}
                </span>
              </div>
            );
          })
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Typing Footer */}
      <footer className="p-4 border-t border-white/5 bg-black/10 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={!isConnected}
            placeholder={isConnected ? "Type something here..." : "Start call to chat..."}
            className={`flex-grow bg-white/5 border border-white/5 rounded-2xl py-3 px-4.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-all duration-300 ${glowText} disabled:opacity-50`}
          />
          <button
            type="submit"
            disabled={!isConnected || !inputVal.trim()}
            className={`p-3 rounded-2xl shadow-lg transition-all active:scale-95 duration-200 disabled:opacity-20 cursor-pointer ${sendBtnClass}`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}
