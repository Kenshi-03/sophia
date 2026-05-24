"use client"

import React, { useEffect } from "react"
import { Clock, MapPin, X, Sparkles, Activity, Tag } from "lucide-react"
import { CalendarEvent } from "@/types/calendar"

interface EventDetailsModalProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
}

export default function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  // Prevent scrolling behind modal when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  if (!isOpen || !event) return null

  // Format time and date
  const formatEventDateTime = (start: Date | string, end: Date | string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    const dayStr = startDate.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    
    const startStr = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const endStr = endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    
    return { dayStr, timeRange: `${startStr} - ${endStr}` }
  }

  const { dayStr, timeRange } = formatEventDateTime(event.startTime, event.endTime)
  const isFocus = event.isFocusMode || false
  const load = event.cognitiveLoad || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modal Card wrapper */}
      <div className="w-full max-w-lg glass-panel rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl bg-[#1e2023]/95 p-6 space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin animate-in zoom-in-95 duration-200">
        
        {/* Header Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#c7c4d7]/70 hover:text-white p-1.5 hover:bg-white/5 rounded-xl transition-all"
        >
          <X size={16} />
        </button>

        {/* Event Title Header */}
        <div className="space-y-2 pr-8">
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
              isFocus 
                ? "bg-[#c0c1ff]/10 text-[#c0c1ff] border border-[#c0c1ff]/20" 
                : "bg-white/5 text-[#c7c4d7]/70 border border-white/5"
            }`}>
              {isFocus ? "Focus Block" : "Event Agenda"}
            </span>

            {load > 0 && (
              <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${
                load >= 70 
                  ? "bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/20" 
                  : load >= 40 
                  ? "bg-[#adc6ff]/10 text-[#adc6ff] border border-[#adc6ff]/20" 
                  : "bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20"
              }`}>
                <Activity size={10} />
                <span>Beban Kognitif: {load}%</span>
              </span>
            )}
          </div>
          
          <h2 className="text-xl font-bold text-white font-display leading-snug">
            {event.title}
          </h2>
        </div>

        {/* Event Metadata (Time and Location) */}
        <div className="space-y-3 border-y border-white/5 py-4">
          <div className="flex items-start gap-3 text-xs text-[#c7c4d7]/80">
            <Clock size={16} className="text-[#c0c1ff] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-white">{dayStr}</p>
              <p className="text-[11px] text-[#c7c4d7]/50 font-mono">{timeRange}</p>
            </div>
          </div>

          {event.location && (
            <div className="flex items-center gap-3 text-xs text-[#c7c4d7]/80">
              <MapPin size={16} className="text-[#4edea3] shrink-0" />
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {/* Description Section */}
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/50">
            Deskripsi Agenda
          </h4>
          <p className="text-xs text-[#e2e2e6] leading-relaxed whitespace-pre-wrap">
            {event.description || "Tidak ada deskripsi detail untuk agenda ini."}
          </p>
        </div>

        {/* Semantic Tags (Optional) */}
        {event.tags && event.tags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/50">
              Tag Asosiasi
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-mono text-[#c7c4d7]/60 bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg flex items-center gap-1"
                >
                  <Tag size={8} />
                  <span>#{tag}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendations & Cognitive Insights */}
        <div className="bg-[#c0c1ff]/5 border border-[#c0c1ff]/15 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Sparkles size={14} className="text-[#c0c1ff]" />
            <span>AI Cognitive Analysis</span>
          </div>

          <p className="text-[11px] text-[#c7c4d7]/80 leading-relaxed">
            {isFocus ? (
              <>
                Sesi ini dikonfigurasi sebagai <strong>Focus Mode</strong> untuk alokasi pengerjaan mendalam. Untuk memaksimalkan performa kognitif, disarankan meminimalkan distraksi (tutup tab tidak relevan, aktifkan Do Not Disturb).
              </>
            ) : load >= 70 ? (
              <>
                Agenda ini memiliki <strong>Beban Kognitif Tinggi ({load}%)</strong>. Disarankan untuk tidak menjadwalkan agenda berat lain tepat setelah sesi ini berakhir. Alokasikan waktu istirahat minimal 15 menit untuk memulihkan energi kognitif.
              </>
            ) : (
              <>
                Slot waktu ini optimal untuk koordinasi eksternal atau integrasi informasi ringan. Beban kognitif stabil dan mendukung interaksi interpersonal yang fokus.
              </>
            )}
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/5 hover:border-white/10 transition-all active:scale-98"
        >
          Tutup Rincian
        </button>

      </div>
    </div>
  )
}
