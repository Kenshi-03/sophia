"use client"

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
} from "lucide-react"

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
    title: "AI Command",
    href: "/dashboard/ai",
    icon: Brain,
  },
  {
    title: "Permanent Memory",
    href: "/dashboard/memory",
    icon: Brain, // We can also use Brain or another icon since it fits well
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
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#8083ff] text-white hover:bg-[#8083ff]/90 transition-all duration-200 shadow-lg shadow-[#8083ff]/10 active:scale-98">
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

    </aside>
  )
}

