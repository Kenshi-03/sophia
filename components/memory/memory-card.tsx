import React from 'react'
import { Tag } from 'lucide-react'

export interface MemoryNodeItem {
  id: string
  content: string
  category: string
  tags: string[]
  createdAt: string
}

interface MemoryCardProps {
  node: MemoryNodeItem
}

export default function MemoryCard({ node }: MemoryCardProps) {
  const categoryColors: Record<string, string> = {
    Academics: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
    Personal: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400',
    Research: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
  }

  const categoryColor = categoryColors[node.category] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'

  return (
    <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/30 space-y-2 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColor}`}>
          {node.category}
        </span>
        <span className="text-[10px] text-zinc-400">{node.createdAt}</span>
      </div>
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {node.content}
      </p>
      {node.tags && node.tags.length > 0 && (
        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
          <Tag size={10} />
          <span>{node.tags.join(', ')}</span>
        </div>
      )}
    </div>
  )
}
