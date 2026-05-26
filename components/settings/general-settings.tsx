"use client"

import React, { useState, useEffect } from "react"
import { useSettingsStore } from "@/stores/use-settings-store"
import { AVAILABLE_MODELS } from "@/lib/ai/config/models"
import { Sliders, CheckCircle, XCircle, Loader2, Sparkles, RefreshCw, Cpu, Moon, Eye, Zap, ShieldAlert, Key } from "lucide-react"

export default function GeneralSettings() {
  const settings = useSettingsStore()
  const [mounted, setMounted] = useState(false)
  
  // Local state for forms
  const [name, setName] = useState("")
  const [model, setModel] = useState("")
  const [aiMode, setAiMode] = useState<"focus" | "creative" | "balanced">("balanced")
  const [threshold, setThreshold] = useState(75)
  const [dnd, setDnd] = useState(true)
  const [aiApiKey, setAiApiKey] = useState("")
  
  // New persistent settings fields
  const [theme, setTheme] = useState("dark")
  const [memoryDepth, setMemoryDepth] = useState(10)
  const [productivityIntensity, setProductivityIntensity] = useState("balanced")
  const [localAIEnabled, setLocalAIEnabled] = useState(false)

  // API states
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Gateway health states
  const [healthStatus, setHealthStatus] = useState<"loading" | "healthy" | "unhealthy" | "missing_key">("loading")
  const [healthLatency, setHealthLatency] = useState<number | null>(null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)

  const checkGatewayHealth = async () => {
    setIsCheckingHealth(true)
    try {
      const response = await fetch("/api/ai/health")
      const data = await response.json()
      if (data.healthy) {
        setHealthStatus("healthy")
        setHealthLatency(data.latency)
      } else if (data.status === "Missing API Key") {
        setHealthStatus("missing_key")
        setHealthLatency(null)
      } else {
        setHealthStatus("unhealthy")
        setHealthLatency(null)
      }
    } catch (err) {
      setHealthStatus("unhealthy")
      setHealthLatency(null)
    } finally {
      setIsCheckingHealth(false)
    }
  }

  // Prevent hydration warnings and bind store values to local state
  useEffect(() => {
    setMounted(true)
    if (settings) {
      setName(settings.userName)
      setModel(settings.aiModel)
      setAiMode(settings.aiMode || "balanced")
      setThreshold(settings.cognitiveThreshold)
      setDnd(settings.autoDndFocus)
      setTheme(settings.theme || "dark")
      setMemoryDepth(settings.memoryDepth || 10)
      setProductivityIntensity(settings.productivityIntensity || "balanced")
      setLocalAIEnabled(settings.localAIEnabled || false)
      setAiApiKey(settings.aiApiKey || "")
    }
  }, [settings])

  // Run health check on mount
  useEffect(() => {
    if (mounted) {
      checkGatewayHealth()
    }
  }, [mounted])

  if (!mounted) {
    return (
      <div className="glass-panel rounded-3xl p-6 flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-[#c0c1ff]" size={24} />
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setShowSuccess(false)
    setSaveError(null)

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: name,
          theme,
          aiModel: model,
          aiMode,
          memoryDepth,
          productivityIntensity,
          localAIEnabled,
          cognitiveThreshold: threshold,
          autoDndFocus: dnd,
          aiApiKey,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Gagal menyimpan ke cloud database.")
      }

      const updatedSettings = await response.json()

      // Update Zustand local store
      settings.setUserName(updatedSettings.userName)
      settings.setAiModel(updatedSettings.aiModel)
      settings.setAiMode(updatedSettings.aiMode)
      settings.setMemoryDepth(updatedSettings.memoryDepth)
      settings.setProductivityIntensity(updatedSettings.productivityIntensity)
      settings.setLocalAIEnabled(updatedSettings.localAIEnabled)
      settings.setTheme(updatedSettings.theme)
      settings.setCognitiveThreshold(updatedSettings.cognitiveThreshold)
      settings.setAutoDndFocus(updatedSettings.autoDndFocus)
      settings.setAiApiKey(updatedSettings.aiApiKey)

      setShowSuccess(true)
      
      // Recheck health status
      checkGatewayHealth()
    } catch (err: any) {
      console.error("Failed to save settings:", err)
      setSaveError(err.message || "Koneksi terputus. Gagal menyimpan ke cloud.")
    } finally {
      setIsSaving(false)
      // Hide success alert after 3 seconds
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    }
  }

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6 border border-white/5 bg-gradient-to-b from-white/[0.01] to-transparent">
      <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3 flex items-center gap-2">
        <Sliders className="text-[#c0c1ff]" size={16} />
        <span>General Settings</span>
      </h3>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Row 1: Nama & Theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 flex items-center gap-1.5">
              <span>Nama Pengguna</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-[#111316] border border-white/5 focus:border-[#c0c1ff]/30 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/20 placeholder-[#c7c4d7]/35 transition-all"
              placeholder="Masukkan nama Anda..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 flex items-center gap-1.5">
              <Moon size={11} className="text-[#adc6ff]" />
              <span>Theme Workspace</span>
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#111316] border border-white/5 focus:border-[#c0c1ff]/30 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/20 transition-all cursor-pointer"
            >
              <option value="dark">Dark Space (Recommended)</option>
              <option value="light">Light Minimal</option>
              <option value="system">System Synchronized</option>
            </select>
          </div>
        </div>

        {/* Row 2: AI Model & AI Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 flex items-center gap-1.5">
              <Cpu size={11} className="text-[#c0c1ff]" />
              <span>Default AI Model</span>
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#111316] border border-white/5 focus:border-[#c0c1ff]/30 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/20 transition-all cursor-pointer"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 flex items-center gap-1.5">
              <Sparkles size={11} className="text-[#4edea3]" />
              <span>AI Productivity Mode</span>
            </label>
            <select
              value={aiMode}
              onChange={(e) => setAiMode(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-[#111316] border border-white/5 focus:border-[#c0c1ff]/30 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/20 transition-all cursor-pointer"
            >
              <option value="balanced">General / Balanced (temp: 0.7)</option>
              <option value="focus">Focus (temp: 0.2)</option>
              <option value="creative">Idea / Creative (temp: 0.9)</option>
            </select>
          </div>
        </div>

        {/* Row for AI Gateway Key */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 flex items-center gap-1.5">
            <Key size={11} className="text-[#adc6ff]" />
            <span>AI Gateway API Key</span>
          </label>
          <input
            type="password"
            value={aiApiKey}
            onChange={(e) => setAiApiKey(e.target.value)}
            autoComplete="new-password"
            placeholder="Masukkan token API MAIA Anda..."
            className="w-full px-3 py-2.5 bg-[#111316] border border-white/5 focus:border-[#c0c1ff]/30 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/20 placeholder-[#c7c4d7]/35 transition-all animate-fade-in"
          />
        </div>

        {/* Row 3: Memory Depth & Productivity Intensity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 flex items-center gap-1.5">
                <Eye size={11} className="text-[#adc6ff]" />
                <span>Memory Recall Depth</span>
              </label>
              <span className="text-[10px] text-[#c7c4d7]/40 font-mono">{memoryDepth} nodes</span>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <input
                type="range"
                min="1"
                max="50"
                value={memoryDepth}
                onChange={(e) => setMemoryDepth(Number(e.target.value))}
                className="flex-1 accent-[#8083ff] h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <p className="text-[9px] text-[#c7c4d7]/50 leading-normal">
              Jumlah fakta memori relevan yang akan disuntikkan ke dalam AI context window.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 flex items-center gap-1.5">
              <Zap size={11} className="text-amber-400" />
              <span>Productivity Intensity</span>
            </label>
            <select
              value={productivityIntensity}
              onChange={(e) => setProductivityIntensity(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#111316] border border-white/5 focus:border-[#c0c1ff]/30 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/20 transition-all cursor-pointer"
            >
              <option value="relaxed">Relaxed / Flow Mode</option>
              <option value="balanced">Balanced / Standard</option>
              <option value="high">High Intensity / Deep Sprints</option>
            </select>
          </div>
        </div>

        {/* Local AI Integration Toggle */}
        <div className="flex items-center justify-between p-3 border border-white/5 bg-white/[0.01] rounded-2xl">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-white">Hybrid Local-AI Engine</p>
            <p className="text-[10px] text-[#c7c4d7]/50">Gunakan model lokal (Ollama/LlamaEdge) sebagai cadangan saat gateway offline.</p>
          </div>
          <button
            type="button"
            onClick={() => setLocalAIEnabled(!localAIEnabled)}
            className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${
              localAIEnabled ? "bg-[#8083ff]" : "bg-white/10"
            } cursor-pointer`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${
              localAIEnabled ? "translate-x-5" : "translate-x-0"
            }`} />
          </button>
        </div>

        {/* MAIA Gateway Config & Health Monitoring (Visual Panel) */}
        <div className="p-4 border border-white/5 bg-white/[0.01] rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Cpu size={12} className="text-[#c0c1ff]" />
                <span>MAIA Central AI Gateway</span>
              </h4>
              <p className="text-[10px] text-[#c7c4d7]/50 font-mono">https://api.maiarouter.ai/v1</p>
            </div>
            
            <button
              type="button"
              onClick={checkGatewayHealth}
              disabled={isCheckingHealth}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:border-[#c0c1ff]/30 rounded-xl text-[9px] font-bold text-[#c7c4d7] hover:text-white transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {isCheckingHealth ? (
                <Loader2 className="animate-spin" size={10} />
              ) : (
                <RefreshCw size={10} />
              )}
              <span>Check Gateway</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-4 items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#c7c4d7]/50">Status:</span>
              {healthStatus === "loading" && (
                <span className="text-[10px] text-amber-400/80 flex items-center gap-1">
                  <Loader2 className="animate-spin" size={10} /> Verifying...
                </span>
              )}
              {healthStatus === "healthy" && (
                <span className="text-[10px] text-[#4edea3] font-bold bg-[#4edea3]/10 px-2 py-0.5 rounded border border-[#4edea3]/20">
                  Healthy
                </span>
              )}
              {healthStatus === "unhealthy" && (
                <span className="text-[10px] text-[#ffb4ab] font-bold bg-[#ffb4ab]/10 px-2 py-0.5 rounded border border-[#ffb4ab]/20">
                  Unhealthy
                </span>
              )}
              {healthStatus === "missing_key" && (
                <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Missing API Key
                </span>
              )}
            </div>

            {healthStatus === "healthy" && healthLatency !== null && (
              <div className="text-[10px] font-mono text-[#c7c4d7]/70">
                Latency: <span className="text-[#4edea3] font-bold">{healthLatency}ms</span>
              </div>
            )}
            
            <div className="text-[10px] font-mono text-[#c7c4d7]/60">
              Active: <span className="text-[#c0c1ff] font-bold">
                {AVAILABLE_MODELS.find(m => m.id === model)?.label || model}
              </span>
            </div>
          </div>
        </div>

        {/* Cognitive Threshold Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 flex items-center gap-1.5">
              <ShieldAlert size={12} className="text-[#ffb4ab]" />
              <span>Cognitive Warning Threshold</span>
            </label>
            <span className="text-[10px] text-[#c7c4d7]/40 font-mono">{threshold}%</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="10"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="flex-1 accent-[#8083ff] h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <p className="text-[9px] text-[#c7c4d7]/50 leading-normal">
            Sistem akan menampilkan visual kemerahan (load warning) apabila total beban kognitif Anda melebih batas ini.
          </p>
        </div>

        {/* Focus Mode DND toggle */}
        <div className="flex items-center justify-between p-3 border border-white/5 bg-white/[0.01] rounded-2xl">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-white">Auto-DND saat Focus Mode</p>
            <p className="text-[10px] text-[#c7c4d7]/50">Senyapkan notifikasi sistem secara otomatis ketika sesi dimulai.</p>
          </div>
          <button
            type="button"
            onClick={() => setDnd(!dnd)}
            className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${
              dnd ? "bg-[#8083ff]" : "bg-white/10"
            } cursor-pointer`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${
              dnd ? "translate-x-5" : "translate-x-0"
            }`} />
          </button>
        </div>

        {/* Action button & Success / Error feedback */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-white/5">
          {saveError && (
            <span className="text-xs text-[#ffb4ab] flex items-center gap-1 font-semibold animate-fade-in">
              <XCircle size={14} />
              <span>{saveError}</span>
            </span>
          )}

          {showSuccess && (
            <span className="text-xs text-[#4edea3] flex items-center gap-1 font-semibold animate-fade-in">
              <CheckCircle size={14} />
              <span>Pengaturan berhasil disimpan di cloud!</span>
            </span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 py-2.5 bg-[#8083ff] text-white rounded-xl text-xs font-bold hover:bg-[#8083ff]/90 hover:shadow-lg hover:shadow-[#8083ff]/10 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving && <Loader2 size={12} className="animate-spin" />}
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </form>
    </div>
  )
}
