import React from 'react'
import { Sparkles, TrendingUp } from 'lucide-react'

interface ProductivityCardProps {
  score?: number
  cognitiveLoad?: number
}

export default function ProductivityCard({ score = 84, cognitiveLoad = 42 }: ProductivityCardProps) {
  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-white">Productivity Metrics</h3>
        <TrendingUp className="text-[#4edea3]" size={18} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <span className="text-[9px] text-[#c7c4d7]/70 font-bold uppercase tracking-wider">
            Focus Score
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-[#c0c1ff] font-mono">{score}</span>
            <span className="text-[10px] font-semibold text-[#c7c4d7]/40">/100</span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] text-[#c7c4d7]/70 font-bold uppercase tracking-wider">
            Cognitive Load
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-[#4edea3] font-mono">{cognitiveLoad}%</span>
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3 border-t border-white/5 pt-4">
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-semibold">
            <span className="text-[#c7c4d7]/70">Day Target Completion</span>
            <span className="text-white font-mono">80%</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#8083ff] to-[#c0c1ff] rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
