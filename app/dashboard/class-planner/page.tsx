"use client"

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  GraduationCap, 
  MapPin, 
  Link as LinkIcon, 
  Clock, 
  AlertTriangle, 
  History, 
  Calendar as CalendarIcon, 
  Edit3, 
  XCircle, 
  CheckCircle2, 
  RefreshCw, 
  BookOpen,
  User,
  Info,
  Repeat,
  ChevronsRight
} from "lucide-react";

// Helper: Convert a Date to local ISO string for datetime-local inputs (preserves timezone)
function toLocalISOString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface CourseSession {
  id: string;
  courseId: string;
  sequenceNumber: number;
  sessionType: string;
  plannedDate: string;
  actualDate?: string | null;
  startTime: string;
  endTime: string;
  status: string;
  sessionMode: string;
  room?: string | null;
  meetingLink?: string | null;
  notes?: string | null;
  progressState: string;
  progressPercentage: number;
  completedAt?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  executionNotes?: string | null;
  wasActuallyHeld: boolean;
  isReplacement: boolean;
  replacementForId?: string | null;
  updatedAt: string;
}

interface TimelineMutationLog {
  id: string;
  courseId: string;
  courseSessionId?: string | null;
  mutationType: string;
  affectedSequences: number[];
  previousState?: unknown;
  newState?: unknown;
  reason?: string | null;
  createdAt: string;
}

interface Course {
  id: string;
  title: string;
  lecturer: string;
  semester: number;
  academicYear: string;
  totalSessions: number;
  categoryType: string;
  defaultSessionMode: string;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  timelineVersion: number;
  sessions: CourseSession[];
  mutationLogs: TimelineMutationLog[];
}

interface Collision {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  type: string;
  courseTitle?: string;
  sequenceNumber?: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

function normalizeCourse(course: Course): Course {
  return {
    ...course,
    sessions: Array.isArray(course.sessions) ? course.sessions : [],
    mutationLogs: Array.isArray(course.mutationLogs) ? course.mutationLogs : [],
  };
}

export default function ClassPlannerPage() {
  // State variables
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals state
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showShiftSequence, setShowShiftSequence] = useState(false);
  const [showReplacement, setShowReplacement] = useState(false);

  // Active items for modals
  const [activeSession, setActiveSession] = useState<CourseSession | null>(null);

  // Add Course Form State
  const [courseForm, setCourseForm] = useState({
    title: "",
    lecturer: "",
    semester: 1,
    academicYear: new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
    totalSessions: 16,
    defaultSessionMode: "OFFLINE",
    defaultLocation: "",
    defaultMeetingLink: "",
    firstSessionDate: new Date().toISOString().split("T")[0],
    startTime: "08:00",
    endTime: "09:40",
  });

  // Override Form State
  const [overrideForm, setOverrideForm] = useState({
    plannedDate: "",
    startTime: "",
    endTime: "",
    room: "",
    meetingLink: "",
    sessionMode: "OFFLINE",
    sessionType: "CLASS",
    notes: "",
  });

  // Collision state
  const [collisions, setCollisions] = useState<Collision[]>([]);
  const [checkingCollisions, setCheckingCollisions] = useState(false);

  // Cancel Form State
  const [cancelForm, setCancelForm] = useState({
    action: "CANCEL",
    reason: "",
  });

