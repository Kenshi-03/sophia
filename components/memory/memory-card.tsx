"use client"

import React from "react"
import { Tag, Edit2, Trash2, Sparkles } from "lucide-react"
import { MemoryNode } from "@/stores/use-memory-store"

interface MemoryCardProps {
  node: MemoryNode
  onEdit?: (node: MemoryNode) => void
  onDelete?: (id: string) => void
}

export default function MemoryCard({ node, onEdit, onDelete }: MemoryCardProps) {
  const isResearch = node.category.toLowerCase() === "research"
  const isAcademic = node.category.toLowerCase() === "academics"
  const isCalendar = node.category.toLowerCase() === "calendar"

  const chipColorClass = isResearch
    ? "bg-[#adc6ff]/10 text-[#adc6ff]"
    : isAcademic
    ? "bg-[#4edea3]/10 text-[#4edea3]"
    : isCalendar
    ? "bg-[#c0c1ff]/10 text-[#c0c1ff]"
    : "bg-white/5 text-[#c7c4d7]"

  const dateStr =
    typeof node.createdAt === "string" && node.createdAt.includes(",")
      ? node.createdAt
      : new Date(node.createdAt).toLocaleDateString([], {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })

  return (
    <div className="glass-card rounded-2xl p-4 md:p-5 space-y-3 relative group hover:border-[#c0c1ff]/20 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${chipColorClass}`}>
            {node.category}
          </span>
          {node.relevanceScore !== undefined && node.relevanceScore > 0 && (
            <span className="text-[9px] font-mono font-bold bg-[#c0c1ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/30 px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-in fade-in duration-300">
              <Sparkles size={8} className="animate-pulse" />
              <span>{node.relevanceScore}% Match</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#c7c4d7]/40 font-mono">{dateStr}</span>
          
          {/* Actions Menu */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onEdit && (
              <button
                onClick={() => onEdit(node)}
                type="button"
                className="p-1 text-[#c7c4d7]/40 hover:text-white hover:bg-white/5 rounded transition-all cursor-pointer"
                title="Edit Fact"
              >
                <Edit2 size={10} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(node.id)}
                type="button"
                className="p-1 text-[#c7c4d7]/40 hover:text-[#ffb4ab] hover:bg-white/5 rounded transition-all cursor-pointer"
                title="Delete Fact"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-[#e2e2e6] font-medium leading-relaxed group-hover:text-white transition-colors duration-200 pr-10">
        {node.content}
      </p>

      {node.tags && node.tags.length > 0 && (
        <div className="flex items-center gap-2 text-[10px] text-[#c7c4d7]/60 pt-2 border-t border-white/5">
          <Tag size={10} className="text-[#c7c4d7]/40" />
          <div className="flex gap-1.5 flex-wrap">
            {node.tags.map((t, idx) => (
              <span key={idx} className="font-mono">
                #{t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
