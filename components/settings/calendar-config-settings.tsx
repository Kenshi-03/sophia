"use client"

import React, { useState, useEffect } from "react"
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  AlertTriangle, 
  Calendar, 
  Info, 
  Loader2, 
  Tag, 
  Sliders, 
  ToggleLeft, 
  ToggleRight 
} from "lucide-react"

interface CalendarConfig {
  id: string
  cognitiveCategory: string
  categoryType: string
  googleCalendarId: string
  description: string | null
  color: string | null
  isActive: boolean
  isDefault: boolean
  isSeededDefault: boolean
}

const CATEGORY_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "DEEP_WORK", label: "Deep Work" },
  { value: "MEETING", label: "Meeting" },
  { value: "HEALTH", label: "Health" },
  { value: "RECOVERY", label: "Recovery" },
  { value: "ACADEMIC", label: "Academic" },
  { value: "PERSONAL", label: "Personal" },
  { value: "ADMIN", label: "Admin" },
  { value: "PROJECT", label: "Project" },
]

export default function CalendarConfigSettings() {
  const [configs, setConfigs] = useState<CalendarConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null) // null = create mode
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [cognitiveCategory, setCognitiveCategory] = useState("")
  const [categoryType, setCategoryType] = useState("GENERAL")
  const [googleCalendarId, setGoogleCalendarId] = useState("primary")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#2563EB")
  const [isActive, setIsActive] = useState(true)
  const [isDefault, setIsDefault] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Duplicate type warnings state
  const [duplicateTypes, setDuplicateTypes] = useState<string[]>([])

  const fetchConfigs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/settings/calendar-configs")
      if (!response.ok) {
        throw new Error("Gagal mengambil konfigurasi kalender.")
      }
      const data = await response.json()
      if (data.success) {
        setConfigs(data.configs)
        checkDuplicateTypes(data.configs)
      } else {
        throw new Error(data.error || "Gagal memproses data.")
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal menghubungi server.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  const checkDuplicateTypes = (configsList: CalendarConfig[]) => {
    const counts: Record<string, number> = {}
    configsList.forEach(config => {
      if (config.isActive) {
        counts[config.categoryType] = (counts[config.categoryType] || 0) + 1
      }
    })
    const duplicates = Object.keys(counts).filter(type => counts[type] > 1)
    setDuplicateTypes(duplicates)
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    setCognitiveCategory("")
    setCategoryType("GENERAL")
    setGoogleCalendarId("primary")
    setDescription("")
    setColor("#2563EB")
    setIsActive(true)
    setIsDefault(false)
    setIsFormOpen(true)
    setError(null)
  }

  const handleOpenEdit = (config: CalendarConfig) => {
    setEditingId(config.id)
    setCognitiveCategory(config.cognitiveCategory)
    setCategoryType(config.categoryType)
    setGoogleCalendarId(config.googleCalendarId)
    setDescription(config.description || "")
    setColor(config.color || "#2563EB")
    setIsActive(config.isActive)
    setIsDefault(config.isDefault)
    setIsFormOpen(true)
    setError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    if (!cognitiveCategory.trim()) {
      setError("Nama Kategori Kognitif wajib diisi.")
      setIsSaving(false)
      return
    }

    if (!googleCalendarId.trim()) {
      setError("Google Calendar ID wajib diisi. Gunakan 'primary' sebagai default.")
      setIsSaving(false)
      return
    }

    try {
      const url = editingId 
        ? `/api/settings/calendar-configs/${editingId}`
        : "/api/settings/calendar-configs"
      const method = editingId ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cognitiveCategory,
          categoryType,
          googleCalendarId,
          description: description || null,
          color,
          isActive,
          isDefault,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan konfigurasi.")
      }

      setIsFormOpen(false)
      fetchConfigs()
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Terjadi kesalahan koneksi.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kategori kognitif ini? Agenda historis akan tetap tersimpan tetapi analisis kognitif kategori ini akan beralih ke 'GENERAL'.")) return

    setError(null)
    try {
      const response = await fetch(`/api/settings/calendar-configs/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gagal menghapus konfigurasi.")
      }

      fetchConfigs()
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal menghubungi server.")
    }
  }

  const handleToggleActive = async (config: CalendarConfig) => {
    try {
      const response = await fetch(`/api/settings/calendar-configs/${config.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !config.isActive }),
      })
      if (response.ok) {
        fetchConfigs()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSetDefault = async (config: CalendarConfig) => {
    try {
      const response = await fetch(`/api/settings/calendar-configs/${config.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      })
      if (response.ok) {
        fetchConfigs()
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) {
    return (
      <div className="glass-panel rounded-3xl p-6 flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-[#c0c1ff]" size={24} />
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Calendar className="text-[#c0c1ff]" size={16} />
          <span>Cognitive Calendar Mappings</span>
        </h3>
        
        {!isFormOpen && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8083ff] text-white hover:bg-[#8083ff]/95 rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-lg shadow-[#8083ff]/10 active:scale-95"
          >
            <Plus size={12} />
            <span>Tambah Kategori</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-[#ffb4ab] rounded-2xl text-xs">
          {error}
        </div>
      )}

      {/* Duplicate type warnings */}
      {duplicateTypes.length > 0 && (
        <div className="space-y-2">
          {duplicateTypes.map(type => (
            <div key={type} className="flex gap-2.5 p-3.5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 text-amber-400 text-xs">
              <AlertTriangle className="shrink-0 mt-0.5" size={14} />
              <p className="leading-relaxed">
                Terdeteksi beberapa kategori kognitif aktif yang menggunakan tipe kognitif yang sama (<strong>{type}</strong>). Disarankan untuk menggunakan satu kategori aktif per tipe untuk visualisasi ritme kerja yang akurat.
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Form Panel */}
      {isFormOpen && (
        <form onSubmit={handleSave} className="p-5 border border-white/5 bg-white/[0.01] rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <h4 className="text-xs font-bold text-white">
              {editingId ? "Edit Kategori Kognitif" : "Buat Kategori Kognitif Baru"}
            </h4>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-[#c7c4d7]/60 hover:text-white transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cognitive Category Name */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Nama Kategori Kognitif</label>
              <input
                type="text"
                value={cognitiveCategory}
                onChange={(e) => setCognitiveCategory(e.target.value)}
                placeholder="cth. Deep Work Coding, Rapat Koordinasi"
                className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
              />
            </div>

            {/* Cognitive Category Type */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Tipe Kategori Kognitif</label>
              <select
                value={categoryType}
                onChange={(e) => setCategoryType(e.target.value)}
                className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
              >
                {CATEGORY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Google Calendar ID */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Google Calendar ID</label>
              <input
                type="text"
                value={googleCalendarId}
                onChange={(e) => setGoogleCalendarId(e.target.value)}
                placeholder="primary"
                className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
              />
            </div>

            {/* Color */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Warna Aksen</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-12 bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#8083ff"
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan opsional mengenai tujuan kategori kognitif ini..."
              rows={2}
              className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 resize-none font-sans"
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs text-[#c7c4d7]/90 select-none cursor-pointer">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className="text-[#c0c1ff] hover:text-white transition-all cursor-pointer"
              >
                {isActive ? <ToggleRight size={22} className="text-[#8083ff]" /> : <ToggleLeft size={22} className="text-white/20" />}
              </button>
              <span>Kategori Aktif</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-[#c7c4d7]/90 select-none cursor-pointer">
              <button
                type="button"
                onClick={() => setIsDefault(!isDefault)}
                className="text-[#c0c1ff] hover:text-white transition-all cursor-pointer"
              >
                {isDefault ? <ToggleRight size={22} className="text-[#8083ff]" /> : <ToggleLeft size={22} className="text-white/20" />}
              </button>
              <span>Kategori Default Agenda</span>
            </label>
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3.5 py-1.5 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white transition-all active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 bg-[#8083ff] text-white text-xs font-semibold rounded-xl hover:bg-[#8083ff]/95 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-[#8083ff]/15 cursor-pointer"
            >
              {isSaving && <Loader2 size={12} className="animate-spin" />}
              <span>Simpan Kategori</span>
            </button>
          </div>
        </form>
      )}

      {/* Grid List */}
      {configs.length === 0 ? (
        <div className="p-8 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
          <Info className="text-[#c7c4d7]/40" size={20} />
          <h4 className="text-xs font-bold text-[#c7c4d7]/80">Belum Ada Mappings Kalender</h4>
          <p className="text-[10px] text-[#c7c4d7]/40 max-w-xs leading-relaxed">
            Tambahkan kategori kognitif pertama Anda untuk mulai mengorganisasikan kalender Anda berdasarkan ritme mental.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {configs.map((config) => (
            <div 
              key={config.id} 
              className={`p-4 rounded-2xl border transition-all duration-300 relative group flex flex-col justify-between ${
                config.isActive 
                  ? "bg-white/[0.01] border-white/5 hover:border-white/10" 
                  : "bg-black/[0.15] border-white/[0.02] opacity-60"
              }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="h-2.5 w-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: config.color || "#8083ff" }} 
                    />
                    <h4 className="text-xs font-bold text-white truncate font-display">{config.cognitiveCategory}</h4>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {config.isDefault && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-[#8083ff]/10 border border-[#8083ff]/20 text-[#8083ff] rounded-md uppercase tracking-wider font-mono">
                        Default
                      </span>
                    )}
                    {config.isSeededDefault && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-white/5 border border-white/10 text-[#c7c4d7]/60 rounded-md uppercase tracking-wider font-mono">
                        System
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-[#c7c4d7]/70 font-sans leading-relaxed">
                  {config.description && <p>{config.description}</p>}
                  
                  <div className="flex flex-col gap-0.5 pt-1 text-[10px] text-[#c7c4d7]/50 font-mono">
                    <div className="flex justify-between">
                      <span>Google ID:</span>
                      <span className="truncate max-w-[150px] text-white/60">{config.googleCalendarId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Semantic Type:</span>
                      <span className="text-white/60">{config.categoryType}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Panel */}
              <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3 shrink-0">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleToggleActive(config)}
                    className="text-[10px] text-[#c7c4d7]/60 hover:text-white transition-colors cursor-pointer"
                  >
                    {config.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  
                  {!config.isDefault && config.isActive && (
                    <>
                      <span className="text-white/10">|</span>
                      <button
                        onClick={() => handleSetDefault(config)}
                        className="text-[10px] text-[#c7c4d7]/60 hover:text-white transition-colors cursor-pointer"
                      >
                        Jadikan Default
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(config)}
                    className="p-1 hover:bg-white/5 rounded-lg text-[#c7c4d7]/60 hover:text-white transition-all cursor-pointer"
                    title="Ubah Mappings"
                  >
                    <Edit2 size={11} />
                  </button>

                  <button
                    onClick={() => handleDelete(config.id)}
                    className="p-1 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-all cursor-pointer"
                    title="Hapus Mappings"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
