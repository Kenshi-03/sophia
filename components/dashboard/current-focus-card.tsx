"use client"

import React, { useState, useTransition, useEffect } from "react"
import { Play, Pause, CheckCircle2, Loader2, Sparkles } from "lucide-react"
import { DashboardTask } from "@/types/dashboard"
import { toggleTaskCompletion } from "@/app/actions/tasks"
import { useRouter } from "next/navigation"

interface CurrentFocusCardProps {
  task: DashboardTask
  progressPercent: number
}

export default function CurrentFocusCard({ task, progressPercent }: CurrentFocusCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isToggled, setIsToggled] = useState(task.completed)
  
  // Timer states
  const [isActive, setIsActive] = useState(false)
  const [seconds, setSeconds] = useState(15120) // Start from 04:12:00 (15120 seconds)

  // Update toggle state when task changes
  useEffect(() => {
    setIsToggled(task.completed)
  }, [task.completed])

  // Timer tick effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds + 1)
      }, 1000)
    } else if (!isActive && seconds !== 0) {
      if (interval) clearInterval(interval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, seconds])

  // Format timer
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return [
      hrs.toString().padStart(2, "0"),
      mins.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":")
  }

  const handleToggle = () => {
    const nextStatus = isToggled
    setIsToggled(!nextStatus) // optimistic update
    
    startTransition(async () => {
      const res = await toggleTaskCompletion(task.id, nextStatus)
      if (res && res.success) {
        router.refresh()
      } else {
        // Revert on error
        setIsToggled(nextStatus)
      }
    })
  }

  return (
    <div className="col-span-12 lg:col-span-8 glass-panel rounded-3xl p-6 relative overflow-hidden group hover:border-[#c0c1ff]/20 hover:scale-[1.01] transition-all duration-300">
      {/* Subtle Radial Glow */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#c0c1ff]/10 blur-3xl pointer-events-none group-hover:bg-[#c0c1ff]/20 transition-all duration-500" />
      
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#c0c1ff] bg-[#c0c1ff]/10 px-2.5 py-1 rounded-xl flex items-center gap-1.5 w-fit">
            <Sparkles size={10} />
            <span>Fokus Aktif</span>
          </span>
          <h2 className="text-xl font-bold text-white mt-3 font-display">
            {task.title}
          </h2>
          <p className="text-xs text-[#c7c4d7]/70 mt-1 max-w-lg">
            {task.content || "Siap mengalokasikan sumber daya untuk pengerjaan mendalam."}
          </p>
        </div>

        {/* Display Current Duration */}
        <span className="text-xs font-mono text-[#c7c4d7] bg-white/5 border border-white/5 px-2.5 py-1 rounded-xl self-start">
          {formatTime(seconds)}
        </span>
      </div>

      {/* Progress Tracker bar */}
      <div className="mt-8 space-y-2">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-[#c7c4d7]">Progress Task Selesai</span>
          <span className="text-[#c0c1ff] font-mono">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#8083ff] to-[#c0c1ff] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Session Action Triggers */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 active:scale-95 border ${
            isActive
              ? "bg-white text-black border-white hover:bg-white/95"
              : "bg-[#c0c1ff] text-[#1000a9] border-[#c0c1ff] hover:bg-white hover:text-black hover:border-white"
          }`}
        >
          {isActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          <span>{isActive ? "Pause Sesi" : "Resume Sesi"}</span>
        </button>

        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border rounded-xl transition-all duration-200 active:scale-95 ${
            isToggled
              ? "bg-[#4edea3]/10 border-[#4edea3]/20 text-[#4edea3] hover:bg-[#4edea3]/15"
              : "border-white/10 hover:border-white/20 bg-white/5 text-white"
          }`}
        >
          {isPending ? (
            <Loader2 size={14} className="animate-spin text-[#c0c1ff]" />
          ) : (
            <CheckCircle2 size={14} className={isToggled ? "text-[#4edea3]" : "text-white/60"} />
          )}
          <span>{isToggled ? "Selesai" : "Tandai Selesai"}</span>
        </button>
      </div>
    </div>
  )
}
