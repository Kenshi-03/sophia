import React from 'react'
import { ArrowUpRight } from 'lucide-react'

interface OverviewCardProps {
  title: string
  value: string | number
  description: string
  trend?: string
}

export default function OverviewCard({ title, value, description, trend }: OverviewCardProps) {
  return (
    <div className="glass-card p-6 rounded-3xl flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <span className="text-[10px] text-[#c7c4d7]/70 font-bold uppercase tracking-wider">
            {title}
          </span>
          {trend && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#4edea3] bg-[#4edea3]/10 px-1.5 py-0.5 rounded-lg">
              {trend} <ArrowUpRight size={10} />
            </span>
          )}
        </div>
        <p className="text-2xl font-extrabold text-white font-mono">{value}</p>
      </div>
      <p className="text-[11px] text-[#c7c4d7]/50 mt-2">{description}</p>
    </div>
  )
}
