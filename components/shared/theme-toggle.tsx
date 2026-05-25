"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Wait until mounted on client to render theme-dependent icons
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render a matching empty placeholder during SSR to prevent mismatch
    return (
      <div className="h-9 w-9 rounded-lg border border-transparent p-2" />
    )
  }

  return (
    <button
      onClick={() =>
        setTheme(theme === "dark" ? "light" : "dark")
      }
      className="
        rounded-lg border p-2 transition-colors
        hover:bg-muted cursor-pointer
      "
    >
      {theme === "dark" ? (
        <Sun size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>
  )
}