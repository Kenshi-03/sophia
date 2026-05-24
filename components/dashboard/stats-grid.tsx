import React from 'react'
import { Calendar, Brain, FileText, Sparkles } from 'lucide-react'

export interface StatItem {
  label: string
  value: string
  icon: 'calendar' | 'brain' | 'notes' | 'ai'
  iconColor: string
  bgColor: string
}

const defaultStats: StatItem[] = [
  {
    label: 'Events Today',
    value: '3 Scheduled',
    icon: 'calendar',
    iconColor: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/50',
  },
  {
    label: 'Memory Nodes',
    value: '142 Connected',
    icon: 'brain',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
  },
  {
    label: 'Active Notes',
    value: '28 Pages',
    icon: 'notes',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
  },
  {
    label: 'AI Queries',
    value: '12 Executed',
    icon: 'ai',
    iconColor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
  },
]

export default function StatsGrid() {
  const getIcon = (type: string) => {
    switch (type) {
      case 'calendar':
        return <Calendar size={20} />
      case 'brain':
        return <Brain size={20} />
      case 'notes':
        return <FileText size={20} />
      case 'ai':
        return <Sparkles size={20} />
      default:
        return <Brain size={20} />
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {defaultStats.map((stat, i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-zinc-200 dark:hover:border-zinc-800 transition-all duration-300"
        >
          <div className={`h-10 w-10 rounded-xl ${stat.bgColor} flex items-center justify-center ${stat.iconColor}`}>
            {getIcon(stat.icon)}
          </div>
          <div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="text-lg font-bold">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
