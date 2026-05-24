"use client"

import React from "react"
import { Search, X } from "lucide-react"

interface SemanticSearchProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
}

export default function SemanticSearch({ value, onChange, onClear }: SemanticSearchProps) {
  return (
    <div className="relative glass-panel rounded-2xl p-2 ai-glow transition-all duration-300">
      <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[#c7c4d7]/50">
        <Search size={16} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='Search memories semantically... (e.g., "What did I learn about NextJS?")'
        className="w-full pl-11 pr-10 py-3 bg-[#111316]/50 border border-white/[0.03] focus:border-[#c0c1ff]/30 rounded-xl text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/15 transition-all placeholder-[#c7c4d7]/30"
      />
      {value && (
        <button
          onClick={onClear}
          type="button"
          className="absolute inset-y-0 right-5 flex items-center text-[#c7c4d7]/50 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
