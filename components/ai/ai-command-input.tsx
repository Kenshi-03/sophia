'use client'

import React, { useState } from 'react'
import { Send } from 'lucide-react'

interface AiCommandInputProps {
  placeholder?: string
  onSend?: (value: string) => void
}

export default function AiCommandInput({
  placeholder = 'Ask SOPHIA...',
  onSend,
}: AiCommandInputProps) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    if (!value.trim()) return
    onSend?.(value)
    setValue('')
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder={placeholder}
        className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-zinc-900 dark:text-zinc-50"
      />
      <button
        onClick={handleSend}
        className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all shrink-0 shadow-md shadow-indigo-500/10"
      >
        <Send size={16} />
      </button>
    </div>
  )
}
