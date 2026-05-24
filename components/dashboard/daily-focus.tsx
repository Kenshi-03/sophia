import React from 'react'
import { CheckCircle2, Clock } from 'lucide-react'

export interface DailyFocusTask {
  id: string
  title: string
  time: string
  completed: boolean
}

interface DailyFocusProps {
  tasks?: DailyFocusTask[]
}

const defaultTasks: DailyFocusTask[] = [
  { id: '1', title: 'Review SOPHIA System Specifications', time: '09:00 AM', completed: true },
  { id: '2', title: 'Deep Work: Core AI Router Module', time: '02:00 PM', completed: false },
]

export default function DailyFocus({ tasks = defaultTasks }: DailyFocusProps) {
  return (
    <div className="glass-panel rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-white">Daily Focus Schedule</h3>
        <span className="text-[10px] font-bold text-[#c0c1ff] bg-[#c0c1ff]/10 px-2 py-0.5 rounded-lg">Today</span>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 rounded-2xl border text-xs transition-colors ${
              task.completed
                ? 'border-[#4edea3]/10 bg-[#4edea3]/5'
                : 'border-white/5 bg-white/[0.01]'
            }`}
          >
            <CheckCircle2
              className={`shrink-0 mt-0.5 ${
                task.completed ? 'text-[#4edea3]' : 'text-[#c7c4d7]/30'
              }`}
              size={14}
            />
            <div className="space-y-0.5">
              <p className={`font-semibold ${task.completed ? 'line-through text-[#c7c4d7]/40' : 'text-[#e2e2e6]'}`}>{task.title}</p>
              <span className="text-[#c7c4d7]/40 flex items-center gap-1">
                <Clock size={10} /> {task.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
