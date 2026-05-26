import React from 'react'
import EventCard from './event-card'

const weekDays = [
  { day: 'Mon', date: 18 },
  { day: 'Tue', date: 19 },
  { day: 'Wed', date: 20 },
  { day: 'Thu', date: 21 },
  { day: 'Fri', date: 22 },
  { day: 'Sat', date: 23 },
  { day: 'Sun', date: 24, active: true },
]

export default function WeeklyView() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-6 space-y-6 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">Weekly Overview</h3>
      </div>
      
      <div className="grid grid-cols-7 gap-4 text-center">
        {weekDays.map((wd, i) => (
          <div key={i} className={`p-2 rounded-xl border ${wd.active ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-zinc-50 dark:border-zinc-800/50'}`}>
            <span className="text-[10px] text-zinc-400 block uppercase font-medium">{wd.day}</span>
            <span className={`text-sm font-bold block mt-1 ${wd.active ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>{wd.date}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-4 border-t border-zinc-50 dark:border-zinc-800/50">
        <EventCard title="SOPHIA Dev User Sprint" time="02:00 PM" duration="120m" location="Localhost" color="indigo" />
      </div>
    </div>
  )
}
