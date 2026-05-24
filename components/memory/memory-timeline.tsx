"use client"

import React from "react"
import MemoryCard from "./memory-card"
import { MemoryNode } from "@/stores/use-memory-store"

interface MemoryTimelineProps {
  nodes: MemoryNode[]
  onEdit?: (node: MemoryNode) => void
  onDelete?: (id: string) => void
}

export default function MemoryTimeline({ nodes, onEdit, onDelete }: MemoryTimelineProps) {
  if (nodes.length === 0) {
    return (
      <div className="text-center py-12 text-xs text-[#c7c4d7]/40">
        No memories match this category filter.
      </div>
    )
  }

  return (
    <div className="relative pl-4 md:pl-6 space-y-6 md:space-y-8 border-l border-white/5">
      {nodes.map((memory, index) => {
        // Style configurations based on category
        const isResearch = memory.category.toLowerCase() === "research"
        const isAcademic = memory.category.toLowerCase() === "academics"

        const nodeDotColorClass = isResearch
          ? "bg-[#adc6ff]"
          : isAcademic
          ? "bg-[#4edea3]"
          : "bg-[#c0c1ff]"

        return (
          <div key={memory.id} className="relative group">
            {/* Connection hook dot indicator on timeline */}
            <span className={`absolute -left-[23px] md:-left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-4 border-[#111316] ${nodeDotColorClass} transition-transform duration-300 group-hover:scale-125 z-10`} />

            <MemoryCard node={memory} onEdit={onEdit} onDelete={onDelete} />

            {/* Connection Line Hook visual connector */}
            {index < nodes.length - 1 && (
              <div className="absolute -left-[16px] md:-left-[24px] top-5 bottom-0 w-px bg-white/5 pointer-events-none" />
            )}
          </div>
        )
      })}
    </div>
  )
}
