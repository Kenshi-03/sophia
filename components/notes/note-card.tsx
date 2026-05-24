import React from 'react'
import { Eye, Edit2, Trash2, Tag } from 'lucide-react'

export interface NoteItem {
  id: string
  title: string
  content: string
  category: string
  updatedAt: string
}

interface NoteCardProps {
  note: NoteItem
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function NoteCard({ note, onView, onEdit, onDelete }: NoteCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <Tag size={10} /> {note.category}
          </span>
          <span className="text-xs text-zinc-400">{note.updatedAt}</span>
        </div>
        <h3 className="font-bold text-base leading-snug text-zinc-800 dark:text-zinc-100">{note.title}</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
          {note.content}
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-zinc-50 dark:border-zinc-800/50 mt-4">
        {onView && (
          <button
            onClick={() => onView(note.id)}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-650 transition-colors"
          >
            <Eye size={14} />
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(note.id)}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-650 transition-colors"
          >
            <Edit2 size={14} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(note.id)}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-rose-600 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
