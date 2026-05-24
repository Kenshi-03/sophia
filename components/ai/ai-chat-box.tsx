import React from 'react'
import { Bot, User } from 'lucide-react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AiChatBoxProps {
  messages?: Message[]
}

const defaultMessages: Message[] = [
  { id: '1', role: 'assistant', content: 'Hello! I am ready to process your requests. You can ask me to analyze your calendar, fetch permanent memory logs, or structure focus notes.' },
]

export default function AiChatBox({ messages = defaultMessages }: AiChatBoxProps) {
  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-4">
      {messages.map((message) => {
        const isAssistant = message.role === 'assistant'
        return (
          <div key={message.id} className={`flex gap-3 max-w-[85%] ${isAssistant ? '' : 'ml-auto flex-row-reverse'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
              isAssistant ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'
            }`}>
              {isAssistant ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`p-4 rounded-2xl ${
              isAssistant ? 'bg-zinc-50 dark:bg-zinc-800/50 rounded-tl-none text-zinc-800 dark:text-zinc-200' : 'bg-indigo-600 text-white rounded-tr-none'
            }`}>
              <p className={`text-[10px] font-bold mb-1 ${isAssistant ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-100'}`}>
                {isAssistant ? 'SOPHIA Assistant' : 'You'}
              </p>
              <p className="text-sm leading-relaxed">{message.content}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
