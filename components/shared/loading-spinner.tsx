import React from 'react'
import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ label = 'Loading cognitive models...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
      <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 tracking-wide uppercase">
        {label}
      </p>
    </div>
  )
}
