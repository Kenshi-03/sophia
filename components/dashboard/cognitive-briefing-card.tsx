"use client"

import React, { useState, useEffect } from "react"
import { Activity, Sparkles, Brain, RefreshCw, AlertCircle, ShieldAlert, Heart, ChevronDown, ChevronUp } from "lucide-react"

interface CognitiveMetrics {
  score: number
  state: "low" | "medium" | "high"
  focusMinutes: number
  recoveryMinutes: number
  burnoutRisk: "low" | "medium" | "high"
  burnoutWarnings: string[]
  focusFragmentation: number
  contextSwitchingCount: number
}

interface AIBriefing {
  analysis: string
  recommendations: string[]
}

export interface RecommendationItem {
  id: string
  priority: "subtle" | "moderate" | "high"
  text: string
}

export interface RecommendationResult {
  schedulingSuggestions: RecommendationItem[]
  recoverySuggestions: RecommendationItem[]
  focusOptimizations: RecommendationItem[]
}

const getPriorityStyle = (priority: "subtle" | "moderate" | "high") => {
  switch (priority) {
    case "high":
      return {
        bg: "bg-red-500/[0.04] border-red-500/20 hover:border-red-500/30",
        text: "text-[#ffb4ab]",
        badgeBg: "bg-red-500/15 border-red-500/25 text-[#ffb4ab]",
      }
    case "moderate":
      return {
        bg: "bg-[#adc6ff]/5 border-[#adc6ff]/20 hover:border-[#adc6ff]/30",
        text: "text-[#adc6ff]",
        badgeBg: "bg-[#adc6ff]/15 border-[#adc6ff]/25 text-[#adc6ff]",
      }
    case "subtle":
    default:
      return {
        bg: "bg-[#4edea3]/5 border-[#4edea3]/20 hover:border-[#4edea3]/30",
        text: "text-[#4edea3]",
        badgeBg: "bg-[#4edea3]/15 border-[#4edea3]/25 text-[#4edea3]",
      }
  }
}

