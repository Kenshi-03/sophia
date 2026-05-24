import React from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'

export interface FreeSlot {
  id: string
  time: string
  duration: string
}

interface FreeSlotCardProps {
  slots?: FreeSlot[]
}

const defaultSlots: FreeSlot[] = [
  { id: '1', time: '10:30 AM - 12:00 PM', duration: '90 mins' },
  { id: '2', time: '04:00 PM - 05:30 PM', duration: '90 mins' },
]

export default function FreeSlotCard({ slots = defaultSlots }: FreeSlotCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="text-violet-600 dark:text-violet-400" size={18} />
        <h3 className="font-bold text-base">Recommended Focus Slots</h3>
      </div>
      
      <div className="space-y-2">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 text-xs"
          >
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">{slot.time}</p>
              <p className="text-zinc-400 mt-0.5">{slot.duration} available</p>
            </div>
            <button className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors">
              <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
