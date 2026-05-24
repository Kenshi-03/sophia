import React from 'react'
import { Clock, MapPin } from 'lucide-react'

export interface EventCardProps {
  title: string
  time: string
  duration: string
  location?: string
  color?: 'indigo' | 'emerald' | 'amber' | 'rose'
}

export default function EventCard({
  title,
  time,
  duration,
  location,
  color = 'indigo',
}: EventCardProps) {
  const colorMap = {
    indigo: 'border-indigo-100 bg-indigo-50/10 text-indigo-700 dark:border-indigo-950/40 dark:bg-indigo-950/5 dark:text-indigo-400',
    emerald: 'border-emerald-100 bg-emerald-50/10 text-emerald-700 dark:border-emerald-950/40 dark:bg-emerald-950/5 dark:text-emerald-400',
    amber: 'border-amber-100 bg-amber-50/10 text-amber-700 dark:border-amber-950/40 dark:bg-amber-950/5 dark:text-amber-400',
    rose: 'border-rose-100 bg-rose-50/10 text-rose-700 dark:border-rose-950/40 dark:bg-rose-950/5 dark:text-rose-400',
  }

  return (
    <div className={`p-4 border rounded-2xl flex flex-col justify-between text-xs transition-shadow hover:shadow-sm ${colorMap[color]}`}>
      <div className="space-y-1">
        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{title}</h4>
        <div className="flex items-center gap-3 text-zinc-400 dark:text-zinc-500">
          <span className="flex items-center gap-1"><Clock size={12} /> {time} ({duration})</span>
          {location && <span className="flex items-center gap-1"><MapPin size={12} /> {location}</span>}
        </div>
      </div>
    </div>
  )
}
