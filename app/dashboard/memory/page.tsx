"use client"

import React, { useState, useEffect } from "react"
import {
  Plus,
  RefreshCw,
  GitBranch,
  Calendar,
  FileText,
} from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import { useMemoryStore, MemoryNode } from "@/stores/use-memory-store"
import SemanticSearch from "@/components/memory/semantic-search"
import InsertMemoryForm from "@/components/memory/insert-memory-form"
import MemoryTimeline from "@/components/memory/memory-timeline"
import { deleteMemoryAction, updateMemoryAction } from "@/app/actions/memories"

export default function PermanentMemoryPage() {
  const { 
    memories, 
    searchQuery, 
    setMemories, 
    addMemory, 
    deleteMemory, 
    updateMemory, 
    setSearchQuery 
  } = useMemoryStore()
  
  const [isSyncing, setIsSyncing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMemory, setEditingMemory] = useState<MemoryNode | null>(null)
  const [activeCategory, setActiveCategory] = useState("All")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load memories on mount
  useEffect(() => {
    fetchMemories()
  }, [])

  // Trigger search when query updates
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchMemories(searchQuery)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const fetchMemories = async () => {
    try {
      setIsSyncing(true)
      const res = await fetch("/api/memory/recent")
      if (res.ok) {
        const data = await res.json()
        setMemories(data)
      }
    } catch (err) {
      console.error("Failed to load memories:", err)
    } finally {
      setIsSyncing(false)
    }
  }

  const searchMemories = async (queryStr: string) => {
    try {
      const res = await fetch(`/api/memory/search?userId=user@sophia.local&query=${encodeURIComponent(queryStr)}`)
      if (res.ok) {
        const data = await res.json()
        setMemories(data)
      }
    } catch (err) {
      console.error("Failed to search memories:", err)
    }
  }

  const handleSaveFact = async (data: { content: string; category: string; tags: string[] }) => {
    try {
      setIsSubmitting(true)
      
      if (editingMemory) {
        // Edit mode
        const res = await updateMemoryAction(editingMemory.id, data)
        if (res && res.success && res.updatedNode) {
          updateMemory({
            id: res.updatedNode.id,
            content: res.updatedNode.content,
            category: res.updatedNode.category,
            tags: res.updatedNode.tags,
            createdAt: res.updatedNode.createdAt,
          })
          setShowAddForm(false)
          setEditingMemory(null)
        }
      } else {
        // Create mode
        const res = await fetch("/api/memory/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: "user@sophia.local",
            content: data.content,
            category: data.category,
            tags: data.tags,
          }),
        })

        if (res.ok) {
          const newFact = await res.json()
          addMemory({
            id: newFact.id,
            content: newFact.content,
            category: newFact.category,
            tags: newFact.tags,
            createdAt: new Date(newFact.createdAt).toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric" }),
          })
          setShowAddForm(false)
        }
      }
    } catch (err) {
      console.error("Failed to save memory fact:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteFact = async (id: string) => {
    if (!confirm("Are you sure you want to delete this memory node?")) return
    
    try {
      // Optimistic update
      deleteMemory(id)
      await deleteMemoryAction(id)
    } catch (err) {
      console.error("Failed to delete memory fact:", err)
      // Refetch to sync state back on error
      fetchMemories()
    }
  }

  const handleEditTrigger = (node: MemoryNode) => {
    setEditingMemory(node)
    setShowAddForm(true)
  }

  const handleCreateTrigger = () => {
    setEditingMemory(null)
    setShowAddForm(true)
  }

  // Filter memories locally by category sidebar selection
  const filteredMemories = memories.filter((m) => {
    if (activeCategory === "All") return true
    return m.category.toLowerCase() === activeCategory.toLowerCase()
  })

  // Get counts for sidebar tags
  const allCount = memories.length
  const calendarCount = memories.filter((m) => m.category.toLowerCase() === "academics" || m.category.toLowerCase() === "calendar").length
  const notesCount = memories.filter((m) => m.category.toLowerCase() === "research" || m.category.toLowerCase() === "personal").length

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Page Header */}
      <PageHeader
        title="Permanent Memory"
        description="Store, catalog, and query semantic associations."
      >
        <button
          onClick={fetchMemories}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white hover:border-[#c0c1ff]/30 transition-all duration-200 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={`text-[#c7c4d7] ${isSyncing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Re-Index Memory</span>
        </button>
        <button
          onClick={handleCreateTrigger}
          className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-[#8083ff] text-white rounded-xl text-xs font-semibold hover:bg-[#8083ff]/90 hover:shadow-lg hover:shadow-[#8083ff]/10 transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>Insert Fact</span>
        </button>
      </PageHeader>

      {/* Semantic Search Box */}
      <SemanticSearch 
        value={searchQuery} 
        onChange={setSearchQuery} 
        onClear={() => setSearchQuery("")} 
      />

      {/* Insert Fact Form (Toggleable card) */}
      {showAddForm && (
        <InsertMemoryForm
          onClose={() => {
            setShowAddForm(false)
            setEditingMemory(null)
          }}
          onSave={handleSaveFact}
          isSubmitting={isSubmitting}
          editingMemory={editingMemory}
        />
      )}

      {/* Grid: Memory Cards & Categories */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Category Sidebar: Sidebar on desktop, horizontal bar on mobile (Col span: 3) */}
        <div className="col-span-12 lg:col-span-3">
          
          {/* Desktop Sidebar filter (Visible on lg layout only) */}
          <div className="hidden lg:block glass-panel rounded-3xl p-4 space-y-3">
            <h2 className="font-bold text-xs text-[#c7c4d7] uppercase tracking-wider">
              Memory Filters
            </h2>
            
            <div className="space-y-1.5">
              <button
                onClick={() => setActiveCategory("All")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  activeCategory === "All"
                    ? "bg-[#c0c1ff]/10 text-[#c0c1ff] font-bold"
                    : "hover:bg-white/5 text-[#c7c4d7]/80"
                }`}
              >
                <span className="flex items-center gap-2"><GitBranch size={14} /> All Logs</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 border border-white/5 rounded-full text-[#c7c4d7]">{allCount}</span>
              </button>

              <button
                onClick={() => setActiveCategory("Research")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  activeCategory === "Research"
                    ? "bg-[#adc6ff]/10 text-[#adc6ff] font-bold"
                    : "hover:bg-white/5 text-[#c7c4d7]/80"
                }`}
              >
                <span className="flex items-center gap-2"><FileText size={14} /> Research Logs</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 border border-white/5 rounded-full text-[#c7c4d7]">{notesCount}</span>
              </button>

              <button
                onClick={() => setActiveCategory("Academics")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  activeCategory === "Academics"
                    ? "bg-[#4edea3]/10 text-[#4edea3] font-bold"
                    : "hover:bg-white/5 text-[#c7c4d7]/80"
                }`}
              >
                <span className="flex items-center gap-2"><Calendar size={14} /> Academic Nodes</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 border border-white/5 rounded-full text-[#c7c4d7]">{calendarCount}</span>
              </button>
            </div>
          </div>

          {/* Mobile Swipable Tab Bar (Visible on mobile/tablet only) */}
          <div className="lg:hidden flex overflow-x-auto gap-2 pb-3 pt-1 scrollbar-none shrink-0 px-1">
            <button
              onClick={() => setActiveCategory("All")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeCategory === "All"
                  ? "bg-[#c0c1ff]/10 border-[#c0c1ff]/20 text-[#c0c1ff]"
                  : "bg-white/[0.01] border-white/5 text-[#c7c4d7]/70"
              }`}
            >
              <GitBranch size={12} />
              <span>All Logs ({allCount})</span>
            </button>

            <button
              onClick={() => setActiveCategory("Research")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeCategory === "Research"
                  ? "bg-[#adc6ff]/10 border-[#adc6ff]/20 text-[#adc6ff]"
                  : "bg-white/[0.01] border-white/5 text-[#c7c4d7]/70"
              }`}
            >
              <FileText size={12} />
              <span>Research ({notesCount})</span>
            </button>

            <button
              onClick={() => setActiveCategory("Academics")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeCategory === "Academics"
                  ? "bg-[#4edea3]/10 border-[#4edea3]/20 text-[#4edea3]"
                  : "bg-white/[0.01] border-white/5 text-[#c7c4d7]/70"
              }`}
            >
              <Calendar size={12} />
              <span>Academics ({calendarCount})</span>
            </button>
          </div>

        </div>

        {/* Memory Node Feed (Col span: 9) */}
        <div className="col-span-12 lg:col-span-9 space-y-4">
          <div className="glass-panel rounded-3xl p-4 md:p-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <h3 className="font-bold text-sm text-white">Active Memory Nodes</h3>
              <span className="text-[10px] text-[#c7c4d7]/50 font-mono">
                Showing {filteredMemories.length} entries
              </span>
            </div>

            <MemoryTimeline 
              nodes={filteredMemories} 
              onEdit={handleEditTrigger} 
              onDelete={handleDeleteFact} 
            />

          </div>
        </div>

      </div>
    </div>
  )
}
