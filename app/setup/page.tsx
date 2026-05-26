"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Brain, Calendar, Shield, Settings, Sliders, ArrowRight } from "lucide-react"
import { saveSetupAction } from "@/app/actions/setup"

interface CategoryState {
  name: string
  categoryType: string
  googleCalId: string
  color: string
}

export default function OnboardingSetupPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Settings states
  const [aiModel, setAiModel] = useState("maia/gemini-2.5-flash")
  const [aiApiKey, setAiApiKey] = useState("")
  const [productivityIntensity, setProductivityIntensity] = useState("balanced")
  const [cognitiveThreshold, setCognitiveThreshold] = useState(75)
  const [memoryDepth, setMemoryDepth] = useState(10)

  // Categories states
  const [categories, setCategories] = useState<CategoryState[]>([
    { name: "Deep Work", categoryType: "deep-work", googleCalId: "primary", color: "#2563EB" },
    { name: "Jadwal Kelas", categoryType: "academic", googleCalId: "primary", color: "#3B82F6" },
    { name: "Workout & Kesehatan", categoryType: "health", googleCalId: "primary", color: "#10B981" },
    { name: "Istirahat", categoryType: "recovery", googleCalId: "primary", color: "#64748B" },
  ])

  const handleCategoryCalIdChange = (index: number, val: string) => {
    const updated = [...categories]
    updated[index].googleCalId = val
    setCategories(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await saveSetupAction({
        aiModel,
        aiApiKey,
        productivityIntensity,
        cognitiveThreshold,
        memoryDepth,
        categories,
      })

      if (res.success) {
        router.push("/dashboard")
        router.refresh()
      } else {
        setError(res.error || "Gagal menyimpan data setup.")
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan koneksi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#e2e2e6] font-sans flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl bg-[#111316]/80 border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#8083ff]">
              <Brain size={24} />
              <span className="font-extrabold text-lg tracking-wider">SOPHIA v0.0</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">First-Time Cognitive Setup</h1>
            <p className="text-xs text-[#c7c4d7]/60">Inisialisasi preferensi personal AI, integrasi Google Calendar, dan ambang batas beban kognitif.</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8083ff]/10 border border-[#8083ff]/20 rounded-xl text-[10px] font-bold text-[#8083ff] uppercase tracking-wider self-start md:self-auto">
            <Shield size={12} />
            <span>Onboarding Integrity</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-400 rounded-2xl text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: AI Gateway & Preferences */}
            <div className="space-y-6 glass-panel rounded-2xl p-5 border border-white/5">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Settings size={16} className="text-[#8083ff]" />
                <h2 className="font-bold text-sm text-white">AI Gateway Settings</h2>
              </div>

              {/* AI Model */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#c7c4d7]/70 uppercase tracking-wider">AI Model Provider</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full bg-[#181a1f] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8083ff]/50"
                >
                  <option value="maia/gemini-2.5-flash">Gemini 2.5 Flash (Maia Gateway)</option>
                  <option value="maia/gemini-2.5-pro">Gemini 2.5 Pro (Maia Gateway)</option>
                  <option value="maia/gpt-4o">GPT-4o (Maia Gateway)</option>
                </select>
              </div>

              {/* API Token */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#c7c4d7]/70 uppercase tracking-wider">AI Gateway API Token</label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Masukkan token API MAIA (Opsional jika didefinisikan di Server)"
                  className="w-full bg-[#181a1f] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#c7c4d7]/30 focus:outline-none focus:border-[#8083ff]/50"
                />
              </div>

              {/* Productivity Intensity */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#c7c4d7]/70 uppercase tracking-wider">Productivity Intensity</label>
                <div className="grid grid-cols-3 gap-2">
                  {["balanced", "focus", "creative"].map((intensity) => (
                    <button
                      key={intensity}
                      type="button"
                      onClick={() => setProductivityIntensity(intensity)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all capitalize cursor-pointer ${
                        productivityIntensity === intensity
                          ? "bg-[#8083ff]/10 border-[#8083ff]/40 text-white font-bold"
                          : "bg-white/[0.01] border-white/5 text-[#c7c4d7]/60 hover:bg-white/5"
                      }`}
                    >
                      {intensity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[11px] font-bold text-[#c7c4d7]/70 uppercase tracking-wider">Cognitive Threshold</span>
                    <span className="font-mono text-[#8083ff] font-bold">{cognitiveThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={cognitiveThreshold}
                    onChange={(e) => setCognitiveThreshold(Number(e.target.value))}
                    className="w-full h-1 bg-[#181a1f] rounded-lg appearance-none cursor-pointer accent-[#8083ff]"
                  />
                  <p className="text-[10px] text-[#c7c4d7]/40">Sensitivitas AI dalam mendeteksi dan memberi peringatan kelelahan mental (burnout).</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[11px] font-bold text-[#c7c4d7]/70 uppercase tracking-wider">Memory Depth</span>
                    <span className="font-mono text-[#8083ff] font-bold">{memoryDepth} nodes</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={memoryDepth}
                    onChange={(e) => setMemoryDepth(Number(e.target.value))}
                    className="w-full h-1 bg-[#181a1f] rounded-lg appearance-none cursor-pointer accent-[#8083ff]"
                  />
                  <p className="text-[10px] text-[#c7c4d7]/40">Batas jumlah catatan memori yang disertakan ke dalam konteks asisten AI saat berinteraksi.</p>
                </div>
              </div>
            </div>

            {/* Column 2: Cognitive Calendar Mapping */}
            <div className="space-y-6 glass-panel rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Calendar size={16} className="text-[#8083ff]" />
                  <h2 className="font-bold text-sm text-white">Google Calendar Integration</h2>
                </div>
                <p className="text-xs text-[#c7c4d7]/50 leading-relaxed">
                  Petakan ID Google Calendar Anda ke masing-masing kategori kognitif. Gunakan nilai default <code className="bg-white/5 px-1 py-0.5 rounded text-white">primary</code> untuk menggunakan kalender Google utama Anda.
                </p>

                <div className="space-y-3.5 pt-2">
                  {categories.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-[#181a1f]/60 p-2.5 rounded-xl border border-white/[0.02]">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{cat.name}</p>
                        <p className="text-[10px] text-[#c7c4d7]/40 capitalize">{cat.categoryType}</p>
                      </div>
                      <div className="w-1/2">
                        <input
                          type="text"
                          value={cat.googleCalId}
                          onChange={(e) => handleCategoryCalIdChange(idx, e.target.value)}
                          placeholder="primary"
                          required
                          className="w-full bg-[#0b0c0e] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#8083ff]/50 placeholder-white/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#8083ff] text-white font-bold rounded-xl text-xs hover:bg-[#8083ff]/90 hover:shadow-lg hover:shadow-[#8083ff]/10 active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Menyimpan Konfigurasi...</span>
                  ) : (
                    <>
                      <span>Initialize SOPHIA Workspace</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </form>

      </div>
    </div>
  )
}
