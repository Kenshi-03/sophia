"use client"

import React, { useState, useEffect } from "react"
import { Sliders, Key, Palette, ShieldAlert, Calendar } from "lucide-react"
import GeneralSettings from "./general-settings"
import GoogleSyncSettings from "./google-sync-settings"
import ThemeSettings from "./theme-settings"
import SystemStatus from "./system-status"
import CalendarConfigSettings from "./calendar-config-settings"
import { useSettingsStore } from "@/stores/use-settings-store"

interface SettingsContainerProps {
  hasCredentials: boolean
  memoryNodesCount: number
  initialSettings: any
}

export default function SettingsContainer({ hasCredentials, memoryNodesCount, initialSettings }: SettingsContainerProps) {
  const [activeTab, setActiveTab] = useState<"general" | "sync" | "theme" | "status" | "calendarConfig">("general")
  const settingsStore = useSettingsStore()

  useEffect(() => {
    if (initialSettings) {
      settingsStore.hydrateStore({
        userName: initialSettings.userName,
        theme: initialSettings.theme,
        aiModel: initialSettings.aiModel,
        defaultAiModel: initialSettings.aiModel,
        aiMode: initialSettings.aiMode,
        memoryDepth: initialSettings.memoryDepth,
        productivityIntensity: initialSettings.productivityIntensity,
        localAIEnabled: initialSettings.localAIEnabled,
        cognitiveThreshold: initialSettings.cognitiveThreshold,
        themeAccent: initialSettings.themeAccent,
        autoSyncCalendar: initialSettings.autoSyncCalendar,
        autoDndFocus: initialSettings.autoDndFocus,
        isOnboarded: initialSettings.isOnboarded,
        aiApiKey: initialSettings.aiApiKey,
      })
    }
  }, [initialSettings])

  const tabs = [
    { id: "general" as const, name: "General Config", icon: Sliders },
    { id: "sync" as const, name: "Google API Sync", icon: Key },
    { id: "calendarConfig" as const, name: "Calendar Config", icon: Calendar },
    { id: "theme" as const, name: "Theme Accent Color", icon: Palette },
    { id: "status" as const, name: "System Status Health", icon: ShieldAlert },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Navigation panel */}
      <div className="space-y-4">
        <div className="glass-panel rounded-3xl p-4 border border-white/5">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-[#c0c1ff]/10 text-[#c0c1ff] font-bold border-l-2 border-[#c0c1ff]"
                      : "text-[#c7c4d7]/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={14} className={isActive ? "text-[#c0c1ff]" : "text-[#c7c4d7]/70"} />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content Form Panel */}
      <div className="lg:col-span-2">
        {activeTab === "general" && <GeneralSettings />}
        {activeTab === "sync" && <GoogleSyncSettings hasCredentials={hasCredentials} />}
        {activeTab === "calendarConfig" && <CalendarConfigSettings />}
        {activeTab === "theme" && <ThemeSettings />}
        {activeTab === "status" && <SystemStatus memoryNodesCount={memoryNodesCount} />}
      </div>
    </div>
  )
}
