import React from "react"
import { TrendingUp, ArrowUpRight, MapPin } from "lucide-react"
import Link from "next/link"
import { CalendarEvent } from "@/types/calendar"

interface IntegratedScheduleWidgetProps {
  events: CalendarEvent[]
}

export default function IntegratedScheduleWidget({ events }: IntegratedScheduleWidgetProps) {
  // Helper to format start time
  const formatTime = (time: Date | string) => {
    return new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Check if an event is currently happening
  const isEventActive = (startTime: Date | string, endTime: Date | string) => {
    const now = new Date()
    const start = new Date(startTime)
    const end = new Date(endTime)
    return now >= start && now <= end
  }

  return (
    <div className="col-span-12 lg:col-span-5 glass-panel rounded-3xl p-6 flex flex-col justify-between hover:border-[#c0c1ff]/20 hover:scale-[1.01] transition-all duration-300">
      <div>
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-bold text-[#e2e2e6] tracking-wide flex items-center gap-2">
            <TrendingUp size={16} className="text-[#4edea3]" />
            <span>Agenda Terintegrasi</span>
          </h3>
          <Link
            href="/dashboard/calendar"
            className="text-[10px] text-[#c7c4d7] hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-2.5 py-1 bg-white/[0.02] transition-all"
          >
            Sync Nodes
          </Link>
        </div>
        <p className="text-xs text-[#c7c4d7]/50 mt-1">
          Integrasi kecerdasan Google Calendar.
        </p>
      </div>

      <div className="space-y-4 my-6">
        {events.length === 0 ? (
          <p className="text-xs text-[#c7c4d7]/50 py-4 text-center">
            Tidak ada agenda yang terindeks untuk hari ini.
          </p>
        ) : (
          events.map((event) => {
            const startStr = formatTime(event.startTime)
            const isActive = isEventActive(event.startTime, event.endTime)

            return (
              <div key={event.id} className="flex gap-4 group/item">
                <div className="text-[10px] font-mono font-bold text-[#c7c4d7]/60 whitespace-nowrap pt-1 w-12">
                  {startStr}
                </div>
                <div className={`border-l-2 pl-3 space-y-0.5 group-hover/item:border-white transition-all duration-200 ${
                  isActive ? "border-[#c0c1ff]" : "border-white/10"
                }`}>
                  <h4 className="text-xs font-semibold text-white group-hover/item:text-[#c0c1ff] transition-colors duration-200">
                    {event.title}
                  </h4>
                  <p className="text-[10px] text-[#c7c4d7]/60 flex items-center gap-1.5 flex-wrap">
                    <span>{event.description || "Agenda disinkronkan dengan SOPHIA Memory."}</span>
                    {event.location && (
                      <span className="flex items-center gap-0.5 text-[#adc6ff]">
                        <MapPin size={8} />
                        <span>{event.location}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <Link
        href="/dashboard/calendar"
        className="text-xs text-[#c0c1ff] hover:text-white flex items-center gap-1 font-semibold transition-colors group/link"
      >
        <span>Lihat Semua Agenda</span>
        <ArrowUpRight size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
      </Link>
    </div>
  )
}
