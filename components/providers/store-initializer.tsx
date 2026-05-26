"use client"

import { useRef, useEffect } from "react"
import { useSettingsStore } from "@/stores/use-settings-store"
import { useTheme } from "next-themes"

interface StoreInitializerProps {
  userName: string
  theme: string
  aiModel: string
  aiMode: "focus" | "creative" | "balanced"
  memoryDepth: number
  productivityIntensity: string
  localAIEnabled: boolean
  cognitiveThreshold: number
  themeAccent: "lavender" | "mint" | "blue"
  autoSyncCalendar: boolean
  autoDndFocus: boolean
  isOnboarded: boolean
  aiApiKey: string | null
}

export default function StoreInitializer({
  userName,
  theme,
  aiModel,
  aiMode,
  memoryDepth,
  productivityIntensity,
  localAIEnabled,
  cognitiveThreshold,
  themeAccent,
  autoSyncCalendar,
  autoDndFocus,
  isOnboarded,
  aiApiKey,
}: StoreInitializerProps) {
  const initialized = useRef(false)
  const { setTheme } = useTheme()

  if (!initialized.current) {
    useSettingsStore.setState({
      userName,
      theme,
      aiModel,
      defaultAiModel: aiModel,
      aiMode,
      memoryDepth,
      productivityIntensity,
      localAIEnabled,
      cognitiveThreshold,
      themeAccent,
      autoSyncCalendar,
      autoDndFocus,
      isOnboarded,
      aiApiKey,
    })
    
    initialized.current = true
  }

  // Effect to synchronize settings theme with next-themes
  useEffect(() => {
    if (theme) {
      setTheme(theme)
    }
  }, [theme, setTheme])

  // Effect to synchronize theme accent classes on document root
  useEffect(() => {
    if (themeAccent) {
      const root = document.documentElement
      root.classList.remove("theme-lavender", "theme-mint", "theme-blue")
      root.classList.add(`theme-${themeAccent}`)
    }
  }, [themeAccent])

  return null
}
