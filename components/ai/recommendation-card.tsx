import React from 'react'
import { Sparkles, Check } from 'lucide-react'

interface RecommendationCardProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export default function RecommendationCard({
  title,
  description,
  actionLabel,
  onAction,
}: RecommendationCardProps) {
  return (
    <div className="bg-gradient-to-br from-indigo-900 to-violet-950 text-white p-6 rounded-2xl shadow-xl space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="text-indigo-300 animate-pulse" size={20} />
        <h2 className="font-bold text-lg">{title}</h2>
      </div>
      <p className="text-sm text-indigo-200 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            onClick={onAction}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30"
          >
            <Check size={14} />
            <span>{actionLabel}</span>
          </button>
        </div>
      )}
    </div>
  )
}
