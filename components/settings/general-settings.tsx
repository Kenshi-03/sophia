"use client"

import React, { useState, useEffect } from "react"
import { useSettingsStore } from "@/stores/use-settings-store"
import { Sliders, CheckCircle, Loader2, Sparkles } from "lucide-react"

export default function GeneralSettings() {
  const settings = useSettingsStore()
  const [mounted, setMounted] = useState(false)
  
  // Local state for forms
  const [name, setName] = useState("")
  const [model, setModel] = useState("")
  const [threshold, setThreshold] = useState(75)
  const [dnd, setDnd] = useState(true)
  
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Prevent hydration warnings
  useEffect(() => {
    setMounted(true)
    if (settings) {
      setName(settings.userName)
      setModel(settings.defaultAiModel)
      setThreshold(settings.cognitiveThreshold)
      setDnd(settings.autoDndFocus)
    }
  }, [settings])

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

    // Simulate save duration
    await new Promise((resolve) => setTimeout(resolve, 800))

    settings.setUserName(name)
    settings.setDefaultAiModel(model)
    settings.setCognitiveThreshold(threshold)
    settings.setAutoDndFocus(dnd)

    setIsSaving(false)
    setShowSuccess(true)

    // Hide success alert after 3 seconds
    setTimeout(() => {
      setShowSuccess(false)
    }, 3000)
  }

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6">
      <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3 flex items-center gap-2">
        <Sliders className="text-[#c0c1ff]" size={16} />
        <span>General Settings</span>
      </h3>

      <form onSubmit={handleSave} className="space-y-5">
        {/* User Name Input */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">
            Nama Pengguna
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 bg-[#111316] border border-white/5 focus:border-[#c0c1ff]/30 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/20 placeholder-[#c7c4d7]/35"
            placeholder="Masukkan nama Anda..."
          />
        </div>

        {/* AI Model selection */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">
            Default AI Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 bg-[#111316] border border-white/5 focus:border-[#c0c1ff]/30 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/20"
          >
            <option value="Gemini 2.0 Flash">Gemini 2.0 Flash (Recommended)</option>
            <option value="Gemini 1.5 Pro">Gemini 1.5 Pro</option>
            <option value="Gemini 1.5 Flash">Gemini 1.5 Flash</option>
          </select>
        </div>

        {/* Cognitive Threshold Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">
              Cognitive Load Warning Threshold
            </label>
            <span className="text-[10px] text-[#c7c4d7]/40">Alert level</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="flex-1 accent-[#8083ff] h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono font-bold w-12 text-center bg-[#111316] py-1 border border-white/5 rounded-lg text-white">
              {threshold}%
            </span>
          </div>
          <p className="text-[10px] text-[#c7c4d7]/50 leading-normal">
            Sistem akan menampilkan visual kemerahan (load warning) apabila total beban kognitif Anda melebih batas di atas.
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
            }`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${
              dnd ? "translate-x-5" : "translate-x-0"
            }`} />
          </button>
        </div>

        {/* Action button & Success feedback */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          {showSuccess && (
            <span className="text-xs text-[#4edea3] flex items-center gap-1 font-semibold">
              <CheckCircle size={14} />
              <span>Pengaturan berhasil disimpan!</span>
            </span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#8083ff] text-white rounded-xl text-xs font-semibold hover:bg-[#8083ff]/90 hover:shadow-lg hover:shadow-[#8083ff]/10 transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            {isSaving && <Loader2 size={12} className="animate-spin" />}
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </form>
    </div>
  )
}
