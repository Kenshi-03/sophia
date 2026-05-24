'use client'

import React, { useState } from 'react'
import { Search } from 'lucide-react'

interface SemanticSearchProps {
  onSearch?: (value: string) => void
}

export default function SemanticSearch({ onSearch }: SemanticSearchProps) {
  const [value, setValue] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch?.(value)
  }

  return (
    <form onSubmit={handleSearch} className="relative bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm">
      <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-zinc-400">
        <Search size={18} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search memories semantically... (e.g., 'What did I learn about NextJS layout last week?')"
        className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-zinc-900 dark:text-zinc-50"
      />
    </form>
  )
}
