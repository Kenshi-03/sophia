'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'

interface QuickNoteProps {
  onAddNote?: (content: string) => void
}

export default function QuickNote({ onAddNote }: QuickNoteProps) {
  const [content, setContent] = useState('')

  const handleAdd = () => {
    if (!content.trim()) return
    onAddNote?.(content)
    setContent('')
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-4 space-y-3 shadow-sm">
      <h3 className="font-bold text-sm">Quick Note</h3>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Capture quick thought..."
          className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={handleAdd}
          className="h-8 w-8 rounded-xl bg-indigo-650 text-white flex items-center justify-center bg-indigo-650 hover:bg-indigo-700 transition-all shrink-0"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
