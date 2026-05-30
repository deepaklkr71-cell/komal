import { create } from "zustand";

interface UserMemory {
  name?: string;
  likes?: string;
  dislikes?: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "komal";
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

export type SifraStatus = "disconnected" | "connecting" | "listening" | "speaking" | "error";

interface SifraState {
  status: SifraStatus;
  isMicActive: boolean;
  isCameraActive: boolean;
  glowColor: string; // colors like 'rose', 'cyan', 'amber', 'emerald', 'indigo', 'purple', 'fuchsia'
  userTranscript: string;
  sifraTranscript: string;
  memory: UserMemory;
  messages: ChatMessage[];
  isChatOpen: boolean;
  
  // Actions
  setStatus: (status: SifraStatus) => void;
  setMicActive: (active: boolean) => void;
  setCameraActive: (active: boolean) => void;
  setGlowColor: (color: string) => void;
  setUserTranscript: (text: string) => void;
  setSifraTranscript: (text: string) => void;
  setChatOpen: (open: boolean) => void;
  saveMemory: (updated: Partial<UserMemory>) => void;
  addMessage: (sender: "user" | "komal", text: string, isStreaming?: boolean) => void;
  updateLiveMessage: (sender: "user" | "komal", text: string, isStreaming?: boolean) => void;
  clearMessages: () => void;
  resetState: () => void;
}

// Load initial memory from localStorage if it exists
const loadMemory = (): UserMemory => {
  try {
    const data = localStorage.getItem("sifra_user_memory");
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load user memory:", e);
  }
  return { name: "Deepak", likes: "AI engineering, coding, building amazing web apps", dislikes: "Slow response times" };
};

export const useStore = create<SifraState>((set) => ({
  status: "disconnected",
  isMicActive: true,
  isCameraActive: false,
  glowColor: "rose", // SIFRA's signature cute flirty color
  userTranscript: "",
  sifraTranscript: "",
  memory: loadMemory(),
  messages: [],
  isChatOpen: typeof window !== "undefined" ? window.innerWidth > 1024 : true,

  setStatus: (status) => set({ status }),
  setMicActive: (isMicActive) => set({ isMicActive }),
  setCameraActive: (isCameraActive) => set({ isCameraActive }),
  setGlowColor: (glowColor) => set({ glowColor }),
  setUserTranscript: (userTranscript) => set({ userTranscript }),
  setSifraTranscript: (sifraTranscript) => set({ sifraTranscript }),
  setChatOpen: (isChatOpen) => set({ isChatOpen }),
  
  saveMemory: (updated) => set((state) => {
    const newMemory = { ...state.memory, ...updated };
    try {
      localStorage.setItem("sifra_user_memory", JSON.stringify(newMemory));
    } catch (e) {
      console.error("Failed to save memory to localStorage:", e);
    }
    return { memory: newMemory };
  }),

  addMessage: (sender, text, isStreaming = false) => set((state) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newMessage: ChatMessage = {
      id,
      sender,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming,
    };
    return { messages: [...state.messages, newMessage] };
  }),

  updateLiveMessage: (sender, text, isStreaming = true) => set((state) => {
    const lastMsg = state.messages[state.messages.length - 1];
    if (lastMsg && lastMsg.sender === sender && lastMsg.isStreaming) {
      const updatedMessages = [...state.messages];
      updatedMessages[updatedMessages.length - 1] = {
        ...lastMsg,
        text,
        isStreaming,
      };
      return { messages: updatedMessages };
    } else {
      const id = Math.random().toString(36).substring(2, 9);
      const newMessage: ChatMessage = {
        id,
        sender,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming,
      };
      return { messages: [...state.messages, newMessage] };
    }
  }),

  clearMessages: () => set({ messages: [] }),

  resetState: () => set({
    status: "disconnected",
    userTranscript: "",
    sifraTranscript: "",
    messages: [],
  }),
}));
