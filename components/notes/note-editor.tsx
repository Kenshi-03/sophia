'use client'

import React, { useState } from 'react'
import { Save } from 'lucide-react'

interface NoteEditorProps {
  initialTitle?: string
  initialContent?: string
  onSave?: (title: string, content: string) => void
}

export default function NoteEditor({
  initialTitle = '',
  initialContent = '',
  onSave,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)

  const handleSave = () => {
    onSave?.(title, content)
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex justify-between items-center pb-2 border-b border-zinc-50 dark:border-zinc-800/50">
        <h3 className="font-bold text-base">Note Editor</h3>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          <Save size={14} />
          <span>Save Note</span>
        </button>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note Title"
          className="w-full px-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing thoughts..."
          rows={6}
          className="w-full px-4 py-3 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
        />
      </div>
    </div>
  )
}
