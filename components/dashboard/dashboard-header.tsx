"use client"

import { Search, User } from "lucide-react"
import ThemeToggle from "@/components/shared/theme-toggle"

export default function DashboardHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 h-20 border-b border-white/5 bg-[#111316]/70 backdrop-blur-xl px-6 md:px-8 flex items-center justify-between z-50">
      
      {/* Brand Logo & Active Indicator */}
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-[#c0c1ff] ai-pulse-ring" />
        <h1 className="font-display text-xl font-bold tracking-wider text-[#c0c1ff]">
          SOPHIA
        </h1>
      </div>

      {/* Global Actions Block */}
      <div className="flex items-center gap-4">
        
        {/* Global Search Input */}
        <div className="relative max-w-xs hidden md:block">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#c7c4d7]" />
          <input
            type="text"
            placeholder="Search SOPHIA..."
            className="w-64 bg-white/5 border border-white/5 hover:border-white/10 focus:border-[#c0c1ff]/30 rounded-xl py-2 pl-10 pr-4 text-xs text-[#e2e2e6] placeholder-[#c7c4d7]/50 focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/20 transition-all duration-200"
          />
        </div>

        {/* Theme Action Node */}
        <ThemeToggle />

        {/* User Account Trigger */}
        <button className="flex items-center justify-center h-9 w-9 rounded-xl border border-white/5 hover:border-white/10 bg-white/5 text-[#c7c4d7] hover:text-white transition-all active:scale-95">
          <User size={18} />
        </button>

      </div>
    </header>
  )
}