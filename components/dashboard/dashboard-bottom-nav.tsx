"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  Brain,
  Database,
  Notebook,
  GraduationCap,
} from "lucide-react"

const bottomMenuItems = [
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
    title: "Classes",
    href: "/dashboard/class-planner",
    icon: GraduationCap,
  },
  {
    title: "AI Command",
    href: "/dashboard/ai",
    icon: Brain,
  },
  {
    title: "Memory",
    href: "/dashboard/memory",
    icon: Database,
  },
  {
    title: "Notes",
    href: "/dashboard/notes",
    icon: Notebook,
  },
]

export default function DashboardBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-white/5 bg-[#111316]/80 backdrop-blur-xl flex items-center justify-around z-40 lg:hidden px-2 pb-safe shadow-2xl">
      {bottomMenuItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex flex-col items-center justify-center flex-1 py-2 text-[9px] font-semibold transition-all duration-200 active:scale-95
              ${isActive ? "text-[#c0c1ff]" : "text-[#c7c4d7]/70 hover:text-white"}
            `}
          >
            {/* Nav Icon with optional indicator */}
            <div className={`relative p-1 rounded-xl transition-all duration-300 ${
              isActive ? "bg-[#c0c1ff]/10" : ""
            }`}>
              <Icon size={18} className={isActive ? "text-[#c0c1ff]" : "text-[#c7c4d7]/70"} />
            </div>
            <span className="mt-1 text-[8px] font-mono leading-none tracking-tight">
              {item.title}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
