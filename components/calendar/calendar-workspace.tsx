"use client"

import React, { useState } from "react"
import { Sparkles, Plus, RefreshCw } from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import CalendarTimeline from "./calendar-timeline"
import SyncStatusPanel from "./sync-status-panel"
import EventDetailsModal from "./event-details-modal"
import { CalendarEvent } from "@/types/calendar"

interface CalendarWorkspaceProps {
  initialEvents: CalendarEvent[]
  hasCredentials: boolean
}

export default function CalendarWorkspace({ initialEvents, hasCredentials }: CalendarWorkspaceProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEvent(null)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Calendar Intelligence"
        description="Analisis jadwal harian Anda dan konversi data aktivitas menjadi insight kognitif."
      >
        <button
          onClick={() => {
            // Trigger simulation
            const btn = document.querySelector('button[onClick*="Sync Now"]') as HTMLButtonElement | null
            if (btn) btn.click()
          }}
          className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white hover:border-[#c0c1ff]/30 transition-all duration-200"
        >
          <RefreshCw size={14} className="text-[#c7c4d7]" />
          <span>Sync Google Calendar</span>
        </button>
        <button className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-[#8083ff] text-white rounded-xl text-xs font-semibold hover:bg-[#8083ff]/90 hover:shadow-lg hover:shadow-[#8083ff]/10 transition-all duration-200 active:scale-95">
          <Plus size={14} />
          <span>Tambah Agenda</span>
        </button>
      </PageHeader>

      {/* Main Grid: Calendar Timeline & Side Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Calendar Timeline View (Col span: 2) */}
        <div className="lg:col-span-2">
          <CalendarTimeline events={events} onSelectEvent={handleSelectEvent} />
        </div>

        {/* Right Column: AI Recommendations & Google Sync Status */}
        <div className="space-y-6">
          
          {/* AI Schedule Recommendations */}
          <div className="glass-panel bg-gradient-to-br from-[#c0c1ff]/10 to-[#8083ff]/5 border border-[#c0c1ff]/15 text-white p-6 rounded-3xl relative overflow-hidden group hover:border-[#c0c1ff]/30 transition-all duration-300">
            {/* Corner Radial Accent Glow */}
            <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-[#c0c1ff]/10 blur-2xl group-hover:bg-[#c0c1ff]/15 transition-all duration-500" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="text-[#c0c1ff] animate-pulse" size={18} />
                <h2 className="font-bold text-sm uppercase tracking-wider">Schedule Insights</h2>
              </div>
              
              <p className="text-xs text-[#c7c4d7]/90 leading-relaxed">
                Analisis agenda SOPHIA mengidentifikasi adanya kepadatan aktivitas (Beban Kognitif Tinggi) besok antara pukul <strong>14:00 - 16:00</strong>. Kami menyarankan untuk menjadwalkan <strong>Focus Block</strong> di pagi hari untuk pengerjaan mendalam.
              </p>
              
              <div className="pt-2">
                <button
                  onClick={() => {
                    // Inject a focus mode event as recommendation action simulation
                    const alreadyExists = events.some(e => e.id === "mock-focus-recommendation")
                    if (alreadyExists) return
                    
                    const newFocusBlock: CalendarEvent = {
                      id: "mock-focus-recommendation",
                      title: "Deep Work: Core System Integration",
                      description: "Sesi alokasi kognitif terfokus untuk integrasi sub-sistem SOPHIA.",
                      startTime: new Date(new Date().setHours(8, 0, 0, 0)),
                      endTime: new Date(new Date().setHours(9, 30, 0, 0)),
                      location: "Localhost",
                      isFocusMode: true,
                      cognitiveLoad: 50,
                      tags: ["focus", "core-integration"]
                    }
                    setEvents((prev) => [...prev, newFocusBlock])
                  }}
                  className="w-full py-2 bg-[#8083ff] text-white rounded-xl text-xs font-semibold hover:bg-[#8083ff]/90 transition-all duration-200 active:scale-95"
                >
                  Terapkan Rekomendasi Fokus
                </button>
              </div>
            </div>
          </div>

          {/* Google Sync Control Status Panel */}
          <SyncStatusPanel hasCredentials={hasCredentials} />

        </div>

      </div>

      {/* Dynamic Detail Popup Modal */}
      <EventDetailsModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}
