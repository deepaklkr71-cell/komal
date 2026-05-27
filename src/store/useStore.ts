import { create } from "zustand";

interface UserMemory {
  name?: string;
  likes?: string;
  dislikes?: string;
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
  
  // Actions
  setStatus: (status: SifraStatus) => void;
  setMicActive: (active: boolean) => void;
  setCameraActive: (active: boolean) => void;
  setGlowColor: (color: string) => void;
  setUserTranscript: (text: string) => void;
  setSifraTranscript: (text: string) => void;
  saveMemory: (updated: Partial<UserMemory>) => void;
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

  setStatus: (status) => set({ status }),
  setMicActive: (isMicActive) => set({ isMicActive }),
  setCameraActive: (isCameraActive) => set({ isCameraActive }),
  setGlowColor: (glowColor) => set({ glowColor }),
  setUserTranscript: (userTranscript) => set({ userTranscript }),
  setSifraTranscript: (sifraTranscript) => set({ sifraTranscript }),
  
  saveMemory: (updated) => set((state) => {
    const newMemory = { ...state.memory, ...updated };
    try {
      localStorage.setItem("sifra_user_memory", JSON.stringify(newMemory));
    } catch (e) {
      console.error("Failed to save memory to localStorage:", e);
    }
    return { memory: newMemory };
  }),

  resetState: () => set({
    status: "disconnected",
    userTranscript: "",
    sifraTranscript: "",
  }),
}));
