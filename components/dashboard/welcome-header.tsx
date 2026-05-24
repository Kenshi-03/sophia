import React from "react"
import { Activity } from "lucide-react"

interface WelcomeHeaderProps {
  name: string
  cognitiveLoad: number
}

export default function WelcomeHeader({ name, cognitiveLoad }: WelcomeHeaderProps) {
  // Determine color theme based on cognitive load levels
  const getLoadTheme = (load: number) => {
    if (load <= 30) {
      return {
        text: "text-[#4edea3]",
        bg: "bg-[#4edea3]/10 border-[#4edea3]/20",
        label: "Low Load",
      }
    }
    if (load <= 70) {
      return {
        text: "text-[#adc6ff]",
        bg: "bg-[#adc6ff]/10 border-[#adc6ff]/20",
        label: "Moderate Load",
      }
    }
    return {
      text: "text-[#ffb4ab]",
      bg: "bg-[#ffb4ab]/10 border-[#ffb4ab]/20",
      label: "High Load",
    }
  }

  const theme = getLoadTheme(cognitiveLoad)

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#e2e2e6] font-display">
          Selamat datang kembali, {name}
        </h1>
        <p className="text-sm text-[#c7c4d7]/70 mt-1">
          Systematic Organization for Personal Higher Information Analysis.
        </p>
      </div>

      {/* Cognitive Load Metric Pill */}
      <div className={`flex items-center gap-3 border px-4 py-2 rounded-2xl shrink-0 self-start md:self-auto transition-all duration-300 ${theme.bg}`}>
        <Activity size={16} className={`${theme.text} animate-pulse`} />
        <div className="text-xs">
          <span className="text-[#c7c4d7] mr-1">Beban Kognitif:</span>
          <span className={`font-mono font-bold ${theme.text}`}>{cognitiveLoad}%</span>
          <span className="text-[10px] text-[#c7c4d7]/40 ml-1.5">({theme.label})</span>
        </div>
      </div>
    </div>
  )
}
