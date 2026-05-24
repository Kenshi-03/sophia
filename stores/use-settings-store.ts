import { create } from "zustand"
import { persist } from "zustand/middleware"

interface SettingsState {
  userName: string
  defaultAiModel: string
  cognitiveThreshold: number
  themeAccent: "lavender" | "mint" | "blue"
  autoSyncCalendar: boolean
  autoDndFocus: boolean
  setUserName: (name: string) => void
  setDefaultAiModel: (model: string) => void
  setCognitiveThreshold: (threshold: number) => void
  setThemeAccent: (accent: "lavender" | "mint" | "blue") => void
  setAutoSyncCalendar: (val: boolean) => void
  setAutoDndFocus: (val: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      userName: "Sophia Dev",
      defaultAiModel: "Gemini 2.0 Flash",
      cognitiveThreshold: 75,
      themeAccent: "lavender",
      autoSyncCalendar: true,
      autoDndFocus: true,
      setUserName: (userName) => set({ userName }),
      setDefaultAiModel: (defaultAiModel) => set({ defaultAiModel }),
      setCognitiveThreshold: (cognitiveThreshold) => set({ cognitiveThreshold }),
      setThemeAccent: (themeAccent) => set({ themeAccent }),
      setAutoSyncCalendar: (autoSyncCalendar) => set({ autoSyncCalendar }),
      setAutoDndFocus: (autoDndFocus) => set({ autoDndFocus }),
    }),
    {
      name: "sophia-settings-v1", // key in localStorage
    }
  )
)

export default useSettingsStore
