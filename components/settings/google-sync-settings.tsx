"use client"

import React, { useState, useEffect } from "react"
import { useSettingsStore } from "@/stores/use-settings-store"
import { Key, CheckCircle, Loader2, RefreshCw } from "lucide-react"

interface GoogleSyncSettingsProps {
  hasCredentials: boolean
}

export default function GoogleSyncSettings({ hasCredentials }: GoogleSyncSettingsProps) {
  const settings = useSettingsStore()
  const [mounted, setMounted] = useState(false)
  
  // Local state
  const [autoSync, setAutoSync] = useState(true)
  const [interval, setIntervalVal] = useState("30")
  
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (settings) {
      setAutoSync(settings.autoSyncCalendar)
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

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          autoSyncCalendar: autoSync,
        }),
      })

      if (!response.ok) {
        throw new Error("Gagal menyimpan ke cloud database.")
      }

      const updated = await response.json()
      settings.setAutoSyncCalendar(updated.autoSyncCalendar)
      setShowSuccess(true)
    } catch (err) {
      console.error("Gagal menyimpan pengaturan Google Sync:", err)
    } finally {
      setIsSaving(false)
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    }
  }

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6">
      <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3 flex items-center gap-2">
        <Key className="text-[#c0c1ff]" size={16} />
        <span>Google Calendar Sync Settings</span>
      </h3>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Connection status card */}
        <div className="p-4 border border-white/5 bg-white/[0.01] rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-white">OAuth Connection API</h4>
            <p className="text-[10px] text-[#c7c4d7]/50">
              {hasCredentials
                ? "OAuth terhubung dan diotorisasi untuk user@sophia.local."
                : "Mode database lokal (kredensial OAuth belum dipasang)."}
            </p>
          </div>

          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
            hasCredentials
              ? "bg-[#4edea3]/10 border-[#4edea3]/20 text-[#4edea3]"
              : "bg-[#ffb4ab]/10 border-[#ffb4ab]/20 text-[#ffb4ab]"
          }`}>
            {hasCredentials ? "Connected" : "Offline / Local"}
          </span>
        </div>

        {/* Auto Sync Toggle */}
        <div className="flex items-center justify-between p-3 border border-white/5 bg-white/[0.01] rounded-2xl">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-white">Otomatis Sinkronisasi Kalender</p>
            <p className="text-[10px] text-[#c7c4d7]/50">Sinkronisasikan secara periodik di latar belakang.</p>
          </div>
          <button
            type="button"
            onClick={() => setAutoSync(!autoSync)}
            className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 ${
              autoSync ? "bg-[#8083ff]" : "bg-white/10"
            }`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${
              autoSync ? "translate-x-5" : "translate-x-0"
            }`} />
          </button>
        </div>

        {/* Sync Interval Selector */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">
            Interval Sinkronisasi
          </label>
          <select
            value={interval}
            onChange={(e) => setIntervalVal(e.target.value)}
            disabled={!autoSync}
            className="w-full px-3 py-2 bg-[#111316] border border-white/5 focus:border-[#c0c1ff]/30 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/20 disabled:opacity-40"
          >
            <option value="15">Setiap 15 Menit</option>
            <option value="30">Setiap 30 Menit</option>
            <option value="60">Setiap 1 Jam</option>
            <option value="360">Setiap 6 Jam</option>
          </select>
        </div>

        {/* Action button & Success feedback */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          {showSuccess && (
            <span className="text-xs text-[#4edea3] flex items-center gap-1 font-semibold">
              <CheckCircle size={14} />
              <span>Sinkronisasi berhasil disimpan!</span>
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
