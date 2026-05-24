"use client"

import React, { useState, useEffect } from "react"
import { Clock, MapPin, Sparkles, Activity, Tag, Plus, Calendar as CalendarIcon } from "lucide-react"
import { CalendarEvent } from "@/types/calendar"

interface CalendarTimelineProps {
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
}

export default function CalendarTimeline({ events, onSelectEvent }: CalendarTimelineProps) {
  const [activeTab, setActiveTab] = useState<"weekly" | "daily">("weekly")
  
  // Generate days of the current week dynamically
  const [weekDays, setWeekDays] = useState<Date[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  useEffect(() => {
    const now = new Date()
    const currentDayOfWeek = now.getDay() // 0 = Sun, 1 = Mon ...
    const monday = new Date(now)
    
    // Adjust to Monday of the current week
    const diff = now.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1)
    monday.setDate(diff)
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      days.push(day)
    }
    setWeekDays(days)
    setSelectedDate(now) // Default to today
  }, [])

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    )
  }

  // Filter events matching the selected date
  const selectedDateEvents = events.filter((event) => {
    const eventDate = new Date(event.startTime)
    return isSameDay(eventDate, selectedDate)
  })

  // Format time (e.g. 09:00 AM)
  const formatTime = (time: Date | string) => {
    return new Date(time).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Hours list for Daily Timeline (08:00 - 20:00)
  const timelineHours = Array.from({ length: 13 }).map((_, i) => {
    const hourNum = 8 + i
    return `${hourNum.toString().padStart(2, "0")}:00`
  })

  // Check if an event starts in a specific hour slot
  const getEventsForHour = (hourStr: string) => {
    const hourNum = parseInt(hourStr.split(":")[0])
    return events.filter((event) => {
      const eventDate = new Date(event.startTime)
      // Check if same day as selectedDate AND starts at this hour
      return isSameDay(eventDate, selectedDate) && eventDate.getHours() === hourNum
    })
  }

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6 hover:border-[#c0c1ff]/10 transition-all duration-300">
      
      {/* Header controls: Switchers & Today quick trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-[#c0c1ff]" size={18} />
          <h3 className="font-bold text-sm text-white">Timeline Scheduler</h3>
        </div>

        {/* View Switch Tab Buttons */}
        <div className="flex bg-white/[0.02] border border-white/5 rounded-xl p-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("weekly")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 text-center text-xs font-semibold rounded-lg transition-all ${
              activeTab === "weekly" ? "bg-[#c0c1ff]/15 text-[#c0c1ff]" : "text-[#c7c4d7]/70 hover:text-white"
            }`}
          >
            Weekly Grid
          </button>
          <button
            onClick={() => setActiveTab("daily")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 text-center text-xs font-semibold rounded-lg transition-all ${
              activeTab === "daily" ? "bg-[#c0c1ff]/15 text-[#c0c1ff]" : "text-[#c7c4d7]/70 hover:text-white"
            }`}
          >
            Daily Hour Grid
          </button>
        </div>
      </div>

      {/* Week Day Header Row Selector */}
      <div className="grid grid-cols-7 gap-2 text-center">
        {weekDays.map((date, idx) => {
          const isSelected = isSameDay(date, selectedDate)
          const isToday = isSameDay(date, new Date())
          const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
          const dayDate = date.getDate()

          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(date)}
              className={`p-2 rounded-2xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-[#c0c1ff]/15 border-[#c0c1ff]/30 text-[#c0c1ff] font-bold"
                  : "bg-white/[0.01] border-white/5 text-[#c7c4d7]/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-[10px] block uppercase font-medium tracking-tight mb-1">{dayName}</span>
              <span className={`text-sm font-bold block ${
                isToday && !isSelected ? "text-[#4edea3]" : ""
              }`}>
                {dayDate}
              </span>
              {isToday && (
                <span className={`h-1.5 w-1.5 rounded-full mx-auto mt-1 block ${
                  isSelected ? "bg-[#c0c1ff]" : "bg-[#4edea3]"
                }`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Main Switcher Content Container */}
      {activeTab === "weekly" ? (
        /* 1. Weekly Overview Content (Details of Active Day List) */
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-[#c7c4d7]/50 font-mono">
            <span>Agenda: {selectedDate.toLocaleDateString("id-ID", { day: "numeric", month: "long" })}</span>
            <span>{selectedDateEvents.length} Events Terindeks</span>
          </div>

          {selectedDateEvents.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/5 rounded-2xl text-xs text-[#c7c4d7]/40">
              Tidak ada agenda dijadwalkan pada hari ini.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateEvents.map((event) => {
                const isFocus = event.isFocusMode || false
                
                return (
                  <div
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className={`p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 cursor-pointer ${
                      isFocus
                        ? "bg-gradient-to-br from-[#c0c1ff]/10 to-[#8083ff]/5 border-[#c0c1ff]/30 hover:border-[#c0c1ff]/50"
                        : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className={`text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                          isFocus ? "bg-[#c0c1ff]/20 text-[#c0c1ff]" : "bg-white/5 text-[#c7c4d7]/70"
                        }`}>
                          {isFocus ? "Focus Mode" : "Event"}
                        </span>
                        
                        {event.cognitiveLoad && (
                          <span className="text-[8px] font-mono font-bold bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 text-[#ffb4ab] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Activity size={8} />
                            Load: {event.cognitiveLoad}%
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white leading-normal">
                        {event.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#c7c4d7]/50 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-[#c0c1ff]" />
                          {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-[#4edea3]" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* AI Insights Indicators inside event list */}
                    {isFocus && (
                      <div className="text-[10px] text-[#c7c4d7]/70 max-w-xs bg-black/20 p-2.5 rounded-xl border border-white/5 shrink-0 self-start sm:self-center flex gap-1.5 items-start">
                        <Sparkles size={12} className="text-[#c0c1ff] shrink-0 mt-0.5" />
                        <p className="leading-relaxed">Optimal untuk fokus penuh kognitif tanpa distraksi.</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* 2. Daily Hour-by-Hour Timeline Grid */
        <div className="space-y-2.5">
          <div className="text-xs text-[#c7c4d7]/50 font-mono mb-2">
            Timeline Harian: {selectedDate.toLocaleDateString("id-ID", { day: "numeric", month: "long" })}
          </div>

          <div className="border border-white/5 bg-[#111316]/20 rounded-2xl overflow-hidden divide-y divide-white/5">
            {timelineHours.map((hourStr) => {
              const hourEvents = getEventsForHour(hourStr)
              
              return (
                <div key={hourStr} className="flex min-h-[4.5rem] group/row">
                  {/* Left Hour Label */}
                  <div className="w-16 flex justify-center items-start pt-3 border-r border-white/5 font-mono text-[10px] text-[#c7c4d7]/40">
                    {hourStr}
                  </div>

                  {/* Right Event Slots container */}
                  <div className="flex-1 p-2 flex flex-col gap-2 justify-center bg-white/[0.005] group-hover/row:bg-white/[0.015] transition-colors">
                    {hourEvents.length === 0 ? (
                      <div className="text-[9px] text-[#c7c4d7]/20 pl-2 font-mono select-none">
                        Empty cognitive slot
                      </div>
                    ) : (
                      hourEvents.map((event) => {
                        const isFocus = event.isFocusMode || false
                        
                        return (
                          <div
                            key={event.id}
                            onClick={() => onSelectEvent(event)}
                            className={`p-2 px-3 border rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              isFocus
                                ? "bg-gradient-to-r from-[#c0c1ff]/10 to-[#8083ff]/5 border-[#c0c1ff]/20 hover:border-[#c0c1ff]/40 text-[#c0c1ff]"
                                : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.06] text-white"
                            }`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <h5 className="text-xs font-bold truncate">{event.title}</h5>
                              <p className="text-[10px] text-[#c7c4d7]/50 font-mono truncate">
                                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                {event.location && ` • ${event.location}`}
                              </p>
                            </div>

                            {event.cognitiveLoad && (
                              <span className="text-[8px] font-mono font-bold bg-white/5 border border-white/5 text-[#c7c4d7] px-1.5 py-0.5 rounded shrink-0">
                                Load: {event.cognitiveLoad}%
                              </span>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
