import React from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  title = 'No entries found',
  description = 'Add a new element or recheck the filters to get started.',
  icon = <Inbox size={32} className="text-zinc-300 dark:text-zinc-700" />,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/20 dark:bg-zinc-950/10 space-y-4 max-w-sm mx-auto">
      <div className="p-3 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-full">{icon}</div>
      <div className="space-y-1">
        <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{title}</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
