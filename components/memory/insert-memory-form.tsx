"use client"

import React, { useState, useEffect } from "react"
import { Sparkles, Loader2, X } from "lucide-react"
import { MemoryNode } from "@/stores/use-memory-store"

interface InsertMemoryFormProps {
  onClose: () => void
  onSave: (data: { content: string; category: string; tags: string[] }) => Promise<void>
  isSubmitting: boolean
  editingMemory?: MemoryNode | null
}

export default function InsertMemoryForm({
  onClose,
  onSave,
  isSubmitting,
  editingMemory,
}: InsertMemoryFormProps) {
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("Research")
  const [tagsInput, setTagsInput] = useState("")

  // Pre-fill if editing
  useEffect(() => {
    if (editingMemory) {
      setContent(editingMemory.content)
      setCategory(editingMemory.category)
      setTagsInput(editingMemory.tags.join(", "))
    } else {
      setContent("")
      setCategory("Research")
      setTagsInput("")
    }
  }, [editingMemory])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !category) return

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)

    onSave({ content, category, tags })
  }

  return (
    <div className="glass-panel rounded-3xl p-6 border border-[#c0c1ff]/20 bg-[#1e2023]/60 relative animate-in fade-in-50 zoom-in-95 duration-200">
      <button
        onClick={onClose}
        type="button"
        className="absolute top-4 right-4 text-[#c7c4d7] hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all"
      >
        <X size={16} />
      </button>

      <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Sparkles size={16} className="text-[#c0c1ff]" />
        <span>{editingMemory ? "Edit Memory Node" : "Insert New Cognitive Fact"}</span>
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">
              Category Type
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
            >
              <option value="Research">Research</option>
              <option value="Academics">Academics</option>
              <option value="Personal">Personal</option>
              <option value="Calendar">Calendar</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="web-dev, nextjs, routing"
              className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 placeholder-[#c7c4d7]/30"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">
            Fact Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            required
            placeholder="Declare parsed fact information to commit to permanent memory index..."
            className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 placeholder-[#c7c4d7]/30 resize-none"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#8083ff] hover:bg-[#8083ff]/90 text-white text-xs font-semibold rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition-all duration-200 active:scale-95"
          >
            {isSubmitting && <Loader2 size={12} className="animate-spin" />}
            <span>{editingMemory ? "Update Fact" : "Index Fact"}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
