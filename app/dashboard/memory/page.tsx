"use client"

import React, { useState, useEffect } from "react"
import {
  Search,
  Tag,
  Plus,
  RefreshCw,
  GitBranch,
  Calendar,
  FileText,
  X,
  Sparkles,
  Loader2,
} from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import { useMemoryStore } from "@/stores/use-memory-store"

export default function PermanentMemoryPage() {
  const { memories, searchQuery, setMemories, addMemory, setSearchQuery } = useMemoryStore()
  
  const [isSyncing, setIsSyncing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeCategory, setActiveCategory] = useState("All")
  
  // Form fields
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("Research")
  const [tagsInput, setTagsInput] = useState("")
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

  const handleInsertFact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !category) return

    try {
      setIsSubmitting(true)
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)

      const res = await fetch("/api/memory/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "user@sophia.local",
          content,
          category,
          tags,
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
        
        // Reset form
        setContent("")
        setTagsInput("")
        setShowAddForm(false)
      }
    } catch (err) {
      console.error("Failed to insert fact:", err)
    } finally {
      setIsSubmitting(false)
    }
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
          className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white hover:border-[#c0c1ff]/30 transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw size={14} className={`text-[#c7c4d7] ${isSyncing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Re-Index Memory</span>
        </button>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-[#8083ff] text-white rounded-xl text-xs font-semibold hover:bg-[#8083ff]/90 hover:shadow-lg hover:shadow-[#8083ff]/10 transition-all duration-200 active:scale-95"
        >
          <Plus size={14} />
          <span>Insert Fact</span>
        </button>
      </PageHeader>

      {/* Semantic Search Box */}
      <div className="relative glass-panel rounded-2xl p-2 ai-glow transition-all duration-300">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[#c7c4d7]/50">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Search memories semantically... (e.g., "What did I learn about NextJS?")'
          className="w-full pl-11 pr-4 py-3 bg-[#111316]/50 border border-white/[0.03] focus:border-[#c0c1ff]/30 rounded-xl text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/15 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-5 flex items-center text-[#c7c4d7]/50 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Insert Fact Form (Toggleable card) */}
      {showAddForm && (
        <div className="glass-panel rounded-3xl p-6 border border-[#c0c1ff]/20 bg-[#1e2023]/60 relative animate-in fade-in-50 zoom-in-95 duration-200">
          <button
            onClick={() => setShowAddForm(false)}
            className="absolute top-4 right-4 text-[#c7c4d7] hover:text-white p-1 hover:bg-white/5 rounded-lg"
          >
            <X size={16} />
          </button>
          
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-[#c0c1ff]" />
            <span>Insert New Cognitive Fact</span>
          </h2>

          <form onSubmit={handleInsertFact} className="space-y-4">
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
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#8083ff] hover:bg-[#8083ff]/90 text-white text-xs font-semibold rounded-xl disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                <span>Index Fact</span>
              </button>
            </div>
          </form>
        </div>
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
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
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
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
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
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
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

            {filteredMemories.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#c7c4d7]/40">
                No memories match this category filter.
              </div>
            ) : (
              <div className="relative pl-4 md:pl-6 space-y-6 md:space-y-8 border-l border-white/5">
                
                {filteredMemories.map((memory, index) => {
                  // Style configurations based on category
                  const isResearch = memory.category.toLowerCase() === "research"
                  const isAcademic = memory.category.toLowerCase() === "academics"
                  
                  const chipColorClass = isResearch
                    ? "bg-[#adc6ff]/10 text-[#adc6ff]"
                    : isAcademic
                    ? "bg-[#4edea3]/10 text-[#4edea3]"
                    : "bg-[#c0c1ff]/10 text-[#c0c1ff]"

                  const nodeDotColorClass = isResearch
                    ? "bg-[#adc6ff]"
                    : isAcademic
                    ? "bg-[#4edea3]"
                    : "bg-[#c0c1ff]"

                  // Formatted Date
                  const dateStr = memory.createdAt.includes(",") 
                    ? memory.createdAt 
                    : new Date(memory.createdAt).toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric" })

                  return (
                    <div key={memory.id} className="relative group">
                      
                      {/* Connection hook dot indicator on timeline */}
                      <span className={`absolute -left-7 md:-left-9 top-1.5 h-3.5 w-3.5 rounded-full border-4 border-[#111316] ${nodeDotColorClass} transition-transform duration-300 group-hover:scale-125 z-10`} />
                      
                      {/* Interactive glass card node wrapper */}
                      <div className="glass-card rounded-2xl p-4 md:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${chipColorClass}`}>
                            {memory.category}
                          </span>
                          <span className="text-[10px] text-[#c7c4d7]/40 font-mono">{dateStr}</span>
                        </div>
                        
                        <p className="text-xs text-[#e2e2e6] font-medium leading-relaxed group-hover:text-white transition-colors duration-200">
                          {memory.content}
                        </p>

                        {/* Semantic tags list */}
                        {memory.tags.length > 0 && (
                          <div className="flex items-center gap-2 text-[10px] text-[#c7c4d7]/60 pt-2 border-t border-white/5">
                            <Tag size={10} className="text-[#c7c4d7]/40" />
                            <div className="flex gap-1.5">
                              {memory.tags.map((t, idx) => (
                                <span key={idx} className="font-mono">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Connection Line Hook visual connector */}
                      {index < filteredMemories.length - 1 && (
                        <div className="absolute -left-5.5 md:-left-7.5 top-5 bottom-0 w-px bg-white/5 pointer-events-none" />
                      )}
                    </div>
                  )
                })}

              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
