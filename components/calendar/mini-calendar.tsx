import React from 'react'

export default function MiniCalendar() {
  const currentDay = 24

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-lg">May 2026</h2>
        <div className="flex gap-2">
          <button className="p-2 border border-zinc-100 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            &lt;
          </button>
          <button className="p-2 border border-zinc-100 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            &gt;
          </button>
        </div>
      </div>
      
      {/* Days header */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500 mb-4">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>
      
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Padding for May 2026 starts on Friday */}
        <div className="h-14"></div>
        <div className="h-14"></div>
        <div className="h-14"></div>
        <div className="h-14"></div>
        <div className="h-14"></div>
        
        {/* May 1 & 2 */}
        <div className="h-14 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-2 flex flex-col justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
          <span className="text-xs font-bold">1</span>
        </div>
        <div className="h-14 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-2 flex flex-col justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
          <span className="text-xs font-bold">2</span>
        </div>
        
        {/* Week 2 */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-14 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-2 flex flex-col justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <span className="text-xs font-bold">{3 + i}</span>
          </div>
        ))}
        
        {/* Week 3 */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-14 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-2 flex flex-col justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <span className="text-xs font-bold">{10 + i}</span>
          </div>
        ))}
        
        {/* Week 4 with active day 24 */}
        {Array.from({ length: 7 }).map((_, i) => {
          const day = 17 + i
          const isToday = day === currentDay
          return (
            <div
              key={i}
              className={`h-14 border rounded-xl p-2 flex flex-col justify-between transition-colors ${
                isToday
                  ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                  : 'border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className={`text-xs font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                {day}
              </span>
              {isToday && <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 self-end"></span>}
            </div>
          )
        })}
        
        {/* Week 5 */}
        {Array.from({ length: 7 }).map((_, i) => {
          const day = 24 + i
          return (
            <div
              key={i}
              className="h-14 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-2 flex flex-col justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <span className="text-xs font-bold">{day}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
