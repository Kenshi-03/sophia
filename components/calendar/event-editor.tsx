"use client"

import React, { useState, useEffect } from "react"
import { Calendar, Clock, MapPin, AlignLeft, Tag, Loader2, Trash2 } from "lucide-react"
import { CalendarEvent } from "@/types/calendar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

interface CalendarCategory {
  id: string;
  name: string;
  color: string | null;
  categoryType: string | null;
}

interface EventEditorProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null // Null means Create mode, otherwise Edit mode
  categories: CalendarCategory[]
  onRefresh: () => void
}

export default function EventEditor({
  isOpen,
  onClose,
  event,
  categories,
  onRefresh,
}: EventEditorProps) {
  const isEditMode = !!event

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [location, setLocation] = useState("")
  const [calendarId, setCalendarId] = useState("")

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isMobile, setIsMobile] = useState(false)

  // Track responsive screen viewport width for side vs bottom sheet mapping
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Initialize form values when opening or switching events
  useEffect(() => {
    if (isOpen) {
      setError(null)
      if (event) {
        setTitle(event.title)
        setDescription(event.description || "")
        setStartTime(formatDateForInput(event.startTime))
        setEndTime(formatDateForInput(event.endTime))
        setLocation(event.location || "")
        setCalendarId(event.calendarId || "")
      } else {
        setTitle("")
        setDescription("")
        // Default to current hour, end time + 1 hour
        const now = new Date()
        now.setMinutes(0, 0, 0)
        const nextHour = new Date(now)
        nextHour.setHours(now.getHours() + 1)
        const twoHoursLater = new Date(now)
        twoHoursLater.setHours(now.getHours() + 2)

        setStartTime(formatDateForInput(nextHour))
        setEndTime(formatDateForInput(twoHoursLater))
        setLocation("")
        // Default to first category
        setCalendarId(categories[0]?.id || "")
      }
    }
  }, [isOpen, event, categories])

  // Helper to format ISO or Date string into YYYY-MM-DDTHH:MM local time for inputs
  const formatDateForInput = (dateVal: Date | string) => {
    const d = new Date(dateVal)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError("Judul agenda wajib diisi.")
      return
    }

    if (!calendarId) {
      setError("Silakan pilih kategori agenda.")
      return
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError("Format tanggal dan waktu tidak valid.")
      return
    }

    if (end <= start) {
      setError("Waktu selesai harus setelah waktu mulai.")
      return
    }

    setIsSaving(true)

    try {
      const url = isEditMode ? `/api/calendar/${event.id}` : "/api/calendar"
      const method = isEditMode ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          location: location || null,
          calendarId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan perubahan.")
      }

      onRefresh()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Terjadi kesalahan koneksi.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!event) return
    if (!confirm("Apakah Anda yakin ingin menghapus agenda ini?")) return

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/calendar/${event.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gagal menghapus agenda.")
      }

      onRefresh()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Gagal menghubungi server.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        showCloseButton={true}
        className="glass-panel border-white/10 text-white bg-[#1e2023]/98 backdrop-blur-2xl p-6 md:p-8 flex flex-col focus:outline-none z-50 max-sm:h-[85vh] max-sm:rounded-t-[2.5rem] max-sm:border-t max-sm:border-x-0 max-sm:border-b-0 sm:max-w-lg"
      >
        {/* Drag handle pill on mobile */}
        {isMobile && (
          <div className="h-1.5 w-12 bg-white/10 rounded-full mx-auto -mt-2 mb-4 shrink-0" />
        )}

        {/* Header Title */}
        <SheetHeader className="shrink-0 mb-4 text-left">
          <SheetTitle className="font-bold text-base text-white font-display">
            {isEditMode ? "Ubah Rincian Agenda" : "Tambah Agenda Baru"}
          </SheetTitle>
          <SheetDescription className="text-[10px] text-[#c7c4d7]/50 uppercase tracking-wider font-mono">
            {isEditMode ? "Calendar Intelligence Update" : "Calendar Intelligence Insert"}
          </SheetDescription>
        </SheetHeader>

        {/* Error Alert Box */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-[#ffb4ab] text-xs p-3.5 rounded-2xl shrink-0 animate-fade-in mb-4">
            {error}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSave} className="space-y-5 overflow-y-auto flex-1 pr-1 pb-4 scrollbar-thin">
          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/50 block">
              Nama Agenda
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="cth. Ujian Tengah Semester, Deep Work Coding"
                className="w-full bg-[#111316]/50 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/20 focus:border-[#8083ff]/40 focus:outline-none transition-all duration-200"
              />
            </div>
          </div>

          {/* Start/End Time Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/50 flex items-center gap-1.5">
                <Clock size={11} className="text-[#c0c1ff]" />
                <span>Waktu Mulai</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-[#111316]/50 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:border-[#8083ff]/40 focus:outline-none transition-all duration-200 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/50 flex items-center gap-1.5">
                <Clock size={11} className="text-[#ffb4ab]" />
                <span>Waktu Selesai</span>
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-[#111316]/50 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:border-[#8083ff]/40 focus:outline-none transition-all duration-200 font-mono"
              />
            </div>
          </div>

          {/* Location Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/50 flex items-center gap-1.5">
              <MapPin size={11} className="text-[#4edea3]" />
              <span>Lokasi</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="cth. Ruang Kelas 402, GMeet, atau Localhost"
              className="w-full bg-[#111316]/50 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/20 focus:border-[#8083ff]/40 focus:outline-none transition-all duration-200"
            />
          </div>

          {/* Description Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/50 flex items-center gap-1.5">
              <AlignLeft size={11} className="text-[#c7c4d7]/60" />
              <span>Deskripsi</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan detail mengenai agenda ini..."
              rows={3}
              className="w-full bg-[#111316]/50 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/20 focus:border-[#8083ff]/40 focus:outline-none transition-all duration-200 resize-none scrollbar-thin"
            />
          </div>

          {/* Category Selector (Pills Grid) */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/50 flex items-center gap-1.5">
              <Tag size={11} className="text-[#c0c1ff]" />
              <span>Kategori Kognitif</span>
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-white/5 rounded-2xl bg-black/10 scrollbar-thin">
              {categories.map((cat) => {
                const isSelected = calendarId === cat.id
                const catColor = cat.color || "#8083ff"

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCalendarId(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left border text-[11px] transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white/5 text-white"
                        : "bg-transparent text-[#c7c4d7]/60 border-transparent hover:bg-white/[0.02]"
                    }`}
                    style={{ borderColor: isSelected ? catColor : "transparent" }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: catColor }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5 shrink-0">
            {/* Delete button (only in Edit mode) */}
            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving || isDeleting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-[#ffb4ab] rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>Hapus</span>
              </button>
            )}

            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="w-full sm:flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSaving || isDeleting}
              className="w-full sm:flex-1 py-3 bg-[#8083ff] text-white rounded-xl text-xs font-bold hover:bg-[#8083ff]/90 hover:shadow-lg hover:shadow-[#8083ff]/10 transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              <span>{isEditMode ? "Simpan Perubahan" : "Tambah Agenda"}</span>
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
