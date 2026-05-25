"use client"

import React, { useState, useEffect } from "react"
import { useSettingsStore } from "@/stores/use-settings-store"
import { Palette, Check, Sparkles, Loader2 } from "lucide-react"

export default function ThemeSettings() {
  const settings = useSettingsStore()
  const [mounted, setMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && settings?.themeAccent) {
      const root = document.documentElement
      root.classList.remove("theme-lavender", "theme-mint", "theme-blue")
      root.classList.add(`theme-${settings.themeAccent}`)
    }
  }, [settings?.themeAccent, mounted])

  const handleSelectAccent = async (accentId: "lavender" | "mint" | "blue") => {
    if (isSaving) return
    setIsSaving(true)

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          themeAccent: accentId,
        }),
      })

      if (!response.ok) {
        throw new Error("Gagal menyimpan aksen tema.")
      }

      const updated = await response.json()
      settings.setThemeAccent(updated.themeAccent)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  if (!mounted) {
    return (
      <div className="glass-panel rounded-3xl p-6 flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-[#c0c1ff]" size={24} />
      </div>
    )
  }

  const accents = [
    {
      id: "lavender" as const,
      name: "Sophia Lavender",
      description: "Warna branding klasik SOPHIA. Anggun, fokus, dan tenang.",
      hex: "#c0c1ff",
      glowClass: "shadow-[0_0_20px_rgba(192,193,255,0.3)]",
      dotBg: "bg-[#c0c1ff]",
      borderClass: "border-[#c0c1ff]/30",
    },
    {
      id: "mint" as const,
      name: "Cyber Mint",
      description: "Warna hijau mint yang berenergi. Dinamis dan terarah.",
      hex: "#4edea3",
      glowClass: "shadow-[0_0_20px_rgba(78,222,163,0.3)]",
      dotBg: "bg-[#4edea3]",
      borderClass: "border-[#4edea3]/30",
    },
    {
      id: "blue" as const,
      name: "Steel Blue",
      description: "Warna biru baja bertema intel. Terstruktur, analitis, dan presisi.",
      hex: "#adc6ff",
      glowClass: "shadow-[0_0_20px_rgba(173,198,255,0.3)]",
      dotBg: "bg-[#adc6ff]",
      borderClass: "border-[#adc6ff]/30",
    },
  ]

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6">
      <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3 flex items-center gap-2">
        <Palette className="text-[#c0c1ff]" size={16} />
        <span>Kustomisasi Aksen Workspace</span>
      </h3>

      <div className="space-y-4">
        <p className="text-xs text-[#c7c4d7]/70 leading-relaxed">
          Pilih warna aksen kognitif utama untuk antarmuka Anda. Seluruh elemen indikator, tombol, dan border yang aktif akan menyesuaikan warna ini secara instan di atas tema dasar slate gelap.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {accents.map((accent) => {
            const isSelected = settings.themeAccent === accent.id
            
            return (
              <button
                key={accent.id}
                onClick={() => handleSelectAccent(accent.id)}
                disabled={isSaving}
                className={`p-4 border text-left rounded-2xl flex flex-col justify-between h-40 transition-all duration-300 relative group cursor-pointer ${
                  isSelected
                    ? `bg-[#1e2023]/80 ${accent.borderClass} ring-1 ring-white/10`
                    : "bg-white/[0.01] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                }`}
              >
                {/* Glow ring on hover */}
                {isSelected && (
                  <span className={`absolute inset-0 rounded-2xl border ${accent.borderClass} animate-pulse pointer-events-none`} />
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    {/* Visual Color Dot Indicator with glow */}
                    <div className={`h-4.5 w-4.5 rounded-full ${accent.dotBg} ${accent.glowClass}`} />
                    
                    {isSelected && (
                      <span className="h-5 w-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#4edea3]">
                        <Check size={10} />
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-white group-hover:text-[#c0c1ff] transition-colors mt-2">
                    {accent.name}
                  </h4>
                  <p className="text-[10px] text-[#c7c4d7]/50 leading-relaxed line-clamp-3">
                    {accent.description}
                  </p>
                </div>

                <span className="text-[8px] font-mono text-[#c7c4d7]/30 self-end uppercase">
                  {accent.hex}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
