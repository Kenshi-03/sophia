"use client"

import React, { useState, useEffect } from "react"
import { Sparkles, Plus, RefreshCw } from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import CalendarTimeline from "./calendar-timeline"
import SyncStatusPanel from "./sync-status-panel"
import EventDetailsModal from "./event-details-modal"
import EventEditor from "./event-editor"
import { CalendarEvent } from "@/types/calendar"
import { saveFocusBlockAction } from "@/app/actions/schedule"
import { useSettingsStore } from "@/stores/use-settings-store"

interface CalendarCategory {
  id: string
  name: string
  color: string | null
  categoryType: string | null
}

interface CalendarWorkspaceProps {
  initialEvents: CalendarEvent[]
  initialCategories: CalendarCategory[]
  hasCredentials: boolean
}

export default function CalendarWorkspace({
  initialEvents,
  initialCategories,
  hasCredentials,
}: CalendarWorkspaceProps) {
  const settings = useSettingsStore()
  
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [categories, setCategories] = useState<CalendarCategory[]>(initialCategories)
  
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  const [aiAnalysis, setAiAnalysis] = useState<string>("Menganalisis jadwal Anda...")
  const [recommendedFocus, setRecommendedFocus] = useState<CalendarEvent | null>(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)

  // Fetch updated data from API to refresh both events and categories
  const refreshCalendarData = async () => {
    try {
      const res = await fetch("/api/calendar")
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setEvents(data.events)
          setCategories(data.categories)
        }
      }
    } catch (error) {
      console.error("Gagal memperbarui data kalender:", error)
    }
  }

  // Load categories and fresh events on mount
  useEffect(() => {
    refreshCalendarData()
  }, [])

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsDetailsOpen(true)
  }

  const handleCloseDetails = () => {
    setIsDetailsOpen(false)
    setSelectedEvent(null)
  }

  const handleOpenEditor = (eventToEdit: CalendarEvent | null) => {
    setEditingEvent(eventToEdit)
    setIsEditorOpen(true)
  }

  const handleCloseEditor = () => {
    setIsEditorOpen(false)
    setEditingEvent(null)
  }

  const fetchInsights = async (currentEvents: CalendarEvent[]) => {
    setIsLoadingInsights(true)
    try {
      const res = await fetch("/api/ai/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          events: currentEvents,
          model: settings.defaultAiModel,
          aiMode: settings.aiMode,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiAnalysis(data.analysis || "Jadwal Anda optimal.")
        if (data.recommendation) {
          setRecommendedFocus({
            id: "recommended-focus-block",
            title: data.recommendation.title || "Deep Work Focus Session",
            description: data.recommendation.description || "Sesi alokasi kognitif terfokus.",
            startTime: data.recommendation.startTime,
            endTime: data.recommendation.endTime,
            location: data.recommendation.location || "Localhost",
            isFocusMode: true,
            cognitiveLoad: 75,
            tags: ["focus", "ai-recommended"]
          })
        } else {
          setRecommendedFocus(null)
        }
      } else {
        setAiAnalysis("Gagal memuat rekomendasi kognitif AI.")
        setRecommendedFocus(null)
      }
    } catch (error) {
      console.error("Failed to fetch planner insights:", error)
      setAiAnalysis("Gagal memuat rekomendasi kognitif AI.")
      setRecommendedFocus(null)
    } finally {
      setIsLoadingInsights(false)
    }
  }

  useEffect(() => {
    if (events.length > 0) {
      fetchInsights(events)
    }
  }, [events])

  const handleApplyRecommendation = async () => {
    if (!recommendedFocus || categories.length === 0) return

    // Find the Deep Work category id to link
    const deepWorkCategory = categories.find(c => c.categoryType === "deep-work") || categories[0]

    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recommendedFocus.title,
          description: recommendedFocus.description,
          startTime: recommendedFocus.startTime,
          endTime: recommendedFocus.endTime,
          location: recommendedFocus.location,
          calendarId: deepWorkCategory.id,
        }),
      })

      if (res.ok) {
        refreshCalendarData()
      } else {
        console.error("Failed to save recommended focus block")
      }
    } catch (error) {
      console.error("Error applying focus block recommendation:", error)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      {/* Page Header */}
      <PageHeader
        title="Calendar Intelligence"
        description="Analisis jadwal harian Anda dan konversi data aktivitas menjadi insight kognitif."
      >
        <button
          onClick={() => {
            const btn = document.querySelector('button[onClick*="Sync Now"]') as HTMLButtonElement | null
            if (btn) btn.click()
          }}
          className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white hover:border-[#c0c1ff]/30 transition-all duration-200 cursor-pointer"
        >
          <RefreshCw size={14} className="text-[#c7c4d7]" />
          <span>Sync Google Calendar</span>
        </button>
        
        <button
          onClick={() => handleOpenEditor(null)}
          className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-[#8083ff] text-white rounded-xl text-xs font-semibold hover:bg-[#8083ff]/90 hover:shadow-lg hover:shadow-[#8083ff]/10 transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>Tambah Agenda</span>
        </button>
      </PageHeader>

      {/* Main Grid: Calendar Timeline & Side Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Calendar Timeline View (Col span: 2) */}
        <div className="lg:col-span-2">
          <CalendarTimeline 
            events={events} 
            onSelectEvent={handleSelectEvent} 
            onRefresh={refreshCalendarData}
          />
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
                {aiAnalysis}
              </p>
              
              {recommendedFocus && (
                <div className="pt-2">
                  <button
                    onClick={handleApplyRecommendation}
                    className="w-full py-2 bg-[#8083ff] text-white rounded-xl text-xs font-semibold hover:bg-[#8083ff]/90 transition-all duration-200 active:scale-95 cursor-pointer"
                  >
                    Terapkan Rekomendasi Fokus
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Google Sync Control Status Panel */}
          <SyncStatusPanel hasCredentials={hasCredentials} onSyncComplete={setEvents} />

        </div>

      </div>

      {/* Dynamic Detail Popup Modal */}
      <EventDetailsModal
        event={selectedEvent}
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        onEdit={handleOpenEditor}
      />

      {/* Unified Create/Edit Bottom Sheet & Modal Editor */}
      <EventEditor
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        event={editingEvent}
        categories={categories}
        onRefresh={refreshCalendarData}
      />
    </div>
  )
}
