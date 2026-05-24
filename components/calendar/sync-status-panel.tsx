"use client"

import React, { useState } from "react"
import { RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Key, Check } from "lucide-react"
import { CalendarEvent } from "@/types/calendar"

interface SyncStatusPanelProps {
  hasCredentials: boolean
  onSyncComplete?: (events: CalendarEvent[]) => void
}

export default function SyncStatusPanel({ hasCredentials, onSyncComplete }: SyncStatusPanelProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncLogs, setSyncLogs] = useState<string[]>([
    "Sistem inisialisasi: Mode lokal aktif.",
    "Database sinkronisasi awal selesai.",
  ])
  const [showGuide, setShowGuide] = useState(false)
  const [lastSync, setLastSync] = useState<string>("Belum disinkronkan")
  const [syncSuccess, setSyncSuccess] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncSuccess(false)
    
    // Add sync starting log
    setSyncLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] Memulai sinkronisasi Google Calendar...`,
      ...prev,
    ])

    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
      })

      if (!res.ok) {
        throw new Error(`Sync returned status ${res.status}`)
      }

      const syncResult = await res.json()
      const isLocal = syncResult.mode === 'local'

      // Fetch newly updated events list
      const todayRes = await fetch("/api/calendar/today")
      if (!todayRes.ok) {
        throw new Error("Failed to fetch updated events list")
      }
      const updatedEvents = await todayRes.json()

      setIsSyncing(false)
      setSyncSuccess(true)
      
      const nowStr = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })

      setLastSync(nowStr)

      setSyncLogs((prev) => [
        `[${nowStr}] Sukses: Sinkronisasi selesai. Berhasil memperbarui agenda (${isLocal ? 'Database Lokal' : 'Google Cloud'}).`,
        `[${nowStr}] Info: Mengindeks ${updatedEvents.length} agenda berdasarkan rekomendasi produktivitas.`,
        ...prev,
      ])

      if (onSyncComplete) {
        onSyncComplete(updatedEvents)
      }
    } catch (error: any) {
      console.error(error)
      setIsSyncing(false)
      setSyncLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Error: Sinkronisasi gagal. ${error?.message || ''}`,
        ...prev,
      ])
    }

    // Hide success checkmark after 300ms
    setTimeout(() => {
      setSyncSuccess(false)
    }, 300)
  }

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-sm text-white">Google Calendar Sync</h3>
        
        {/* Status Pill */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
          hasCredentials 
            ? "bg-[#4edea3]/10 border-[#4edea3]/20 text-[#4edea3]"
            : "bg-[#ffb4ab]/10 border-[#ffb4ab]/20 text-[#ffb4ab]"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${
            hasCredentials ? "bg-[#4edea3] animate-pulse" : "bg-[#ffb4ab]"
          }`} />
          <span>{hasCredentials ? "Google Connected" : "Local Database"}</span>
        </span>
      </div>

      {/* Sync Button & Last Sync Label */}
      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left">
          <p className="text-[10px] text-[#c7c4d7]/50 uppercase tracking-wider font-bold">Sinkronisasi Terakhir</p>
          <p className="text-xs text-white font-mono">{lastSync}</p>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#8083ff] text-white rounded-xl text-xs font-semibold hover:bg-[#8083ff]/90 hover:shadow-lg hover:shadow-[#8083ff]/10 transition-all duration-200 active:scale-95 disabled:opacity-50`}
        >
          {isSyncing ? (
            <RefreshCw size={14} className="animate-spin text-white" />
          ) : syncSuccess ? (
            <Check size={14} className="text-white" />
          ) : (
            <RefreshCw size={14} className="text-white" />
          )}
          <span>{isSyncing ? "Menyinkronkan..." : "Sync Now"}</span>
        </button>
      </div>

      {/* Credentials Warning & Installation Guide */}
      {!hasCredentials && (
        <div className="border border-[#ffb4ab]/15 bg-[#ffb4ab]/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-[#ffb4ab] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">OAuth Belum Dikonfigurasi</h4>
              <p className="text-[11px] text-[#c7c4d7]/70 leading-relaxed">
                Aplikasi berjalan dalam mode database lokal karena variabel kredensial Google API belum terpasang di <code>.env.local</code>.
              </p>
            </div>
          </div>

          {/* Collapsible installation guide */}
          <div className="border-t border-white/5 pt-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center justify-between w-full text-[10px] text-[#c0c1ff] hover:text-white transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Key size={12} />
                <span>{showGuide ? "Sembunyikan Panduan Setup" : "Lihat Panduan Setup Google API"}</span>
              </span>
              {showGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showGuide && (
              <div className="mt-3 space-y-2 text-[10px] text-[#c7c4d7]/85 font-mono bg-black/20 p-3 rounded-xl border border-white/5 leading-relaxed overflow-x-auto">
                <p className="text-white font-bold mb-1">Tambahkan entri berikut ke .env.local Anda:</p>
                <p>GOOGLE_CLIENT_ID="client-id-anda.apps.googleusercontent.com"</p>
                <p>GOOGLE_CLIENT_SECRET="secret-anda"</p>
                <p>NEXTAUTH_SECRET="random-string-rahasia"</p>
                <div className="border-t border-white/5 pt-2 mt-2 text-[9px] text-[#c7c4d7]/50 font-sans">
                  *Kredensial di atas digunakan oleh <code>next-auth</code> untuk mengamankan pengambilan token Google Calendar API.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Log Feed */}
      <div className="space-y-2">
        <h4 className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/40">Sync Log Terminal</h4>
        <div className="h-28 overflow-y-auto border border-white/5 bg-[#111316]/50 rounded-2xl p-3 font-mono text-[9px] text-[#c7c4d7]/75 space-y-1.5 scrollbar-thin">
          {syncLogs.map((log, index) => (
            <p key={index} className="leading-normal">
              <span className="text-[#c0c1ff] mr-1">$</span> {log}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
