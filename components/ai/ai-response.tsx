import React from 'react'
import { Bot, Sparkles } from 'lucide-react'

interface AiResponseProps {
  content: string
  agentName?: string
}

export default function AiResponse({ content, agentName = 'Schedule Analyser' }: AiResponseProps) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
        <Bot size={16} />
        <span>{agentName}</span>
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
        <span className="text-zinc-400 font-medium">response generated</span>
      </div>
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {content}
      </p>
    </div>
  )
}
