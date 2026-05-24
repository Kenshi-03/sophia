"use client"

import React, { useState } from "react"
import { Sliders, Key, Palette, ShieldAlert } from "lucide-react"
import GeneralSettings from "./general-settings"
import GoogleSyncSettings from "./google-sync-settings"
import ThemeSettings from "./theme-settings"
import SystemStatus from "./system-status"

interface SettingsContainerProps {
  hasCredentials: boolean
  memoryNodesCount: number
}

export default function SettingsContainer({ hasCredentials, memoryNodesCount }: SettingsContainerProps) {
  const [activeTab, setActiveTab] = useState<"general" | "sync" | "theme" | "status">("general")

  const tabs = [
    { id: "general" as const, name: "General Config", icon: Sliders },
    { id: "sync" as const, name: "Google API Sync", icon: Key },
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
        {activeTab === "theme" && <ThemeSettings />}
        {activeTab === "status" && <SystemStatus memoryNodesCount={memoryNodesCount} />}
      </div>
    </div>
  )
}
