import React from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-indigo-950 dark:from-zinc-50 dark:to-zinc-300 bg-clip-text text-transparent">
          {title}
        </h1>
        {description && (
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
    </div>
  )
}
