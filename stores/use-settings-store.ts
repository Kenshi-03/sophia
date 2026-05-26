import { create } from "zustand"
import { AI_MODELS } from "@/lib/ai/config/models"

interface SettingsState {
  userName: string
  defaultAiModel: string // Alias ke aiModel untuk kompatibilitas kode
  aiModel: string
  aiMode: "focus" | "creative" | "balanced"
  memoryDepth: number
  productivityIntensity: string
  localAIEnabled: boolean
  cognitiveThreshold: number
  themeAccent: "lavender" | "mint" | "blue"
  autoSyncCalendar: boolean
  autoDndFocus: boolean
  theme: string
  isOnboarded: boolean
  aiApiKey: string | null
  
  setUserName: (name: string) => void
  setDefaultAiModel: (model: string) => void
  setAiModel: (model: string) => void
  setAiMode: (mode: "focus" | "creative" | "balanced") => void
  setMemoryDepth: (depth: number) => void
  setProductivityIntensity: (intensity: string) => void
  setLocalAIEnabled: (enabled: boolean) => void
  setCognitiveThreshold: (threshold: number) => void
  setThemeAccent: (accent: "lavender" | "mint" | "blue") => void
  setAutoSyncCalendar: (val: boolean) => void
  setAutoDndFocus: (val: boolean) => void
  setTheme: (theme: string) => void
  setIsOnboarded: (onboarded: boolean) => void
  setAiApiKey: (key: string | null) => void
  hydrateStore: (settings: Partial<SettingsState>) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  userName: "SOPHIA Dev User",
  defaultAiModel: AI_MODELS.FAST,
  aiModel: AI_MODELS.FAST,
  aiMode: "balanced",
  memoryDepth: 10,
  productivityIntensity: "balanced",
  localAIEnabled: false,
  cognitiveThreshold: 75,
  themeAccent: "lavender",
  autoSyncCalendar: true,
  autoDndFocus: true,
  theme: "dark",
  isOnboarded: false,
  aiApiKey: null,

  setUserName: (userName) => set({ userName }),
  setDefaultAiModel: (defaultAiModel) => set({ defaultAiModel, aiModel: defaultAiModel }),
  setAiModel: (aiModel) => set({ aiModel, defaultAiModel: aiModel }),
  setAiMode: (aiMode) => set({ aiMode }),
  setMemoryDepth: (memoryDepth) => set({ memoryDepth }),
  setProductivityIntensity: (productivityIntensity) => set({ productivityIntensity }),
  setLocalAIEnabled: (localAIEnabled) => set({ localAIEnabled }),
  setCognitiveThreshold: (cognitiveThreshold) => set({ cognitiveThreshold }),
  setThemeAccent: (themeAccent) => set({ themeAccent }),
  setAutoSyncCalendar: (autoSyncCalendar) => set({ autoSyncCalendar }),
  setAutoDndFocus: (autoDndFocus) => set({ autoDndFocus }),
  setTheme: (theme) => set({ theme }),
  setIsOnboarded: (isOnboarded) => set({ isOnboarded }),
  setAiApiKey: (aiApiKey) => set({ aiApiKey }),
  hydrateStore: (settings) => set((state) => ({ ...state, ...settings })),
}))

export default useSettingsStore
