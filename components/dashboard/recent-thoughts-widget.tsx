import React from "react"
import { Layers, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { MemoryNode } from "@/types/memory"

interface RecentThoughtsWidgetProps {
  memories: MemoryNode[]
}

export default function RecentThoughtsWidget({ memories }: RecentThoughtsWidgetProps) {
  // Helpers to get styles depending on categories
  const getCategoryStyles = (category: string) => {
    const lower = category.toLowerCase()
    if (lower === "research") {
      return {
        text: "text-[#adc6ff]",
        bg: "bg-[#adc6ff]/10",
        accent: "#adc6ff",
      }
    }
    if (lower === "academics") {
      return {
        text: "text-[#4edea3]",
        bg: "bg-[#4edea3]/10",
        accent: "#4edea3",
      }
    }
    return {
      text: "text-[#c0c1ff]",
      bg: "bg-[#c0c1ff]/10",
      accent: "#c0c1ff",
    }
  }

  return (
    <div className="col-span-12 lg:col-span-7 glass-panel rounded-3xl p-6 flex flex-col justify-between hover:border-[#c0c1ff]/20 hover:scale-[1.01] transition-all duration-300">
      <div>
        <h3 className="text-sm font-bold text-[#e2e2e6] tracking-wide flex items-center gap-2">
          <Layers size={16} className="text-[#adc6ff]" />
          <span>Proyeksi Latent Terkini</span>
        </h3>
        <p className="text-xs text-[#c7c4d7]/50 mt-1">
          Asosiasi semantik yang terindeks dalam memori permanen.
        </p>
      </div>

      {/* Grid Layout inside bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        {memories.length === 0 ? (
          <div className="col-span-2 text-xs text-[#c7c4d7]/50 py-6 text-center">
            Memori permanen kosong. Buat catatan untuk mengindeks fakta.
          </div>
        ) : (
          memories.map((memory, i) => {
            const styles = getCategoryStyles(memory.category)
            const dateStr = new Date(memory.createdAt).toLocaleDateString([], {
              month: "short",
              day: "2-digit",
            })

            return (
              <div
                key={memory.id}
                className="p-4 border border-white/5 hover:border-[#c0c1ff]/20 rounded-2xl bg-white/[0.02] flex flex-col justify-between h-36 group/card hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${styles.bg} ${styles.text}`}>
                      {memory.category}
                    </span>
                    <span className="text-[9px] text-[#c7c4d7]/40 font-mono">
                      {dateStr}
                    </span>
                  </div>
                  <p className="text-xs text-[#e2e2e6] font-medium leading-relaxed line-clamp-3 group-hover/card:text-white transition-colors duration-200">
                    {memory.content}
                  </p>
                </div>

                <div className="flex justify-between items-end border-t border-white/5 pt-2">
                  <div className="flex gap-1 overflow-hidden max-w-[65%]">
                    {memory.tags.slice(0, 2).map((t, idx) => (
                      <span key={idx} className="text-[8px] text-[#c7c4d7]/60 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>

                  {/* SVG graphic representation of vector projection */}
                  <svg className="h-4 w-12 text-[#adc6ff]/20 group-hover/card:text-white transition-colors duration-300" viewBox="0 0 50 15" style={{ color: styles.accent }}>
                    <path
                      d={i % 2 === 0 ? "M 0 5 Q 12 15, 25 3 T 50 10" : "M 0 10 Q 15 2, 30 13 T 50 5"}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <circle cx={i % 2 === 0 ? 25 : 30} cy={i % 2 === 0 ? 3 : 13} r="2.5" className="fill-current" />
                  </svg>
                </div>
              </div>
            )
          })
        )}
      </div>

      <Link
        href="/dashboard/memory"
        className="text-xs text-[#c0c1ff] hover:text-white flex items-center gap-1 font-semibold transition-colors group/link"
      >
        <span>Query Memori Permanen</span>
        <ArrowUpRight size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
      </Link>
    </div>
  )
}
