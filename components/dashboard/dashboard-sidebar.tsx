"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  Brain,
  Notebook,
  Settings,
  Plus,
  HelpCircle,
  Terminal,
  X,
  Sparkles,
  GraduationCap,
} from "lucide-react"
import { createThoughtAction } from "@/app/actions/thoughts"

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
  },
  {
    title: "Class Planner",
    href: "/dashboard/class-planner",
    icon: GraduationCap,
  },
  {
    title: "AI Command",
    href: "/dashboard/ai",
    icon: Brain,
  },
  {
    title: "Permanent Memory",
    href: "/dashboard/memory",
    icon: Brain,
  },
  {
    title: "Notes & Thoughts",
    href: "/dashboard/notes",
    icon: Notebook,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export default function DashboardSidebar() {
  const pathname = usePathname()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [thoughtContent, setThoughtContent] = useState("")
  const [thoughtTags, setThoughtTags] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!thoughtContent.trim()) return

    const tagsArray = thoughtTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)

    try {
      setIsSaving(true)
      setErrorMsg("")
      const res = await createThoughtAction(thoughtContent, tagsArray)
      if (res.success) {
        setThoughtContent("")
        setThoughtTags("")
        setIsModalOpen(false)
      } else {
        setErrorMsg(res.error || "Failed to save thought.")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <aside className="fixed top-20 left-0 bottom-0 w-64 border-r border-white/5 bg-[#111316]/80 backdrop-blur-xl p-4 hidden lg:flex flex-col justify-between z-40">
      
      {/* Top Stack: Active Cognition & Menu Items */}
      <div className="space-y-6">
        
        {/* Section 1: Active Cognition status indicator */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
          <div className="h-2 w-2 rounded-full bg-[#4edea3] ai-pulse-ring" />
          <div className="text-xs">
            <p className="font-semibold text-white">Active Cognition</p>
            <p className="text-[10px] text-[#c7c4d7]">Analyst Prime Online</p>
          </div>
        </div>

        {/* Section 2: Sidebar Menu Items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                  ${isActive
                    ? "bg-[#c0c1ff]/10 text-[#c0c1ff] border-l-2 border-[#c0c1ff] pl-2"
                    : "text-[#c7c4d7] hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <Icon size={18} className={isActive ? "text-[#c0c1ff]" : "text-[#c7c4d7]"} />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>

        {/* Section 3: "New Thought" trigger button */}
        <div className="px-1">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#8083ff] text-white hover:bg-[#8083ff]/90 transition-all duration-200 shadow-lg shadow-[#8083ff]/10 active:scale-98 cursor-pointer"
          >
            <Plus size={16} />
            <span>New Thought</span>
          </button>
        </div>

      </div>

      {/* Footer Section: Dynamic system status links */}
      <div className="border-t border-white/5 pt-4 space-y-1">
        <Link
          href="/dashboard/help"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-[#c7c4d7] hover:text-white hover:bg-white/5 transition-colors"
        >
          <HelpCircle size={14} />
          <span>Help & Support</span>
        </Link>
        <Link
          href="/dashboard/logs"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-[#c7c4d7] hover:text-white hover:bg-white/5 transition-colors"
        >
          <Terminal size={14} />
          <span>System Logs</span>
        </Link>
      </div>

      {/* Quick Thought Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0b0c0e]/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md mx-4 rounded-3xl p-6 relative shadow-2xl border border-white/10 animate-in scale-in duration-200">
            <button
              onClick={() => {
                setIsModalOpen(false)
                setErrorMsg("")
              }}
              className="absolute top-4 right-4 text-[#c7c4d7] hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
            >
              <X size={16} />
            </button>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Sparkles size={16} className="text-[#adc6ff]" />
                <h3 className="font-bold text-sm text-white">Capture Quick Thought</h3>
              </div>

              {errorMsg && (
                <div className="text-xs text-[#ffb4ab] bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 p-3 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">What is on your mind?</label>
                <textarea
                  value={thoughtContent}
                  onChange={(e) => setThoughtContent(e.target.value)}
                  rows={4}
                  placeholder="Capture a quick thought or task..."
                  required
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-sans resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Tags (comma separated)</label>
                <input
                  type="text"
                  value={thoughtTags}
                  onChange={(e) => setThoughtTags(e.target.value)}
                  placeholder="ideas, coding, reminder"
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setErrorMsg("")
                  }}
                  className="px-4 py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#8083ff] text-white text-xs font-semibold rounded-xl hover:bg-[#8083ff]/90 disabled:opacity-50 flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-[#8083ff]/10 cursor-pointer"
                >
                  <span>{isSaving ? "Saving..." : "Save Thought"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </aside>
  )
}

