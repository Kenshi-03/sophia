"use client"

import React, { useState, useEffect } from "react"
import {
  Plus,
  FolderOpen,
  Trash2,
  Tag,
  X,
  Save,
  Edit2,
  Sparkles,
  Loader2,
} from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import {
  getNotesAction,
  createNoteAction,
  updateNoteAction,
  deleteNoteAction
} from "@/app/actions/notes"
import {
  getThoughtsAction,
  createThoughtAction,
  deleteThoughtAction
} from "@/app/actions/thoughts"

interface Note {
  id: string
  title: string
  content: string
  category: "Ideas" | "References" | "Reminders"
  notebook: "Personal" | "Research" | "Academics"
  tags: string[]
  updatedAt: string
}

interface Thought {
  id: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })
  } catch {
    return dateStr
  }
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNotebook, setActiveNotebook] = useState<"All" | "Personal" | "Research" | "Academics">("All")
  const [isLoading, setIsLoading] = useState(true)
  
  // Editor States
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Form fields
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editCategory, setEditCategory] = useState<"Ideas" | "References" | "Reminders">("Ideas")
  const [editNotebook, setEditNotebook] = useState<"Personal" | "Research" | "Academics">("Personal")
  const [editTags, setEditTags] = useState("")

  // Thoughts States
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [isThoughtsLoading, setIsThoughtsLoading] = useState(true)
  const [hasMoreThoughts, setHasMoreThoughts] = useState(false)
  const [thoughtsOffset, setThoughtsOffset] = useState(0)
  const THOUGHTS_LIMIT = 20

  // Thought Modal states
  const [isThoughtModalOpen, setIsThoughtModalOpen] = useState(false)
  const [newThoughtContent, setNewThoughtContent] = useState("")
  const [newThoughtTags, setNewThoughtTags] = useState("")
  const [isSavingThought, setIsSavingThought] = useState(false)
  const [thoughtError, setThoughtError] = useState("")

  // Fetch Notes & Thoughts on Mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true)
        setIsThoughtsLoading(true)
        
        const [notesRes, thoughtsRes] = await Promise.all([
          getNotesAction(),
          getThoughtsAction(THOUGHTS_LIMIT, 0)
        ])
        
        if (notesRes.success && notesRes.notes) {
          setNotes(notesRes.notes as any[])
        }
        
        if (thoughtsRes.success && thoughtsRes.thoughts) {
          setThoughts(thoughtsRes.thoughts as any[])
          setHasMoreThoughts(!!thoughtsRes.hasMore)
          setThoughtsOffset(thoughtsRes.thoughts.length)
        }
      } catch (err) {
        console.error("Failed to load initial data:", err)
      } finally {
        setIsLoading(false)
        setIsThoughtsLoading(false)
      }
    }
    loadInitialData()
  }, [])

  const handleOpenNote = (note: Note, editMode = false) => {
    setSelectedNote(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditCategory(note.category)
    setEditNotebook(note.notebook)
    setEditTags(note.tags.join(", "))
    setIsEditing(editMode)
    setIsCreating(false)
  }

  const handleCreateNewClick = () => {
    setSelectedNote(null)
    setEditTitle("")
    setEditContent("")
    setEditCategory("Ideas")
    setEditNotebook("Personal")
    setEditTags("")
    setIsEditing(true)
    setIsCreating(true)
  }

  const handleSave = async () => {
    if (!editTitle.trim()) return

    const tagsArray = editTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)

    try {
      setIsLoading(true)
      if (isCreating) {
        const res = await createNoteAction({
          title: editTitle,
          content: editContent,
          category: editCategory,
          notebook: editNotebook,
          tags: tagsArray,
        })
        if (res.success && res.note) {
          const newNote = res.note as any
          setNotes([newNote, ...notes])
          setSelectedNote(newNote)
        }
      } else if (selectedNote) {
        const res = await updateNoteAction(selectedNote.id, {
          title: editTitle,
          content: editContent,
          category: editCategory,
          notebook: editNotebook,
          tags: tagsArray,
        })
        if (res.success && res.note) {
          const updatedNote = res.note as any
          setNotes(notes.map((n) => (n.id === selectedNote.id ? updatedNote : n)))
          setSelectedNote(updatedNote)
        }
      }
    } catch (err) {
      console.error("Failed to save note:", err)
    } finally {
      setIsLoading(false)
      setIsEditing(false)
      setIsCreating(false)
    }
  }

  const handleDelete = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this note?")) return

    try {
      setIsLoading(true)
      const res = await deleteNoteAction(noteId)
      if (res.success) {
        setNotes(notes.filter((n) => n.id !== noteId))
        if (selectedNote?.id === noteId) {
          setSelectedNote(null)
          setIsEditing(false)
        }
      }
    } catch (err) {
      console.error("Failed to delete note:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Thoughts Actions
  const loadMoreThoughts = async () => {
    if (isThoughtsLoading || !hasMoreThoughts) return
    
    try {
      setIsThoughtsLoading(true)
      const res = await getThoughtsAction(THOUGHTS_LIMIT, thoughtsOffset)
      if (res.success && res.thoughts) {
        setThoughts((prev) => [...prev, ...(res.thoughts as any[])])
        setHasMoreThoughts(!!res.hasMore)
        setThoughtsOffset((prev) => prev + (res.thoughts?.length || 0))
      }
    } catch (err) {
      console.error("Failed to load more thoughts:", err)
    } finally {
      setIsThoughtsLoading(false)
    }
  }

  const handleSaveThought = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThoughtContent.trim()) return

    const tagsArray = newThoughtTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)

    const tempId = `temp-${Date.now()}`
    const tempThought: Thought = {
      id: tempId,
      content: newThoughtContent.trim(),
      tags: tagsArray,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Optimistic UI Update: Prepend temporary thought, close modal
    setThoughts((prev) => [tempThought, ...prev])
    setThoughtsOffset((prev) => prev + 1)
    setIsThoughtModalOpen(false)
    
    const savedContent = newThoughtContent
    const savedTags = newThoughtTags
    
    setNewThoughtContent("")
    setNewThoughtTags("")
    setThoughtError("")

    try {
      const res = await createThoughtAction(savedContent, tagsArray)
      if (res.success && res.thought) {
        // Replace temp thought with the persisted database thought
        setThoughts((prev) =>
          prev.map((t) => (t.id === tempId ? (res.thought as any) : t))
        )
      } else {
        // Revert UI, restore input values, reopen modal, show error
        setThoughts((prev) => prev.filter((t) => t.id !== tempId))
        setThoughtsOffset((prev) => Math.max(0, prev - 1))
        setNewThoughtContent(savedContent)
        setNewThoughtTags(savedTags)
        setThoughtError(res.error || "Failed to save thought. Please try again.")
        setIsThoughtModalOpen(true)
      }
    } catch (err: any) {
      // Revert UI on error
      setThoughts((prev) => prev.filter((t) => t.id !== tempId))
      setThoughtsOffset((prev) => Math.max(0, prev - 1))
      setNewThoughtContent(savedContent)
      setNewThoughtTags(savedTags)
      setThoughtError(err.message || "An unexpected error occurred.")
      setIsThoughtModalOpen(true)
    }
  }

  const handleDeleteThought = async (thoughtId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this thought?")) return

    // Find the thought to revert to in case of failure
    const thoughtToDelete = thoughts.find((t) => t.id === thoughtId)
    if (!thoughtToDelete) return

    // Optimistic UI Update: Remove from UI immediately
    setThoughts((prev) => prev.filter((t) => t.id !== thoughtId))
    setThoughtsOffset((prev) => Math.max(0, prev - 1))

    try {
      const res = await deleteThoughtAction(thoughtId)
      if (!res.success) {
        // Revert UI: Add the thought back to its index
        setThoughts((prev) => {
          const updated = [...prev, thoughtToDelete]
          return updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        })
        setThoughtsOffset((prev) => prev + 1)
        alert(res.error || "Failed to delete thought.")
      }
    } catch (err) {
      // Revert UI on error
      setThoughts((prev) => {
        const updated = [...prev, thoughtToDelete]
        return updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      })
      setThoughtsOffset((prev) => prev + 1)
      console.error("Failed to delete thought:", err)
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      
      if (diffMs < 60000) return "Just now"
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 60) return `${diffMins}m ago`
      
      const isToday = d.toDateString() === now.toDateString()
      const padZero = (n: number) => n.toString().padStart(2, '0')
      const timeStr = `${padZero(d.getHours())}:${padZero(d.getMinutes())}`
      
      if (isToday) {
        return `Today ${timeStr}`
      }
      
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      const isYesterday = d.toDateString() === yesterday.toDateString()
      if (isYesterday) {
        return `Yesterday ${timeStr}`
      }
      
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ` ${timeStr}`
    } catch {
      return dateStr
    }
  }

  // Filter notes based on active notebook folder selection
  const filteredNotes = notes.filter((n) => {
    if (activeNotebook === "All") return true
    return n.notebook === activeNotebook
  })

  // Get accent styles for notes
  const getNoteAccentStyles = (category: "Ideas" | "References" | "Reminders") => {
    switch (category) {
      case "Ideas":
        return {
          text: "text-[#c0c1ff]",
          bg: "bg-[#c0c1ff]/10 border-[#c0c1ff]/20",
          accentColor: "#c0c1ff",
        }
      case "References":
        return {
          text: "text-[#adc6ff]",
          bg: "bg-[#adc6ff]/10 border-[#adc6ff]/20",
          accentColor: "#adc6ff",
        }
      case "Reminders":
        return {
          text: "text-[#4edea3]",
          bg: "bg-[#4edea3]/10 border-[#4edea3]/20",
          accentColor: "#4edea3",
        }
    }
  }

  // Notebook items list counts
  const personalCount = notes.filter((n) => n.notebook === "Personal").length
  const researchCount = notes.filter((n) => n.notebook === "Research").length
  const academicsCount = notes.filter((n) => n.notebook === "Academics").length

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Page Header */}
      <PageHeader
        title="Notes & Thoughts"
        description="Capture knowledge, structure info, and index items."
      >
        <div className="flex gap-2">
          <button
            onClick={handleCreateNewClick}
            className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-[#8083ff] text-white rounded-xl text-xs font-semibold hover:bg-[#8083ff]/90 hover:shadow-lg hover:shadow-[#8083ff]/10 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Note</span>
          </button>
          <button
            onClick={() => setIsThoughtModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 border border-white/5 bg-white/5 text-[#c7c4d7] hover:text-white rounded-xl text-xs font-semibold hover:bg-white/10 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>Quick Thought</span>
          </button>
        </div>
      </PageHeader>

      {/* Cognitive Role Explanation */}
      <div className="glass-panel rounded-2xl p-4 border border-white/5 bg-white/[0.01] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#c7c4d7]/90">
        <div className="flex gap-3">
          <div className="p-2 rounded-lg bg-[#8083ff]/10 text-[#c0c1ff] h-fit">
            <FolderOpen size={16} />
          </div>
          <div>
            <h4 className="font-semibold text-white mb-0.5 text-xs">Notes</h4>
            <p className="leading-relaxed text-[#c7c4d7]/70 text-[11px]">
              Structured long-term knowledge and organized information. Uses titles, folders, categories, and markdown formatting. Highly prioritiable for retrieval.
            </p>
          </div>
        </div>
        <div className="flex gap-3 border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-4">
          <div className="p-2 rounded-lg bg-[#4edea3]/10 text-[#4edea3] h-fit">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="font-semibold text-white mb-0.5 text-xs">Thoughts</h4>
            <p className="leading-relaxed text-[#c7c4d7]/70 text-[11px]">
              Quick cognition captures, ideas, stream-of-consciousness, and episodic reasoning traces. Capture instantly with zero friction.
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Notebook Sidebar (Col span: 3 on desktop, horizontal bar on mobile) */}
        <div className="col-span-12 lg:col-span-3">
          
          {/* Desktop Sidebar filter (Visible on lg layout only) */}
          <div className="hidden lg:block glass-panel rounded-3xl p-4 space-y-3">
            <h2 className="font-bold text-xs text-[#c7c4d7] uppercase tracking-wider">
              Notebook Folders
            </h2>
            
            <div className="space-y-1">
              <button
                onClick={() => setActiveNotebook("All")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                  activeNotebook === "All"
                    ? "bg-[#c0c1ff]/10 text-[#c0c1ff] font-bold"
                    : "hover:bg-white/5 text-[#c7c4d7]/85"
                }`}
              >
                <span className="flex items-center gap-2"><FolderOpen size={14} /> All Notebooks</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 rounded-full">{notes.length}</span>
              </button>

              <button
                onClick={() => setActiveNotebook("Personal")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                  activeNotebook === "Personal"
                    ? "bg-[#c0c1ff]/10 text-[#c0c1ff] font-bold"
                    : "hover:bg-white/5 text-[#c7c4d7]/85"
                }`}
              >
                <span className="flex items-center gap-2"><FolderOpen size={14} /> Personal</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 rounded-full">{personalCount}</span>
              </button>

              <button
                onClick={() => setActiveNotebook("Research")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                  activeNotebook === "Research"
                    ? "bg-[#adc6ff]/10 text-[#adc6ff] font-bold"
                    : "hover:bg-white/5 text-[#c7c4d7]/85"
                }`}
              >
                <span className="flex items-center gap-2"><FolderOpen size={14} /> Research</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 rounded-full">{researchCount}</span>
              </button>

              <button
                onClick={() => setActiveNotebook("Academics")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                  activeNotebook === "Academics"
                    ? "bg-[#4edea3]/10 text-[#4edea3] font-bold"
                    : "hover:bg-white/5 text-[#c7c4d7]/85"
                }`}
              >
                <span className="flex items-center gap-2"><FolderOpen size={14} /> Academics</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 rounded-full">{academicsCount}</span>
              </button>
            </div>
          </div>

          {/* Mobile Swipable Tab Bar (Visible on mobile/tablet only) */}
          <div className="lg:hidden flex overflow-x-auto gap-2 pb-3 pt-1 scrollbar-none shrink-0 px-1">
            <button
              onClick={() => setActiveNotebook("All")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeNotebook === "All"
                  ? "bg-[#c0c1ff]/10 border-[#c0c1ff]/20 text-[#c0c1ff]"
                  : "bg-white/[0.01] border-white/5 text-[#c7c4d7]/70"
              }`}
            >
              <FolderOpen size={12} />
              <span>All Notebooks ({notes.length})</span>
            </button>

            <button
              onClick={() => setActiveNotebook("Personal")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeNotebook === "Personal"
                  ? "bg-[#c0c1ff]/10 border-[#c0c1ff]/20 text-[#c0c1ff]"
                  : "bg-white/[0.01] border-white/5 text-[#c7c4d7]/70"
              }`}
            >
              <FolderOpen size={12} />
              <span>Personal ({personalCount})</span>
            </button>

            <button
              onClick={() => setActiveNotebook("Research")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeNotebook === "Research"
                  ? "bg-[#adc6ff]/10 border-[#adc6ff]/20 text-[#adc6ff]"
                  : "bg-white/[0.01] border-white/5 text-[#c7c4d7]/70"
              }`}
            >
              <FolderOpen size={12} />
              <span>Research ({researchCount})</span>
            </button>

            <button
              onClick={() => setActiveNotebook("Academics")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeNotebook === "Academics"
                  ? "bg-[#4edea3]/10 border-[#4edea3]/20 text-[#4edea3]"
                  : "bg-white/[0.01] border-white/5 text-[#c7c4d7]/70"
              }`}
            >
              <FolderOpen size={12} />
              <span>Academics ({academicsCount})</span>
            </button>
          </div>

        </div>

        {/* Center/Right Workspace (Col span: 9) */}
        <div className="col-span-12 lg:col-span-9 grid grid-cols-12 gap-6">
          
          {/* Notes Workspace (Col-span: 8 on xl+, 12 on mobile/tablet) */}
          <div className="col-span-12 xl:col-span-8 space-y-6">
            
            {/* Note Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotes.length === 0 ? (
                <div className="col-span-2 text-center py-12 glass-panel rounded-3xl text-xs text-[#c7c4d7]/40">
                  This notebook is empty. Create a new note to start writing.
                </div>
              ) : (
                filteredNotes.map((note, index) => {
                  const styles = getNoteAccentStyles(note.category)
                  return (
                    <div
                      key={note.id}
                      onClick={() => handleOpenNote(note)}
                      className="glass-card rounded-2xl p-5 flex flex-col justify-between h-44 hover:shadow-lg transition-all duration-300 cursor-pointer relative group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${styles.bg} ${styles.text} flex items-center gap-1`}>
                            <Tag size={8} /> {note.category}
                          </span>
                          <span className="text-[10px] text-[#c7c4d7]/40 font-mono">{formatDate(note.updatedAt)}</span>
                        </div>
                        
                        <h3 className="font-bold text-sm text-white group-hover:text-[#c0c1ff] transition-colors line-clamp-1">
                          {note.title}
                        </h3>
                        <p className="text-xs text-[#c7c4d7]/70 line-clamp-3 leading-relaxed">
                          {note.content.replace(/#+\s/g, "").slice(0, 120)}...
                        </p>
                      </div>

                      <div className="flex justify-between items-end border-t border-white/5 pt-3 mt-4">
                        <div className="flex gap-1 overflow-hidden max-w-[65%]">
                          {note.tags.slice(0, 2).map((t, idx) => (
                            <span key={idx} className="text-[9px] text-[#c7c4d7]/50 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                              #{t}
                            </span>
                          ))}
                        </div>

                        {/* Visual note latent projection graphics */}
                        <svg className="h-4 w-16 opacity-30 group-hover:opacity-75 transition-opacity" viewBox="0 0 70 15">
                          <path
                            d={index % 2 === 0 ? "M 0 5 Q 15 15, 35 3 T 70 10" : "M 0 10 Q 20 2, 45 13 T 70 5"}
                            fill="none"
                            stroke={styles.accentColor}
                            strokeWidth="1.5"
                          />
                          <circle cx={index % 2 === 0 ? 35 : 45} cy={index % 2 === 0 ? 3 : 13} r="2.5" fill={styles.accentColor} />
                        </svg>
                      </div>

                      {/* Hover delete trigger */}
                      <button
                        onClick={(e) => handleDelete(note.id, e)}
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1 text-[#c7c4d7]/40 hover:text-[#ffb4ab] hover:bg-white/5 rounded transition-all duration-200"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Interactive Note Editor Panel Overlay */}
            {(selectedNote || isEditing) && (
              <div className="glass-panel rounded-3xl p-5 md:p-6 relative animate-in fade-in-50 duration-200">
                <button
                  onClick={() => {
                    setSelectedNote(null)
                    setIsEditing(false)
                  }}
                  className="absolute top-4 right-4 text-[#c7c4d7] hover:text-white p-1 hover:bg-white/5 rounded-lg"
                >
                  <X size={16} />
                </button>

                {isEditing ? (
                  /* Editable form state */
                  <div className="space-y-4">
                    <div className="border-b border-white/5 pb-3">
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles size={16} className="text-[#c0c1ff]" />
                        <span>{isCreating ? "Draft New Note" : `Editing Note`}</span>
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Note Title"
                          className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as "Ideas" | "References" | "Reminders")}
                          className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                        >
                          <option value="Ideas">Ideas</option>
                          <option value="References">References</option>
                          <option value="Reminders">Reminders</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Notebook</label>
                        <select
                          value={editNotebook}
                          onChange={(e) => setEditNotebook(e.target.value as "Personal" | "Research" | "Academics")}
                          className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                        >
                          <option value="Personal">Personal</option>
                          <option value="Research">Research</option>
                          <option value="Academics">Academics</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Tags (comma separated)</label>
                      <input
                        type="text"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="sophia, vector, ai"
                        className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Markdown Editor</label>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={6}
                        placeholder="# Write your markdown notes here..."
                        className="w-full bg-[#111316] border border-white/5 rounded-xl px-4 py-3 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false)
                          if (isCreating) setSelectedNote(null)
                        }}
                        className="px-4 py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="px-4 py-2 bg-[#8083ff] text-white text-xs font-semibold rounded-xl hover:bg-[#8083ff]/90 flex items-center gap-1.5"
                      >
                        <Save size={12} />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Static view note state */
                  selectedNote && (
                    <div className="space-y-4">
                      <div className="border-b border-white/5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-[#c0c1ff] bg-[#c0c1ff]/10 px-2 py-0.5 rounded">
                            {selectedNote.category} • Notebook: {selectedNote.notebook}
                          </span>
                          <h2 className="text-base md:text-lg font-bold text-white mt-1">
                            {selectedNote.title}
                          </h2>
                        </div>
                        <button
                          onClick={() => handleOpenNote(selectedNote, true)}
                          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 border border-white/5 bg-white/5 text-[10px] font-semibold rounded-xl text-[#c7c4d7] hover:text-white transition-all active:scale-95"
                        >
                          <Edit2 size={10} />
                          <span>Edit Note</span>
                        </button>
                      </div>

                      <div className="prose prose-invert max-w-none text-xs text-[#e2e2e6]/90 space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
                        {selectedNote.content.split("\n").map((line, idx) => {
                          if (line.startsWith("## ")) {
                            return <h3 key={idx} className="text-sm font-bold text-white pt-2">{line.replace("## ", "")}</h3>
                          }
                          if (line.startsWith("- ")) {
                            return <li key={idx} className="list-disc pl-4">{line.replace("- ", "")}</li>
                          }
                          return <p key={idx} className="leading-relaxed">{line}</p>
                        })}
                      </div>

                      {selectedNote.tags.length > 0 && (
                        <div className="flex gap-1.5 pt-4 border-t border-white/5">
                          {selectedNote.tags.map((t, idx) => (
                            <span key={idx} className="text-[10px] text-[#c7c4d7]/60 font-mono bg-white/5 px-2 py-0.5 rounded-lg border border-white/[0.03]">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

          </div>

          {/* Recent Thoughts Stream (Col-span: 4 on xl+, 12 on mobile/tablet) */}
          <div className="col-span-12 xl:col-span-4 space-y-4">
            <div className="glass-panel rounded-3xl p-5 space-y-4 flex flex-col h-full min-h-[400px]">
              
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-bold text-xs text-[#c7c4d7] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[#4edea3]" />
                  <span>Recent Thoughts</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#4edea3]/10 text-[#4edea3] rounded-full">
                  {thoughts.length}
                </span>
              </div>

              {/* Thoughts Stream Timeline */}
              <div className="relative pl-4 border-l border-white/5 space-y-4 overflow-y-auto pr-1 flex-1 max-h-[500px] scrollbar-thin">
                {thoughts.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#c7c4d7]/40 pl-0 border-l-0 leading-relaxed max-w-[200px] mx-auto">
                    Capture quick ideas, reasoning traces, or temporary cognitive insights.
                  </div>
                ) : (
                  thoughts.map((thought) => (
                    <div key={thought.id} className="relative group/thought animate-in fade-in duration-200">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#4edea3]/70 border border-[#111316] group-hover/thought:bg-[#4edea3] transition-colors" />
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#c7c4d7]/40 font-mono">
                            {formatRelativeTime(thought.createdAt)}
                          </span>
                          
                          {/* Hide delete button for temp/optimistic thoughts */}
                          {!thought.id.startsWith("temp-") && (
                            <button
                              onClick={(e) => handleDeleteThought(thought.id, e)}
                              className="opacity-0 group-hover/thought:opacity-100 p-0.5 text-[#c7c4d7]/40 hover:text-[#ffb4ab] rounded transition-all cursor-pointer"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-[#e2e2e6] leading-relaxed break-words font-sans">
                          {thought.content}
                        </p>

                        {thought.tags && thought.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {thought.tags.map((t, idx) => (
                              <span key={idx} className="text-[9px] text-[#4edea3]/75 font-mono">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Load More Button */}
              {hasMoreThoughts && (
                <button
                  onClick={loadMoreThoughts}
                  disabled={isThoughtsLoading}
                  className="w-full text-center py-2 text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/60 hover:text-white border border-white/5 bg-white/[0.01] hover:bg-white/5 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  {isThoughtsLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={10} />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <span>Load More Thoughts</span>
                  )}
                </button>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* Quick Thought Modal */}
      {isThoughtModalOpen && (
        <div className="fixed inset-0 bg-[#0b0c0e]/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md mx-4 rounded-3xl p-6 relative shadow-2xl border border-white/10 animate-in scale-in duration-200">
            <button
              onClick={() => {
                setIsThoughtModalOpen(false)
                setThoughtError("")
              }}
              className="absolute top-4 right-4 text-[#c7c4d7] hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
            >
              <X size={16} />
            </button>

            <form onSubmit={handleSaveThought} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Sparkles size={16} className="text-[#4edea3]" />
                <h3 className="font-bold text-sm text-white">Capture Quick Thought</h3>
              </div>

              {thoughtError && (
                <div className="text-xs text-[#ffb4ab] bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 p-3 rounded-xl">
                  {thoughtError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">What are you thinking about?</label>
                <textarea
                  value={newThoughtContent}
                  onChange={(e) => setNewThoughtContent(e.target.value)}
                  rows={4}
                  placeholder="Capture a quick thought or task..."
                  required
                  autoFocus
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-sans resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newThoughtTags}
                  onChange={(e) => setNewThoughtTags(e.target.value)}
                  placeholder="ideas, coding, reminder"
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsThoughtModalOpen(false)
                    setThoughtError("")
                  }}
                  className="px-4 py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingThought}
                  className="px-4 py-2 bg-[#8083ff] text-white text-xs font-semibold rounded-xl hover:bg-[#8083ff]/90 disabled:opacity-50 flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-[#8083ff]/10 cursor-pointer"
                >
                  <span>{isSavingThought ? "Saving..." : "Save Thought"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
