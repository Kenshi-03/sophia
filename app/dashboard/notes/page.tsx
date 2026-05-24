"use client"

import React, { useState } from "react"
import {
  Plus,
  FolderOpen,
  Trash2,
  Tag,
  X,
  Save,
  Edit2,
  Sparkles,
} from "lucide-react"
import PageHeader from "@/components/shared/page-header"

interface Note {
  id: string
  title: string
  content: string
  category: "Ideas" | "References" | "Reminders"
  notebook: "Personal" | "Research" | "Academics"
  tags: string[]
  updatedAt: string
}

const initialNotes: Note[] = [
  {
    id: "note-1",
    title: "SOPHIA System Architecture Proposal",
    content: "## Core Multi-Agent Flow\n\nDesigning a personal cognitive OS mapping schedules to memory database models. Highlighting multi-agent modules and sub-agent communication.\n\n### abstraction models\n- Router decides query target\n- Context manager formats context\n- Response generator calls LLM via Gemini",
    category: "References",
    notebook: "Research",
    tags: ["sophia", "architecture", "agents"],
    updatedAt: "2 hrs ago",
  },
  {
    id: "note-2",
    title: "Latent Space Vector Synapses Idea",
    content: "## Projection Indexing\n\nUsing cosine similarity for note retrievals. Extract tags as structural metadata, then run a local indexing pass to connect notes directly into the schedule items.",
    category: "Ideas",
    notebook: "Personal",
    tags: ["vector-search", "concepts"],
    updatedAt: "Yesterday",
  },
  {
    id: "note-3",
    title: "Daily Focus & High Load Reminders",
    content: "## Morning checklist\n- Check system cognitive load pill\n- Resolve outstanding calendar conflict items\n- Allocate 90 minutes of deep focus code writing",
    category: "Reminders",
    notebook: "Academics",
    tags: ["checklist", "productivity"],
    updatedAt: "3 days ago",
  },
]

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [activeNotebook, setActiveNotebook] = useState<"All" | "Personal" | "Research" | "Academics">("All")
  
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

  const handleSave = () => {
    if (!editTitle.trim()) return

    const tagsArray = editTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)

    if (isCreating) {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: editTitle,
        content: editContent,
        category: editCategory,
        notebook: editNotebook,
        tags: tagsArray,
        updatedAt: "Just now",
      }
      setNotes([newNote, ...notes])
      setSelectedNote(newNote)
    } else if (selectedNote) {
      const updatedNote: Note = {
        ...selectedNote,
        title: editTitle,
        content: editContent,
        category: editCategory,
        notebook: editNotebook,
        tags: tagsArray,
        updatedAt: "Just now",
      }
      setNotes(notes.map((n) => (n.id === selectedNote.id ? updatedNote : n)))
      setSelectedNote(updatedNote)
    }
    
    setIsEditing(false)
    setIsCreating(false)
  }

  const handleDelete = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotes(notes.filter((n) => n.id !== noteId))
    if (selectedNote?.id === noteId) {
      setSelectedNote(null)
      setIsEditing(false)
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
        <button
          onClick={handleCreateNewClick}
          className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-[#8083ff] text-white rounded-xl text-xs font-semibold hover:bg-[#8083ff]/90 hover:shadow-lg hover:shadow-[#8083ff]/10 transition-all duration-200 active:scale-95"
        >
          <Plus size={14} />
          <span>Create Note</span>
        </button>
      </PageHeader>

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

        {/* Center: Notes Grid & Editor Overlay (Col span: 9) */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          
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
                        <span className="text-[10px] text-[#c7c4d7]/40 font-mono">{note.updatedAt}</span>
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
          {selectedNote || isEditing ? (
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
          ) : null}

        </div>

      </div>
    </div>
  )
}