export default function CognitiveBriefingCard({ onMetricsLoad }: { onMetricsLoad?: (metrics: any) => void }) {
  const [metrics, setMetrics] = useState<CognitiveMetrics | null>(null)
  const [briefing, setBriefing] = useState<AIBriefing | null>(null)
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const fetchBriefingData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/ai/cognitive/briefing")
      if (!res.ok) {
        throw new Error("Gagal mengambil data briefing kognitif.")
      }
      const data = await res.json()
      if (data.success) {
        setMetrics(data.metrics)
        setBriefing(data.aiBriefing)
        setRecommendations(data.recommendations)
        if (onMetricsLoad) {
          onMetricsLoad(data.metrics)
        }
      } else {
        throw new Error(data.error || "Gagal memproses data.")
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal memuat sistem intelijen kognitif.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBriefingData()
  }, [])

  if (isLoading) {
    return (
      <div className="col-span-12 glass-panel rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.01] to-transparent animate-pulse space-y-6">
        <div className="flex items-center gap-3">
          <Brain className="text-[#c0c1ff] animate-spin" size={18} />
          <div className="h-4 w-48 bg-white/10 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-white/5 rounded-2xl flex items-center justify-center">
            <RefreshCw className="animate-spin text-white/20" size={20} />
          </div>
          <div className="md:col-span-2 space-y-3">
            <div className="h-3 w-full bg-white/10 rounded-full" />
            <div className="h-3 w-5/6 bg-white/10 rounded-full" />
            <div className="h-3 w-4/6 bg-white/10 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !metrics || !briefing) {
    return (
      <div className="col-span-12 glass-panel rounded-3xl p-6 border border-red-500/10 bg-red-500/[0.02] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-[#ffb4ab]" size={20} />
          <div>
            <h4 className="text-xs font-bold text-white font-display">Intelijen Kognitif Offline</h4>
            <p className="text-[10px] text-[#ffb4ab]/80 mt-0.5">{error || "Gagal memproses briefing kognitif harian."}</p>
          </div>
        </div>
        <button
          onClick={fetchBriefingData}
          className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-semibold transition-all active:scale-95 cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>
    )
  }

  // Visual HSL dynamic configurations based on load score
  const getScoreColor = (score: number) => {
    if (score <= 35) return { text: "text-[#4edea3]", border: "border-[#4edea3]/20", bg: "bg-[#4edea3]/10", stroke: "#4edea3" }
    if (score <= 70) return { text: "text-[#adc6ff]", border: "border-[#adc6ff]/20", bg: "bg-[#adc6ff]/10", stroke: "#adc6ff" }
    return { text: "text-[#ffb4ab]", border: "border-[#ffb4ab]/20", bg: "bg-[#ffb4ab]/10", stroke: "#ffb4ab" }
  }

  const scoreTheme = getScoreColor(metrics.score)
  
  // Calculate SVG circle properties
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (metrics.score / 100) * circumference

  return (
    <div className="col-span-12 glass-panel rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.01] to-transparent relative overflow-hidden group hover:border-[#c0c1ff]/10 transition-all duration-300">
      
      {/* Corner Radial Accent Glow */}
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[#c0c1ff]/5 blur-2xl group-hover:bg-[#c0c1ff]/10 transition-all duration-500 pointer-events-none" />

      {/* Main Container Layout */}
      <div className="flex flex-col gap-6">
        
        {/* Header Widget Row */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Brain className="text-[#c0c1ff] animate-pulse" size={18} />
            <h3 className="font-bold text-xs uppercase tracking-wider text-white font-display">Cognitive Operating Briefing</h3>
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/5 hover:border-[#c0c1ff]/20 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl text-[10px] font-bold text-[#c7c4d7] hover:text-white transition-all cursor-pointer"
          >
            <span>{showDetails ? "Sembunyikan Detail" : "Detail Analisis"}</span>
            {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* Content Section: Gauge (Left) + AI Insights (Right) */}
        <div className="grid grid-cols-12 gap-6 items-center">
          
          {/* Left Column: Radial Load Gauge (Col span: 12 on mobile, 4 on desktop) */}
          <div className="col-span-12 md:col-span-4 flex flex-row md:flex-col items-center justify-center gap-6 border-b md:border-b-0 md:border-r border-white/5 pb-6 md:pb-0 md:pr-6">
            
            {/* SVG Radial Gauge */}
            <div className="relative h-24 w-24 shrink-0 flex items-center justify-center">
              <svg className="h-full w-full transform -rotate-90">
                {/* Track Circle */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="stroke-white/5"
                  strokeWidth="6"
                  fill="transparent"
                />
                {/* Progress Circle */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="transition-all duration-1000 ease-out"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  stroke={scoreTheme.stroke}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              {/* Inside score text */}
              <div className="absolute text-center">
                <span className="text-xl font-extrabold text-white font-mono">{metrics.score}%</span>
                <span className="text-[8px] uppercase tracking-wider block font-bold text-[#c7c4d7]/40 font-mono">Load</span>
              </div>
            </div>

            {/* Load Metadata */}
            <div className="space-y-1.5 text-left md:text-center">
              <div className="flex flex-wrap gap-2 justify-start md:justify-center">
                <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${scoreTheme.text} ${scoreTheme.border} ${scoreTheme.bg}`}>
                  Beban {metrics.state}
                </span>
                
                {metrics.burnoutRisk !== "low" && (
                  <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${
                    metrics.burnoutRisk === "high"
                      ? "bg-red-500/10 border-red-500/20 text-[#ffb4ab]"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  }`}>
                    <Activity size={10} />
                    <span>Risiko Burnout: {metrics.burnoutRisk}</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#c7c4d7]/50 max-w-[180px] leading-relaxed">
                Total agenda aktif yang mempengaruhi kapasitas kognitif Anda hari ini.
              </p>
            </div>
          </div>

          {/* Right Column: AI Analysis & Actionable recommendations (Col span: 12 on mobile, 8 on desktop) */}
          <div className="col-span-12 md:col-span-8 space-y-4">
            
            {/* AI Empathic Paragraph */}
            <div className="p-4 border border-[#c0c1ff]/10 bg-[#c0c1ff]/5 rounded-2xl ai-glow">
              <p className="text-xs text-[#e2e2e6] leading-relaxed font-medium">
                {briefing.analysis}
              </p>
            </div>

          </div>
        </div>

        {/* Collapsible Details Sub-panel */}
        {showDetails && (
          <div className="border-t border-white/5 pt-5 space-y-6 animate-in slide-in-from-top-4 duration-200">
            
            {/* Detailed Metrics Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Card 1: Focus vs Recovery Balance */}
              <div className="p-4 border border-white/5 bg-white/[0.01] rounded-2xl space-y-3.5">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/50 flex items-center gap-1">
                  <Activity size={12} className="text-[#c0c1ff]" />
                  <span>Keseimbangan Fokus & Recovery</span>
                </h4>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-[#c7c4d7]/70 font-mono mb-1">
                      <span>Waktu Fokus (Kerja)</span>
                      <span>{metrics.focusMinutes}m</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#8083ff] rounded-full" style={{ width: `${Math.min(100, (metrics.focusMinutes / 360) * 100)}%` }} />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-[10px] text-[#c7c4d7]/70 font-mono mb-1">
                      <span>Waktu Pemulihan</span>
                      <span>{metrics.recoveryMinutes}m</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#4edea3] rounded-full" style={{ width: `${Math.min(100, (metrics.recoveryMinutes / 120) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Focus Fragmentation */}
              <div className="p-4 border border-white/5 bg-white/[0.01] rounded-2xl space-y-3.5 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/50 flex items-center gap-1">
                    <ShieldAlert size={12} className="text-[#adc6ff]" />
                    <span>Fragmentasi Fokus</span>
                  </h4>
                  <p className="text-[9px] text-[#c7c4d7]/40 leading-relaxed mt-1">
                    Persentase sela kerja/selisih waktu singkat di antara rapat atau tugas.
                  </p>
                </div>
                
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[#c7c4d7]/70">Tingkat Fragmentasi</span>
                    <span className="text-[#adc6ff] font-bold">{metrics.focusFragmentation}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#adc6ff] rounded-full" style={{ width: `${metrics.focusFragmentation}%` }} />
                  </div>
                </div>
              </div>

              {/* Card 3: Context Switching */}
              <div className="p-4 border border-white/5 bg-white/[0.01] rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/50 flex items-center gap-1">
                    <RefreshCw size={12} className="text-amber-400" />
                    <span>Perpindahan Konteks</span>
                  </h4>
                  <p className="text-[9px] text-[#c7c4d7]/40 leading-relaxed mt-1">
                    Frekuensi Anda beralih dari satu kategori aktivitas ke kategori lain sepanjang hari.
                  </p>
                </div>
                
                <div className="pt-2 flex items-baseline justify-between">
                  <span className="text-[10px] text-[#c7c4d7]/70">Context Switches:</span>
                  <span className="text-lg font-mono font-extrabold text-white">{metrics.contextSwitchingCount} <span className="text-[9px] text-[#c7c4d7]/40 font-sans">kali</span></span>
                </div>
              </div>

            </div>

            {/* Burnout Warning Logs Panel */}
            {metrics.burnoutWarnings.length > 0 && (
              <div className="border border-red-500/10 bg-red-500/[0.02] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-[10px] font-bold text-[#ffb4ab] uppercase tracking-wider">
                  <AlertCircle size={14} />
                  <span>Indikator Beban Kerja Kritis</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#c7c4d7]/85 font-sans leading-relaxed">
                  {metrics.burnoutWarnings.map((w, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Adaptive Smart Recommendations Section */}
            {recommendations && (
              <div className="border-t border-white/5 pt-5 space-y-3.5">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/50 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[#c0c1ff]" />
                  <span>Rekomendasi Tindakan Adaptif</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Scheduling Suggestions */}
                  <div className="p-4 border border-white/5 bg-white/[0.01] rounded-2xl space-y-3">
                    <h5 className="text-[10px] uppercase font-bold tracking-wider text-[#adc6ff] flex items-center gap-1.5 font-display">
                      <Activity size={12} className="text-[#adc6ff]" />
                      <span>Penjadwalan Pintar</span>
                    </h5>
                    <div className="space-y-2">
                      {recommendations.schedulingSuggestions.map((item) => {
                        const style = getPriorityStyle(item.priority)
                        return (
                          <div key={item.id} className={`p-3 rounded-xl border ${style.bg} space-y-1.5 transition-all hover:bg-white/[0.02]`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-[8px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded ${style.badgeBg} font-mono`}>
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-xs text-[#c7c4d7]/90 leading-relaxed font-sans">{item.text}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Recovery Suggestions */}
                  <div className="p-4 border border-white/5 bg-white/[0.01] rounded-2xl space-y-3">
                    <h5 className="text-[10px] uppercase font-bold tracking-wider text-[#4edea3] flex items-center gap-1.5 font-display">
                      <Heart size={12} className="text-[#4edea3]" />
                      <span>Pemulihan & Energi</span>
                    </h5>
                    <div className="space-y-2">
                      {recommendations.recoverySuggestions.map((item) => {
                        const style = getPriorityStyle(item.priority)
                        return (
                          <div key={item.id} className={`p-3 rounded-xl border ${style.bg} space-y-1.5 transition-all hover:bg-white/[0.02]`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-[8px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded ${style.badgeBg} font-mono`}>
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-xs text-[#c7c4d7]/90 leading-relaxed font-sans">{item.text}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Focus Optimizations */}
                  <div className="p-4 border border-white/5 bg-white/[0.01] rounded-2xl space-y-3">
                    <h5 className="text-[10px] uppercase font-bold tracking-wider text-[#c0c1ff] flex items-center gap-1.5 font-display">
                      <Brain size={12} className="text-[#c0c1ff]" />
                      <span>Optimasi Fokus</span>
                    </h5>
                    <div className="space-y-2">
                      {recommendations.focusOptimizations.map((item) => {
                        const style = getPriorityStyle(item.priority)
                        return (
                          <div key={item.id} className={`p-3 rounded-xl border ${style.bg} space-y-1.5 transition-all hover:bg-white/[0.02]`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-[8px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded ${style.badgeBg} font-mono`}>
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-xs text-[#c7c4d7]/90 leading-relaxed font-sans">{item.text}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
