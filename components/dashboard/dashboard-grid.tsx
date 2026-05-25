"use client"

import React, { useState, useEffect } from "react"
import { Eye, EyeOff, Sparkles, CheckCircle2 } from "lucide-react"
import CurrentFocusCard from "./current-focus-card"
import ActiveAgentsWidget from "./active-agents-widget"
import IntegratedScheduleWidget from "./integrated-schedule-widget"
import RecentThoughtsWidget from "./recent-thoughts-widget"
import CognitiveBriefingCard from "./cognitive-briefing-card"
import WelcomeHeader from "./welcome-header"

interface DashboardGridProps {
  name: string
  cognitiveLoad: number
  activeFocusTask: any
  progressPercent: number
  mockAgents: any[]
  events: any[]
  memories: any[]
}

export default function DashboardGrid({
  name,
  cognitiveLoad,
  activeFocusTask,
  progressPercent,
  mockAgents,
  events,
  memories,
}: DashboardGridProps) {
  const [focusMode, setFocusMode] = useState(false)
  const [metrics, setMetrics] = useState<any>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  // Dynamic Metrics Loader & Automated Trigger Suggestion
  const handleMetricsLoad = (loadedMetrics: any) => {
    setMetrics(loadedMetrics)
    
    // Automatically trigger visual focus alerts if score exceeds threshold
    const threshold = loadedMetrics?.cognitiveThreshold || 75
    if (loadedMetrics?.score >= threshold) {
      setToastMessage(`Beban kognitif harian terdeteksi tinggi (${loadedMetrics.score}%). Disarankan mengaktifkan Focus Mode untuk menjaga kejernihan mental.`);
      setShowToast(true)
      
      // Auto-hide toast after 8 seconds
      const timer = setTimeout(() => {
        setShowToast(false)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }

  // Handle toast clicks to activate Focus Mode directly
  const handleToastAction = () => {
    setFocusMode(true)
    setShowToast(false)
  }

  return (
    <div className={`space-y-8 relative transition-all duration-700 p-1 ${
      focusMode 
        ? "bg-black/30 md:p-8 p-4 rounded-[2.5rem] border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.4)]" 
        : ""
    }`}>
      {/* Immersive cinematic background glow for Focus Mode */}
      {focusMode && (
        <div className="absolute inset-0 bg-gradient-to-tr from-[#1000a9]/10 via-transparent to-[#8083ff]/5 rounded-[2.5rem] pointer-events-none animate-pulse duration-[8000ms] -z-10" />
      )}

      {/* Floating Cognitive Notification Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm glass-panel border border-[#c0c1ff]/20 bg-gradient-to-r from-[#1e2023]/98 to-[#1e2023]/90 text-white p-4.5 rounded-2xl shadow-2xl flex flex-col gap-3 animate-slide-in">
          <div className="flex gap-2.5 items-start">
            <span className="h-5 w-5 rounded-lg bg-[#c0c1ff]/15 border border-[#c0c1ff]/35 flex items-center justify-center text-[#c0c1ff] shrink-0 mt-0.5 animate-pulse">
              <Sparkles size={11} />
            </span>
            <div className="space-y-1">
              <h5 className="text-xs font-bold font-display">Rekomendasi Porsi Kerja</h5>
              <p className="text-[11px] text-[#c7c4d7]/90 leading-relaxed">{toastMessage}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-1">
            <button
              onClick={() => setShowToast(false)}
              className="text-[10px] font-bold text-[#c7c4d7]/60 hover:text-white px-3 py-1.5 transition-colors cursor-pointer"
            >
              Abaikan
            </button>
            <button
              onClick={handleToastAction}
              className="bg-[#8083ff] text-white px-4.5 py-1.5 rounded-xl text-[10px] font-bold hover:bg-[#8083ff]/95 hover:shadow-lg hover:shadow-[#8083ff]/20 active:scale-95 transition-all cursor-pointer"
            >
              Aktifkan
            </button>
          </div>
        </div>
      )}

      {/* Top Header Row with Toggle Control */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex-1">
          <WelcomeHeader name={name} cognitiveLoad={metrics?.score || cognitiveLoad} />
        </div>
        
        {/* Focus Mode Control Button */}
        <button
          onClick={() => setFocusMode(!focusMode)}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 active:scale-95 cursor-pointer ${
            focusMode
              ? "bg-[#8083ff] text-white border-[#8083ff] shadow-lg shadow-[#8083ff]/20"
              : "bg-white/5 text-[#c7c4d7]/80 border-white/5 hover:text-white hover:border-white/10"
          }`}
        >
          {focusMode ? <EyeOff size={14} /> : <Eye size={14} />}
          <span>{focusMode ? "Keluar Focus Mode" : "Focus Mode"}</span>
        </button>
      </div>

      {/* Minimized / Translucent Briefing Widget in Focus Mode */}
      <div className={`transition-all duration-500 ${
        focusMode 
          ? "opacity-30 hover:opacity-100 max-h-36 overflow-hidden select-none hover:select-all" 
          : "opacity-100"
      }`}>
        <CognitiveBriefingCard onMetricsLoad={handleMetricsLoad} />
      </div>

      {/* Dynamic Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Module A: Current Focus Timer Card (Spans col-12 in focus mode, col-8 otherwise) */}
        <div className={`transition-all duration-500 col-span-12 ${
          focusMode ? "lg:col-span-12 scale-[1.01]" : "lg:col-span-8"
        }`}>
          <CurrentFocusCard task={activeFocusTask} progressPercent={progressPercent} />
        </div>

        {/* Module B: Active Agents Widget (Hidden entirely in focus mode) */}
        {!focusMode && (
          <div className="col-span-12 lg:col-span-4 transition-all duration-500 animate-fade-in">
            <ActiveAgentsWidget agents={mockAgents} />
          </div>
        )}

        {/* Module C: Integrated Schedule Widget (Spans col-12 in focus mode, col-5 otherwise) */}
        <div className={`transition-all duration-500 col-span-12 ${
          focusMode ? "lg:col-span-12" : "lg:col-span-5"
        }`}>
          <IntegratedScheduleWidget events={events} />
        </div>

        {/* Module D: Recent Thoughts Widget (Hidden entirely in focus mode) */}
        {!focusMode && (
          <div className="col-span-12 lg:col-span-7 transition-all duration-500 animate-fade-in">
            <RecentThoughtsWidget memories={memories} />
          </div>
        )}

      </div>
    </div>
  )
}