  // Shift Sequence Form State
  const [shiftForm, setShiftForm] = useState({
    newDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  // Replacement Session Form State
  const [replacementForm, setReplacementForm] = useState({
    plannedDate: new Date().toISOString().split("T")[0],
    startTime: "08:00",
    endTime: "09:40",
    sessionMode: "OFFLINE",
    room: "",
    meetingLink: "",
    notes: "",
  });
  // Progress tracking states & forms
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [submittingProgress, setSubmittingProgress] = useState(false);
  const [progressForm, setProgressForm] = useState({
    state: "NOT_STARTED",
    notes: "",
    actualStartTime: "",
    actualEndTime: "",
    reason: "",
  });

  const openProgressModal = (session: CourseSession) => {
    setActiveSession(session);
    setProgressError("");
    
    // Auto-populate actual times with planned times as a convenient fallback
    // Use toLocalISOString to preserve timezone for datetime-local inputs
    const todayStr = session.plannedDate.split("T")[0];
    const plannedStart = new Date(`${todayStr}T${session.startTime}:00`);
    const plannedEnd = new Date(`${todayStr}T${session.endTime}:00`);

    setProgressForm({
      state: session.progressState || "NOT_STARTED",
      notes: session.executionNotes || "",
      actualStartTime: session.actualStartTime 
        ? toLocalISOString(new Date(session.actualStartTime))
        : toLocalISOString(plannedStart),
      actualEndTime: session.actualEndTime 
        ? toLocalISOString(new Date(session.actualEndTime))
        : toLocalISOString(plannedEnd),
      reason: "",
    });
    setShowProgressModal(true);
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    try {
      setProgressError("");
      setSubmittingProgress(true);

      const res = await fetch(`/api/academic/sessions/${activeSession.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: progressForm.state,
          notes: progressForm.notes,
          actualStartTime: progressForm.actualStartTime ? new Date(progressForm.actualStartTime).toISOString() : undefined,
          actualEndTime: progressForm.actualEndTime ? new Date(progressForm.actualEndTime).toISOString() : undefined,
          reason: progressForm.reason || progressForm.notes || `State updated to ${progressForm.state}`,
          lastUpdatedAt: activeSession.updatedAt,
          bypassTimestamps: progressForm.state !== "COMPLETED",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowProgressModal(false);
        if (selectedCourse) {
          await selectCourse(selectedCourse.id);
        }
        await fetchCourses();
      } else {
        setProgressError(data.error || "Gagal memperbarui progres sesi.");
      }
    } catch (err) {
      console.error(err);
      setProgressError("Kesalahan koneksi saat menyimpan progres.");
    } finally {
      setSubmittingProgress(false);
    }
  };

  const handleQuickCompleteToggle = async (session: CourseSession) => {
    const isCurrentlyCompleted = session.progressState === "COMPLETED";

    try {
      setError("");
      
      if (isCurrentlyCompleted) {
        // Toggle off: revert to NOT_STARTED
        const res = await fetch(`/api/academic/sessions/${session.id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: "NOT_STARTED",
            notes: session.executionNotes,
            reason: "Quick complete toggled off - reverted to not started",
            lastUpdatedAt: session.updatedAt,
            bypassTimestamps: true,
          }),
        });

        const data = await res.json();
        if (data.success) {
          if (selectedCourse) await selectCourse(selectedCourse.id);
          await fetchCourses();
        } else {
          setError(data.error || "Gagal membuka kembali sesi.");
        }
      } else {
        // Toggle on: mark COMPLETED with planned times
        const todayStr = session.plannedDate.split("T")[0];
        const plannedStartISO = new Date(`${todayStr}T${session.startTime}:00`).toISOString();
        const plannedEndISO = new Date(`${todayStr}T${session.endTime}:00`).toISOString();

        const res = await fetch(`/api/academic/sessions/${session.id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: "COMPLETED",
            percentage: 100,
            actualStartTime: plannedStartISO,
            actualEndTime: plannedEndISO,
            bypassTimestamps: true,
            notes: session.executionNotes || "Sesi selesai via quick-complete.",
            lastUpdatedAt: session.updatedAt,
          }),
        });

        const data = await res.json();
        if (data.success) {
          if (selectedCourse) await selectCourse(selectedCourse.id);
          await fetchCourses();
        } else {
          setError(data.error || "Gagal menandai sesi selesai.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Kesalahan koneksi saat mengubah status penyelesaian.");
    }
  };

  // Fetch Courses
  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/academic/courses");
      const data = await res.json();
      if (data.success) {
        const nextCourses = Array.isArray(data.courses)
          ? data.courses.map((course: Course) => normalizeCourse(course))
          : [];

        setCourses(nextCourses);
        setSelectedCourse((current) => {
          if (!current) return current;
          return nextCourses.some((course: Course) => course.id === current.id)
            ? current
            : null;
        });
      } else {
        setError(data.error || "Gagal mengambil daftar perkuliahan.");
      }
    } catch (err) {
      console.error(err);
      setError("Kesalahan koneksi saat mengambil data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Fetch individual course details (including logs)
  const selectCourse = async (courseId: string) => {
    try {
      setError("");
      const res = await fetch(`/api/academic/courses/${courseId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCourse(normalizeCourse(data.course));
      } else {
        setError(data.error || "Gagal mengambil detail perkuliahan.");
      }
    } catch (err) {
      console.error(err);
      setError("Kesalahan koneksi saat mengambil detail kelas.");
    }
  };

  // Add Course Submit
  const handleAddCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      const res = await fetch("/api/academic/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddCourse(false);
        // Reset form
        setCourseForm({
          title: "",
          lecturer: "",
          semester: 1,
          academicYear: new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
          totalSessions: 16,
          defaultSessionMode: "OFFLINE",
          defaultLocation: "",
          defaultMeetingLink: "",
          firstSessionDate: new Date().toISOString().split("T")[0],
          startTime: "08:00",
          endTime: "09:40",
        });
        await fetchCourses();
      } else {
        setError(data.error || "Gagal menyimpan jadwal perkuliahan.");
      }
    } catch (err) {
      console.error(err);
      setError("Kesalahan menyimpan jadwal.");
    }
  };

  // Open Override Modal
  const openOverrideModal = (session: CourseSession) => {
    setActiveSession(session);
    setOverrideForm({
      plannedDate: session.plannedDate.split("T")[0],
      startTime: session.startTime,
      endTime: session.endTime,
      room: session.room || "",
      meetingLink: session.meetingLink || "",
      sessionMode: session.sessionMode,
      sessionType: session.sessionType,
      notes: session.notes || "",
    });
    setCollisions([]);
    setShowOverride(true);
  };

  // Live Collision Check for Override Form
  useEffect(() => {
    if (!showOverride || !activeSession) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        setCheckingCollisions(true);
        const res = await fetch("/api/academic/collisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plannedDate: overrideForm.plannedDate,
            startTime: overrideForm.startTime,
            endTime: overrideForm.endTime,
            room: overrideForm.room,
            excludeEventId: null // We check conflict globally
          }),
        });
        const data = await res.json();
        if (data.success) {
          setCollisions(Array.isArray(data.conflicts) ? data.conflicts : []);
        }
      } catch (err) {
        console.error("Collision check failed:", err);
      } finally {
        setCheckingCollisions(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [
    overrideForm.plannedDate,
    overrideForm.startTime,
    overrideForm.endTime,
    overrideForm.room,
    showOverride,
    activeSession
  ]);

  // Override Submit
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    try {
      setError("");
      const res = await fetch(`/api/academic/sessions/${activeSession.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrideForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowOverride(false);
        if (selectedCourse) {
          await selectCourse(selectedCourse.id);
        }
        await fetchCourses();
      } else {
        setError(data.error || "Gagal mengubah detail sesi.");
      }
    } catch (err) {
      console.error(err);
      setError("Kesalahan memodifikasi sesi.");
    }
  };

  // Open Cancel Modal
  const openCancelModal = (session: CourseSession) => {
    setActiveSession(session);
    setCancelForm({
      action: "CANCEL",
      reason: "",
    });
    setShowCancel(true);
  };

  // Cancel Submit
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    try {
      setError("");
      const res = await fetch(`/api/academic/sessions/${activeSession.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelForm.reason || "Sesi kuliah dibatalkan.",
        }),
      });
      const data = await res.json();

      if (data.success) {
        setShowCancel(false);
        if (selectedCourse) {
          await selectCourse(selectedCourse.id);
        }
        await fetchCourses();
      } else {
        setError(data.error || "Gagal membatalkan sesi.");
      }
    } catch (err) {
      console.error(err);
      setError("Kesalahan memproses pembatalan.");
    }
  };

  // Open Shift Sequence Modal
  const openShiftSequenceModal = (session: CourseSession) => {
    setActiveSession(session);
    setShiftForm({
      newDate: session.plannedDate.split("T")[0],
      reason: "",
    });
    setShowShiftSequence(true);
  };

  // Shift Sequence Submit
  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    try {
      setError("");
      const res = await fetch(`/api/academic/sessions/${activeSession.id}/shift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newDate: shiftForm.newDate,
          reason: shiftForm.reason || "Pergeseran jadwal cascading.",
        }),
      });
      const data = await res.json();

      if (data.success) {
        setShowShiftSequence(false);
        if (selectedCourse) {
          await selectCourse(selectedCourse.id);
        }
        await fetchCourses();
      } else {
        setError(data.error || "Gagal menggeser urutan sesi.");
      }
    } catch (err) {
      console.error(err);
      setError("Kesalahan menggeser jadwal.");
    }
  };

  // Open Replacement Session Modal
  const openReplacementModal = (session: CourseSession) => {
    setActiveSession(session);
    setReplacementForm({
      plannedDate: session.plannedDate.split("T")[0],
      startTime: session.startTime,
      endTime: session.endTime,
      sessionMode: session.sessionMode,
      room: session.room || "",
      meetingLink: session.meetingLink || "",
      notes: "",
    });
    setShowReplacement(true);
  };

  // Replacement Session Submit
  const handleReplacementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    try {
      setError("");
      const res = await fetch(`/api/academic/sessions/${activeSession.id}/replacement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(replacementForm),
      });
      const data = await res.json();

      if (data.success) {
        setShowReplacement(false);
        if (selectedCourse) {
          await selectCourse(selectedCourse.id);
        }
        await fetchCourses();
      } else {
        setError(data.error || "Gagal membuat sesi pengganti.");
      }
    } catch (err) {
      console.error(err);
      setError("Kesalahan membuat sesi pengganti.");
    }
  };

  // Delete Course
  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus perkuliahan ini beserta seluruh sesinya? Tindakan ini tidak dapat dibatalkan secara langsung.")) return;

    try {
      setError("");
      const res = await fetch(`/api/academic/courses/${courseId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCourse(null);
        await fetchCourses();
      } else {
        setError(data.error || "Gagal menghapus perkuliahan.");
      }
    } catch (err) {
      console.error(err);
      setError("Kesalahan menghapus kelas.");
    }
  };

  // Calculate Progress Stats
  const getProgress = (course: Course) => {
    const sessions = Array.isArray(course.sessions) ? course.sessions : [];
    const total = course.totalSessions || sessions.length;
    const completed = sessions.filter(
      (s) => s.progressState === "COMPLETED" || s.progressState === "PARTIALLY_COMPLETED" || s.progressState === "SKIPPED"
    ).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const selectedSessions = selectedCourse?.sessions ?? [];
  const selectedMutationLogs = selectedCourse?.mutationLogs ?? [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="text-[#8083ff]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Class Planner</h1>
          </div>
          <p className="text-xs text-[#c7c4d7] mt-1 font-mono">
            Academic Schedule System — Semester Timeline & Cognitive Load Engine
          </p>
        </div>
        <button
          onClick={() => setShowAddCourse(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#8083ff] text-white hover:bg-[#8083ff]/90 transition-all cursor-pointer shadow-lg shadow-[#8083ff]/15 active:scale-98"
        >
          <Plus size={16} />
          <span>New Course</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-2xl text-xs text-[#ffb4ab] flex gap-2 items-start">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Workspace split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Courses list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-4 rounded-3xl border border-white/5 bg-[#17191d]/60 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <BookOpen size={16} className="text-[#8083ff]" />
              <h2 className="font-bold text-xs uppercase tracking-wider text-[#c7c4d7]">Active Courses</h2>
            </div>

            {loading && courses.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#c7c4d7]/50 font-mono">Loading courses...</div>
            ) : courses.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#c7c4d7]/50 font-mono">Belum ada kelas terdaftar.</div>
            ) : (
              <div className="space-y-2">
                {courses.map((course) => {
                  const { completed, total, percentage } = getProgress(course);
                  const isSelected = selectedCourse?.id === course.id;
                  return (
                    <div
                      key={course.id}
                      onClick={() => selectCourse(course.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected 
                          ? "bg-[#c0c1ff]/10 border-[#8083ff]" 
                          : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-sm text-white leading-snug">{course.title}</h3>
                        <span className="text-[10px] font-mono bg-[#8083ff]/10 text-[#8083ff] px-2 py-0.5 rounded-full shrink-0">
                          v{course.timelineVersion}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#c7c4d7]/70 mt-1 flex items-center gap-1">
                        <User size={12} className="shrink-0" /> {course.lecturer}
                      </p>
                      <p className="text-[10px] text-[#c7c4d7]/50 mt-0.5 font-mono">
                        Semester {course.semester} • T.A {course.academicYear}
                      </p>
                      
                      {/* Mini progress bar */}
                      <div className="mt-4 space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-[#c7c4d7]/60">
                          <span>Progress</span>
                          <span>{completed}/{total} ({percentage}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#8083ff] to-[#0d9488] rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Course Details & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedCourse ? (
            <div className="glass-panel p-12 rounded-3xl border border-white/5 bg-[#17191d]/30 text-center space-y-3">
              <GraduationCap className="mx-auto text-[#c7c4d7]/30" size={48} />
              <h3 className="font-bold text-sm text-white">No Course Selected</h3>
              <p className="text-xs text-[#c7c4d7]/60 max-w-sm mx-auto">
                Pilih mata kuliah di sebelah kiri atau buat kelas baru untuk mulai merancang timeline akademis semester Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Course Detail Card */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#17191d]/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-[#8083ff] bg-[#8083ff]/10 px-2 py-0.5 rounded-md">
                      Academic Category
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1.5">{selectedCourse.title}</h2>
                    <p className="text-xs text-[#c7c4d7] mt-0.5">
                      Dosen Pengampu: <span className="text-white font-medium">{selectedCourse.lecturer}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteCourse(selectedCourse.id)}
                    className="self-start sm:self-center px-3 py-1.5 border border-[#ffb4ab]/20 bg-[#ffb4ab]/5 text-[11px] font-semibold text-[#ffb4ab] rounded-xl hover:bg-[#ffb4ab]/10 transition-all cursor-pointer"
                  >
                    Delete Course
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-[#c7c4d7]/60 font-mono">Academic Year</p>
                    <p className="font-semibold text-white mt-0.5">{selectedCourse.academicYear}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-[#c7c4d7]/60 font-mono">Semester</p>
                    <p className="font-semibold text-white mt-0.5">{selectedCourse.semester}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-[#c7c4d7]/60 font-mono">Default Mode</p>
                    <p className="font-semibold text-white mt-0.5">{selectedCourse.defaultSessionMode}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-[#c7c4d7]/60 font-mono">Timeline Version</p>
                    <p className="font-semibold text-white mt-0.5">v{selectedCourse.timelineVersion}</p>
                  </div>
                </div>

                {/* Big progress metrics */}
                <div className="p-4 bg-gradient-to-br from-[#8083ff]/10 to-[#0d9488]/10 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[#c7c4d7]">Semester Timeline Progression</span>
                    <span className="font-bold text-white">
                      {getProgress(selectedCourse).completed}/{getProgress(selectedCourse).total} Sessions Complete ({getProgress(selectedCourse).percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#8083ff] to-[#0d9488] rounded-full transition-all duration-500" 
                      style={{ width: `${getProgress(selectedCourse).percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Timeline Sequence list */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <CalendarIcon size={16} className="text-[#8083ff]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#c7c4d7]">Semester Sequence Timeline</h3>
                </div>

                <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-6 before:w-0.5 before:bg-white/5">
                  {selectedSessions.map((session) => {
                    const isSkippedState = session.progressState === "SKIPPED";
                    const isCancelledState = session.progressState === "CANCELLED";
                    const isCompletedState = session.progressState === "COMPLETED";
                    const isPartialState = session.progressState === "PARTIALLY_COMPLETED";
                    const isPostponedState = session.progressState === "POSTPONED";
                    const isInProgressState = session.progressState === "IN_PROGRESS";

                    const isRescheduledStatus = session.status === "RESCHEDULED";

                    // Session type styling
                    let typeColor = "bg-[#8083ff]/10 text-[#8083ff] border-[#8083ff]/20";
                    if (session.sessionType === "MID_EXAM" || session.sessionType === "FINAL_EXAM") {
                      typeColor = "bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/20 font-bold";
                    } else if (session.sessionType === "QUIZ" || session.sessionType === "PRESENTATION") {
                      typeColor = "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20";
                    } else if (session.sessionType === "LAB") {
                      typeColor = "bg-[#0d9488]/10 text-[#0d9488] border-[#0d9488]/20";
                    }

                    // Mode badging
                    let modeColor = "bg-white/5 text-[#c7c4d7]";
                    if (session.sessionMode === "ONLINE") modeColor = "bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/20";
                    else if (session.sessionMode === "OFFLINE") modeColor = "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20";
                    else if (session.sessionMode === "HYBRID") modeColor = "bg-[#ec4899]/10 text-[#ec4899] border-[#ec4899]/20";

                    // Left Circle Sequence styling based on execution progress
                    let circleColor = "bg-[#17191d] border-white/10 text-white";
                    if (isCompletedState) {
                      circleColor = "bg-[#0d9488]/20 border-[#0d9488] text-[#0d9488] shadow-lg shadow-[#0d9488]/10";
                    } else if (isPartialState) {
                      circleColor = "bg-[#06b6d4]/20 border-dashed border-[#06b6d4] text-[#06b6d4]";
                    } else if (isInProgressState) {
                      circleColor = "bg-[#8083ff]/20 border-[#8083ff] text-[#8083ff] animate-pulse";
                    } else if (isPostponedState) {
                      circleColor = "bg-[#f97316]/20 border-[#f97316] text-[#f97316]";
                    } else if (isSkippedState || isCancelledState) {
                      circleColor = "bg-[#111316] border-white/5 text-[#c7c4d7]/40";
                    } else if (isRescheduledStatus) {
                      circleColor = "bg-[#f97316]/20 border-[#f97316] text-[#f97316]";
                    }

                    return (
                      <div 
                        key={session.id} 
                        className={`flex gap-4 relative group items-start transition-all duration-300 ${
                          isSkippedState || isCancelledState ? "opacity-50" : ""
                        }`}
                      >
                        {/* Left sequence circle */}
                        <div className={`h-12 w-12 rounded-full border flex items-center justify-center text-xs font-mono font-bold shrink-0 z-10 transition-colors ${circleColor}`}>
                          {session.sequenceNumber}
                        </div>

                        {/* Session details block */}
                        <div className="flex-1 glass-panel p-4 rounded-2xl border border-white/5 bg-[#17191d]/60 hover:bg-[#17191d]/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-2 flex-1 text-left">
                            {/* Line 1: Date and status indicators */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {/* Quick Complete Toggler Checkbox */}
                              {!isCancelledState && (
                                <button 
                                  onClick={() => handleQuickCompleteToggle(session)}
                                  className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                    isCompletedState
                                      ? "bg-[#0d9488] border-[#0d9488] text-white shadow-lg shadow-[#0d9488]/15 hover:bg-[#0d9488]/90"
                                      : "border-white/20 hover:border-[#8083ff] hover:bg-white/5 text-transparent"
                                  }`}
                                  title={isCompletedState ? "Buka kembali sesi (Reopen)" : "Tandai Selesai Cepat (Quick Complete)"}
                                >
                                  <CheckCircle2 size={12} className="stroke-[3] text-white" />
                                </button>
                              )}

                              <span className={`font-bold text-white font-mono ${isCancelledState || isSkippedState ? "line-through text-white/50" : ""}`}>
                                {new Date(session.plannedDate).toLocaleDateString("id-ID", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </span>
                              <span className="text-[#c7c4d7]/50">•</span>
                              <span className="flex items-center gap-1 text-[11px] text-[#c7c4d7]/70">
                                <Clock size={12} /> {session.startTime} - {session.endTime}
                              </span>

                              {/* Progress state chips */}
                              {isCompletedState && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#0d9488] border border-[#0d9488]/20 bg-[#0d9488]/5 px-2 py-0.5 rounded-full font-mono">
                                  Completed
                                </span>
                              )}
                              {isPartialState && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#06b6d4] border border-[#06b6d4]/20 bg-[#06b6d4]/5 px-2 py-0.5 rounded-full font-mono">
                                  Partial ({session.progressPercentage}%)
                                </span>
                              )}
                              {isInProgressState && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#8083ff] border border-[#8083ff]/20 bg-[#8083ff]/5 px-2 py-0.5 rounded-full font-mono animate-pulse">
                                  In Progress ({session.progressPercentage}%)
                                </span>
                              )}
                              {isPostponedState && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#f59e0b] border border-[#f59e0b]/20 bg-[#f59e0b]/5 px-2 py-0.5 rounded-full font-mono">
                                  Postponed
                                </span>
                              )}
                              {isSkippedState && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#ffb4ab] border border-[#ffb4ab]/20 bg-[#ffb4ab]/5 px-2 py-0.5 rounded-full font-mono">
                                  Skipped
                                </span>
                              )}
                              {isCancelledState && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#ffb4ab]/70 border border-[#ffb4ab]/10 bg-[#ffb4ab]/5 px-2 py-0.5 rounded-full font-mono">
                                  Cancelled
                                </span>
                              )}

                              {isRescheduledStatus && !isPostponedState && !isSkippedState && !isCancelledState && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#f97316] border border-[#f97316]/20 bg-[#f97316]/5 px-2 py-0.5 rounded-full font-mono">
                                  Override
                                </span>
                              )}

                              {/* Replacement badge */}
                              {(session.isReplacement || session.sessionType === "REPLACEMENT") && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#06b6d4] border border-[#06b6d4]/20 bg-[#06b6d4]/10 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 shadow-sm shadow-[#06b6d4]/10">
                                  <Repeat size={10} className="stroke-[3]" /> REPLACEMENT
                                </span>
                              )}
                            </div>

                            {/* Line 2: Badges & location details */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Session Type */}
                              <span className={`text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-md border ${typeColor}`}>
                                {session.sessionType}
                              </span>
                              {/* Session Mode */}
                              <span className={`text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-md border ${modeColor}`}>
                                {session.sessionMode}
                              </span>

                              {/* Room/Link */}
                              {session.sessionMode !== "ONLINE" && session.room && (
                                <span className="text-[11px] text-[#c7c4d7]/80 flex items-center gap-1 font-mono">
                                  <MapPin size={12} className="text-[#f59e0b]" /> {session.room}
                                </span>
                              )}
                              {session.sessionMode !== "OFFLINE" && session.meetingLink && (
                                <a 
                                  href={session.meetingLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[11px] text-[#06b6d4] hover:underline flex items-center gap-1 font-mono"
                                >
                                  <LinkIcon size={12} /> Link
                                </a>
                              )}

                              {/* Micro horizontal progress indicator bar */}
                              {(isInProgressState || isPartialState) && (
                                <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden ml-2 hidden sm:block">
                                  <div 
                                    className="h-full bg-gradient-to-r from-[#8083ff] to-[#06b6d4] rounded-full transition-all duration-300"
                                    style={{ width: `${session.progressPercentage}%` }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Notes display */}
                            {session.notes && (
                              <div className="text-[11px] text-[#c7c4d7]/70 bg-white/5 p-2 rounded-xl flex gap-1.5 items-start mt-2">
                                <Info size={12} className="shrink-0 mt-0.5 text-[#8083ff]" />
                                <span>{session.notes}</span>
                              </div>
                            )}

                            {/* Execution notes and report */}
                            {session.executionNotes && (
                              <div className="text-[11px] text-[#c7c4d7]/80 bg-[#0d9488]/5 border border-[#0d9488]/10 p-3 rounded-2xl flex flex-col gap-1 mt-2">
                                <div className="flex items-center gap-1.5 font-bold text-[#0d9488]">
                                  <CheckCircle2 size={12} className="shrink-0 text-[#0d9488]" />
                                  <span>Execution Report</span>
                                </div>
                                <p className="mt-0.5 text-white font-sans">{session.executionNotes}</p>
                                {(session.actualStartTime || session.completedAt) && (
                                  <p className="text-[9px] text-[#c7c4d7]/40 font-mono mt-1">
                                    {session.actualStartTime && `Start: ${new Date(session.actualStartTime).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}`}
                                    {session.actualEndTime && ` • End: ${new Date(session.actualEndTime).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}`}
                                    {session.completedAt && ` • Saved: ${new Date(session.completedAt).toLocaleString("id-ID", { dateStyle: 'short', timeStyle: 'short' })}`}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action controls (only for non-cancelled/non-archived courses) */}
                          <div className="flex items-center gap-1.5 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity flex-wrap max-w-[200px]">
                            {/* Track Progress Edit Button */}
                            <button
                              onClick={() => openProgressModal(session)}
                              className="p-2 border border-[#0d9488]/20 bg-[#0d9488]/5 text-[#0d9488] hover:bg-[#0d9488]/10 rounded-xl transition-all cursor-pointer"
                              title="Update Progress State"
                            >
                              <Clock size={14} />
                            </button>

                            {!isSkippedState && !isCancelledState && (
                              <>
                                <button
                                  onClick={() => openOverrideModal(session)}
                                  className="p-2 border border-white/5 bg-white/5 text-[#c7c4d7] hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                                  title="Override Schedule"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => openShiftSequenceModal(session)}
                                  className="p-2 border border-[#8083ff]/20 bg-[#8083ff]/5 text-[#8083ff] hover:bg-[#8083ff]/10 rounded-xl transition-all cursor-pointer"
                                  title="Shift Remaining Sequence"
                                >
                                  <ChevronsRight size={14} />
                                </button>
                                <button
                                  onClick={() => openReplacementModal(session)}
                                  className="p-2 border border-[#06b6d4]/20 bg-[#06b6d4]/5 text-[#06b6d4] hover:bg-[#06b6d4]/10 rounded-xl transition-all cursor-pointer"
                                  title="Create Replacement Session"
                                >
                                  <Repeat size={14} />
                                </button>
                                <button
                                  onClick={() => openCancelModal(session)}
                                  className="p-2 border border-[#ffb4ab]/20 bg-[#ffb4ab]/5 text-[#ffb4ab] hover:bg-[#ffb4ab]/10 rounded-xl transition-all cursor-pointer"
                                  title="Cancel This Session Only"
                                >
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Immutable Audit Log Panel */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#17191d]/80 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <History size={16} className="text-[#8083ff]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#c7c4d7]">
                    Timeline Mutation Logs (Immutable Audit Trail)
                  </h3>
                </div>

                {selectedMutationLogs.length === 0 ? (
                  <p className="text-xs text-[#c7c4d7]/40 font-mono py-2">No timeline mutations recorded.</p>
                ) : (
                  <div className="space-y-3 font-mono text-[10px] text-[#c7c4d7]/80">
                    {selectedMutationLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                        <div className="flex justify-between items-center border-b border-white/5 pb-1">
                          <span className="font-bold text-[#8083ff]">{log.mutationType}</span>
                          <span className="text-[#c7c4d7]/50">
                            {new Date(log.createdAt).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <p className="text-white mt-1 font-sans">{log.reason || "Mutasi timeline diterapkan."}</p>
                        <p className="text-[9px] text-[#c7c4d7]/60">
                          Sequences affected: {log.affectedSequences.join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Course Modal */}
      {showAddCourse && (
        <div className="fixed inset-0 bg-[#0b0c0e]/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-xl mx-4 rounded-3xl p-6 relative shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddCourse(false)}
              className="absolute top-4 right-4 text-[#c7c4d7] hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
            >
              <XCircle size={18} />
            </button>

            <form onSubmit={handleAddCourseSubmit} className="space-y-4 text-left">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <GraduationCap size={18} className="text-[#8083ff]" />
                <h3 className="font-bold text-sm text-white">Create New Course Timeline</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Course Title</label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    required
                    placeholder="e.g. Kalkulus I"
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Lecturer Name</label>
                  <input
                    type="text"
                    value={courseForm.lecturer}
                    onChange={(e) => setCourseForm({ ...courseForm, lecturer: e.target.value })}
                    required
                    placeholder="e.g. Dr. Budi"
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Semester</label>
                  <input
                    type="number"
                    value={courseForm.semester}
                    onChange={(e) => setCourseForm({ ...courseForm, semester: Number(e.target.value) })}
                    required
                    min={1}
                    max={14}
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Academic Year</label>
                  <input
                    type="text"
                    value={courseForm.academicYear}
                    onChange={(e) => setCourseForm({ ...courseForm, academicYear: e.target.value })}
                    required
                    placeholder="e.g. 2026/2027"
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Total Sessions</label>
                  <input
                    type="number"
                    value={courseForm.totalSessions}
                    onChange={(e) => setCourseForm({ ...courseForm, totalSessions: Number(e.target.value) })}
                    required
                    min={1}
                    max={32}
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Default Mode</label>
                  <select
                    value={courseForm.defaultSessionMode}
                    onChange={(e) => setCourseForm({ ...courseForm, defaultSessionMode: e.target.value })}
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                  >
                    <option value="OFFLINE">OFFLINE</option>
                    <option value="ONLINE">ONLINE</option>
                    <option value="HYBRID">HYBRID</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courseForm.defaultSessionMode !== "ONLINE" && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Default Location/Room</label>
                    <input
                      type="text"
                      value={courseForm.defaultLocation}
                      onChange={(e) => setCourseForm({ ...courseForm, defaultLocation: e.target.value })}
                      placeholder="e.g. Ruang 302"
                      className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                    />
                  </div>
                )}
                {courseForm.defaultSessionMode !== "OFFLINE" && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Default Meeting Link</label>
                    <input
                      type="url"
                      value={courseForm.defaultMeetingLink}
                      onChange={(e) => setCourseForm({ ...courseForm, defaultMeetingLink: e.target.value })}
                      placeholder="e.g. https://meet.google.com/..."
                      className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-4">
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">First Session Date</label>
                  <input
                    type="date"
                    value={courseForm.firstSessionDate}
                    onChange={(e) => setCourseForm({ ...courseForm, firstSessionDate: e.target.value })}
                    required
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Start Time</label>
                  <input
                    type="text"
                    value={courseForm.startTime}
                    onChange={(e) => setCourseForm({ ...courseForm, startTime: e.target.value })}
                    required
                    placeholder="HH:MM"
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">End Time</label>
                  <input
                    type="text"
                    value={courseForm.endTime}
                    onChange={(e) => setCourseForm({ ...courseForm, endTime: e.target.value })}
                    required
                    placeholder="HH:MM"
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddCourse(false)}
                  className="px-4 py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8083ff] text-white text-xs font-semibold rounded-xl hover:bg-[#8083ff]/90 transition-all cursor-pointer shadow-lg shadow-[#8083ff]/10 active:scale-95"
                >
                  Create Timeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverride && activeSession && (
        <div className="fixed inset-0 bg-[#0b0c0e]/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg mx-4 rounded-3xl p-6 relative shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowOverride(false)}
              className="absolute top-4 right-4 text-[#c7c4d7] hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
            >
              <XCircle size={18} />
            </button>

            <form onSubmit={handleOverrideSubmit} className="space-y-4 text-left">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Edit3 size={18} className="text-[#8083ff]" />
                <h3 className="font-bold text-sm text-white">
                  Override Session {activeSession.sequenceNumber}
                </h3>
              </div>

              {/* Real-time Collision Diagnostics Warning Banner */}
              {checkingCollisions ? (
                <div className="text-[10px] text-[#c7c4d7]/70 font-mono py-1 px-3 bg-white/5 rounded-lg flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin text-[#8083ff]" /> Checking conflicts...
                </div>
              ) : collisions.length > 0 ? (
                <div className="p-3.5 bg-[#f97316]/10 border border-[#f97316]/20 rounded-2xl space-y-2 text-xs">
                  <div className="flex gap-1.5 items-center text-[#f97316] font-bold">
                    <AlertTriangle size={14} /> Warning: Scheduling Conflicts Detected!
                  </div>
                  <div className="space-y-1.5 pl-5 max-h-[100px] overflow-y-auto font-mono text-[10px] text-[#c7c4d7]">
                    {collisions.map((c) => (
                      <div key={c.id}>
                        • [{c.severity}] Overlaps with <span className="text-white">&quot;{c.title}&quot;</span> 
                        {c.courseTitle && ` (${c.courseTitle} - Pertemuan ${c.sequenceNumber})`}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Date</label>
                  <input
                    type="date"
                    value={overrideForm.plannedDate}
                    onChange={(e) => setOverrideForm({ ...overrideForm, plannedDate: e.target.value })}
                    required
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Start Time</label>
                  <input
                    type="text"
                    value={overrideForm.startTime}
                    onChange={(e) => setOverrideForm({ ...overrideForm, startTime: e.target.value })}
                    required
                    placeholder="HH:MM"
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">End Time</label>
                  <input
                    type="text"
                    value={overrideForm.endTime}
                    onChange={(e) => setOverrideForm({ ...overrideForm, endTime: e.target.value })}
                    required
                    placeholder="HH:MM"
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Session Type</label>
                  <select
                    value={overrideForm.sessionType}
                    onChange={(e) => setOverrideForm({ ...overrideForm, sessionType: e.target.value })}
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                  >
                    <option value="CLASS">CLASS (Standard Class)</option>
                    <option value="QUIZ">QUIZ (Evaluasi Quiz)</option>
                    <option value="MID_EXAM">MID_EXAM (UTS Ujian Tengah Semester)</option>
                    <option value="FINAL_EXAM">FINAL_EXAM (UAS Ujian Akhir Semester)</option>
                    <option value="PRESENTATION">PRESENTATION (Presentasi Kelompok)</option>
                    <option value="LAB">LAB (Praktikum Lab)</option>
                    <option value="PROJECT_REVIEW">PROJECT REVIEW</option>
                    <option value="SEMINAR">SEMINAR</option>
                    <option value="REPLACEMENT">REPLACEMENT (Kelas Pengganti)</option>
                    <option value="HOLIDAY">HOLIDAY (Hari Libur)</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Session Mode</label>
                  <select
                    value={overrideForm.sessionMode}
                    onChange={(e) => setOverrideForm({ ...overrideForm, sessionMode: e.target.value })}
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                  >
                    <option value="OFFLINE">OFFLINE</option>
                    <option value="ONLINE">ONLINE</option>
                    <option value="HYBRID">HYBRID</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {overrideForm.sessionMode !== "ONLINE" && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Room/Building</label>
                    <input
                      type="text"
                      value={overrideForm.room}
                      onChange={(e) => setOverrideForm({ ...overrideForm, room: e.target.value })}
                      placeholder="e.g. Lab Komputer 2"
                      className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                    />
                  </div>
                )}
                {overrideForm.sessionMode !== "OFFLINE" && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Meeting Link</label>
                    <input
                      type="url"
                      value={overrideForm.meetingLink}
                      onChange={(e) => setOverrideForm({ ...overrideForm, meetingLink: e.target.value })}
                      placeholder="e.g. https://meet.google.com/..."
                      className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70">Session Notes</label>
                <textarea
                  value={overrideForm.notes}
                  onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                  placeholder="e.g. Membawa laptop masing-masing untuk praktikum..."
                  rows={2}
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-sans resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowOverride(false)}
                  className="px-4 py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8083ff] text-white text-xs font-semibold rounded-xl hover:bg-[#8083ff]/90 transition-all cursor-pointer shadow-lg shadow-[#8083ff]/10 active:scale-95"
                >
                  Apply Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Session Modal */}
      {showCancel && activeSession && (
        <div className="fixed inset-0 bg-[#0b0c0e]/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md mx-4 rounded-3xl p-6 relative shadow-2xl border border-white/10 text-left">
            <button
              onClick={() => setShowCancel(false)}
              className="absolute top-4 right-4 text-[#c7c4d7] hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
            >
              <XCircle size={18} />
            </button>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <XCircle size={18} className="text-[#ffb4ab]" />
                <h3 className="font-bold text-sm text-white">
                  Cancel Session {activeSession.sequenceNumber}
                </h3>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-xs text-[#c7c4d7]">
                <p className="font-bold text-white mb-1">Session Info:</p>
                <p>Course: <span className="text-white font-medium">{selectedCourse?.title}</span></p>
                <p>Sequence: <span className="text-[#ffb4ab] font-mono font-bold">Pertemuan {activeSession.sequenceNumber}</span></p>
                <p>Scheduled: <span className="text-white font-mono">{new Date(activeSession.plannedDate).toLocaleDateString("id-ID", { dateStyle: 'medium' })}</span></p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Cancellation Reason</label>
                <input
                  type="text"
                  value={cancelForm.reason}
                  onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
                  required
                  placeholder="e.g., Dosen berhalangan hadir..."
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCancel(false)}
                  className="px-4 py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ffb4ab] text-[#601410] text-xs font-semibold rounded-xl hover:bg-[#ffb4ab]/90 transition-all cursor-pointer active:scale-95"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Sequence Modal */}
      {showShiftSequence && activeSession && (
        <div className="fixed inset-0 bg-[#0b0c0e]/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md mx-4 rounded-3xl p-6 relative shadow-2xl border border-white/10 text-left">
            <button
              onClick={() => setShowShiftSequence(false)}
              className="absolute top-4 right-4 text-[#c7c4d7] hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
            >
              <XCircle size={18} />
            </button>

            <form onSubmit={handleShiftSubmit} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <ChevronsRight size={18} className="text-[#8083ff]" />
                <h3 className="font-bold text-sm text-white">
                  Cascading Shift Remaining Sequence
                </h3>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-xs text-[#c7c4d7] space-y-1">
                <p className="font-bold text-white mb-1">Shift Origin Info:</p>
                <p>Sequence: <span className="text-[#8083ff] font-mono font-bold">Pertemuan {activeSession.sequenceNumber}</span> and downstream sessions</p>
                <p>Current Date: <span className="text-white font-mono">{new Date(activeSession.plannedDate).toLocaleDateString("id-ID", { dateStyle: 'medium' })}</span></p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">New Target Date for This Session</label>
                <input
                  type="date"
                  value={shiftForm.newDate}
                  onChange={(e) => setShiftForm({ ...shiftForm, newDate: e.target.value })}
                  required
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                />
                <p className="text-[9px] text-[#c7c4d7]/60 mt-1">
                  Note: Subsequent sessions will automatically shift to preserve original weekday scheduling patterns.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Reason for Shifting</label>
                <input
                  type="text"
                  value={shiftForm.reason}
                  onChange={(e) => setShiftForm({ ...shiftForm, reason: e.target.value })}
                  required
                  placeholder="e.g., Libur Nasional, Rapat Jurusan..."
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowShiftSequence(false)}
                  className="px-4 py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8083ff] text-white text-xs font-semibold rounded-xl hover:bg-[#8083ff]/90 transition-all cursor-pointer shadow-lg shadow-[#8083ff]/10 active:scale-95"
                >
                  Apply Cascade Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replacement Session Modal */}
      {showReplacement && activeSession && (
        <div className="fixed inset-0 bg-[#0b0c0e]/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg mx-4 rounded-3xl p-6 relative shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto text-left">
            <button
              onClick={() => setShowReplacement(false)}
              className="absolute top-4 right-4 text-[#c7c4d7] hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
            >
              <XCircle size={18} />
            </button>

            <form onSubmit={handleReplacementSubmit} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Repeat size={18} className="text-[#06b6d4]" />
                <h3 className="font-bold text-sm text-white">
                  Create Make-Up / Replacement Session
                </h3>
              </div>

              <div className="p-3 bg-[#06b6d4]/5 rounded-2xl border border-[#06b6d4]/20 text-xs text-[#c7c4d7] space-y-1">
                <p className="font-bold text-white mb-1">Replacement For:</p>
                <p>Sequence: <span className="text-[#06b6d4] font-mono font-bold">Pertemuan {activeSession.sequenceNumber}</span></p>
                <p>Original Scheduled Date: <span className="text-white font-mono">{new Date(activeSession.plannedDate).toLocaleDateString("id-ID", { dateStyle: 'medium' })}</span></p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Date</label>
                  <input
                    type="date"
                    value={replacementForm.plannedDate}
                    onChange={(e) => setReplacementForm({ ...replacementForm, plannedDate: e.target.value })}
                    required
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Start Time</label>
                  <input
                    type="text"
                    value={replacementForm.startTime}
                    onChange={(e) => setReplacementForm({ ...replacementForm, startTime: e.target.value })}
                    required
                    placeholder="HH:MM"
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">End Time</label>
                  <input
                    type="text"
                    value={replacementForm.endTime}
                    onChange={(e) => setReplacementForm({ ...replacementForm, endTime: e.target.value })}
                    required
                    placeholder="HH:MM"
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Session Mode</label>
                <select
                  value={replacementForm.sessionMode}
                  onChange={(e) => setReplacementForm({ ...replacementForm, sessionMode: e.target.value })}
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                >
                  <option value="OFFLINE">OFFLINE</option>
                  <option value="ONLINE">ONLINE</option>
                  <option value="HYBRID">HYBRID</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {replacementForm.sessionMode !== "ONLINE" && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Room/Building</label>
                    <input
                      type="text"
                      value={replacementForm.room}
                      onChange={(e) => setReplacementForm({ ...replacementForm, room: e.target.value })}
                      placeholder="e.g. Ruang Rapat Lt. 2"
                      className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30"
                    />
                  </div>
                )}
                {replacementForm.sessionMode !== "OFFLINE" && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Meeting Link</label>
                    <input
                      type="url"
                      value={replacementForm.meetingLink}
                      onChange={(e) => setReplacementForm({ ...replacementForm, meetingLink: e.target.value })}
                      placeholder="e.g. https://meet.google.com/..."
                      className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Notes</label>
                <textarea
                  value={replacementForm.notes}
                  onChange={(e) => setReplacementForm({ ...replacementForm, notes: e.target.value })}
                  placeholder="e.g., Sesi make-up sebagai pengganti pertemuan yang terlewat..."
                  rows={2}
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-sans resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowReplacement(false)}
                  className="px-4 py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#06b6d4] text-white text-xs font-semibold rounded-xl hover:bg-[#06b6d4]/90 transition-all cursor-pointer shadow-lg shadow-[#06b6d4]/10 active:scale-95"
                >
                  Create Replacement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Interactive Session Progress Tracking Modal */}
      {showProgressModal && activeSession && (
        <div className="fixed inset-0 bg-[#0b0c0e]/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg mx-4 rounded-3xl p-6 relative shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowProgressModal(false)}
              className="absolute top-4 right-4 text-[#c7c4d7] hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
            >
              <XCircle size={18} />
            </button>

            <form onSubmit={handleProgressSubmit} className="space-y-4 text-left">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Clock size={18} className="text-[#0d9488]" />
                <h3 className="font-bold text-sm text-white">Track Academic Execution Progress</h3>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-xs text-[#c7c4d7]">
                <p className="font-bold text-white mb-1">Session Info:</p>
                <p>Course: <span className="text-white font-medium">{selectedCourse?.title}</span></p>
                <p>Sequence: <span className="text-[#8083ff] font-mono font-bold">Pertemuan {activeSession.sequenceNumber}</span> ({activeSession.sessionType})</p>
                <p>Scheduled: <span className="text-white font-mono">{new Date(activeSession.plannedDate).toLocaleDateString("id-ID", { dateStyle: 'medium' })} • {activeSession.startTime} - {activeSession.endTime}</span></p>
              </div>

              {progressError && (
                <div className="p-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-xl text-[11px] text-[#ffb4ab] flex gap-2 items-start font-sans">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{progressError}</span>
                </div>
              )}

              {/* Progress State Selection */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Operational Execution State</label>
                <select
                  value={progressForm.state}
                  onChange={(e) => setProgressForm({ ...progressForm, state: e.target.value })}
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-sans"
                >
                  <option value="NOT_STARTED">Belum Terlaksana (NOT_STARTED)</option>
                  <option value="COMPLETED">Sudah Terlaksana (COMPLETED)</option>
                </select>
              </div>

              {/* Execution Timestamps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Actual Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={progressForm.actualStartTime}
                    onChange={(e) => setProgressForm({ ...progressForm, actualStartTime: e.target.value })}
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Actual End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={progressForm.actualEndTime}
                    onChange={(e) => setProgressForm({ ...progressForm, actualEndTime: e.target.value })}
                    className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Execution Notes */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Execution Notes / Report</label>
                <textarea
                  value={progressForm.notes}
                  onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })}
                  placeholder="e.g. Kelas disingkat karena rapat fakultas, dosen menerangkan bab 3..."
                  rows={2}
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-sans"
                />
              </div>

              {/* Reason (Audit Mutation Log) */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#c7c4d7]/70 font-mono">Reason for Mutation / Correction</label>
                <input
                  type="text"
                  value={progressForm.reason}
                  onChange={(e) => setProgressForm({ ...progressForm, reason: e.target.value })}
                  placeholder="e.g. Koreksi input progress oleh mahasiswa..."
                  className="w-full bg-[#111316] border border-white/5 rounded-xl px-3 py-2 text-xs text-[#e2e2e6] focus:outline-none focus:ring-1 focus:ring-[#c0c1ff]/30 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="px-4 py-2 border border-white/5 bg-white/5 text-xs font-semibold rounded-xl text-[#c7c4d7] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProgress}
                  className="px-4 py-2 bg-[#0d9488] text-white text-xs font-semibold rounded-xl hover:bg-[#0d9488]/90 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingProgress ? "Saving..." : "Save Progress"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
