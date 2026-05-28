import { prisma } from "@/lib/db/prisma"
import { getSettings } from "@/lib/settings/settings"
import { CalendarEvent } from "@/types/calendar"

export interface CognitiveContextMetrics {
  score: number
  state: "low" | "medium" | "high"
  focusMinutes: number
  recoveryMinutes: number
  burnoutRisk: "low" | "medium" | "high"
  burnoutWarnings: string[]
  focusFragmentation: number
  contextSwitchingCount: number
}

export interface CognitiveContext {
  userName: string
  userPreferences: {
    aiModel: string
    aiMode: string
    productivityIntensity: string
    cognitiveThreshold: number
  }
  metrics: CognitiveContextMetrics
  categories: {
    id: string
    name: string
    categoryType: string | null
    color: string | null
  }[]
  events: {
    id: string
    title: string
    startTime: string
    endTime: string
    categoryName: string
    categoryType: string
    durationMinutes: number
    courseSession?: {
      sessionType: string
      sessionMode: string
    } | null
  }[]
}

/**
 * Builds a comprehensive cognitive context summary for a user on a given day.
 */
export async function buildCognitiveContext(
  userId: string,
  targetDate: Date = new Date()
): Promise<CognitiveContext> {
  // 1. Fetch User & Settings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })

  const settings = await getSettings(userId)

  // 2. Fetch User Configurations
  const dbCategories = await prisma.calendarConfig.findMany({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      cognitiveCategory: true,
      categoryType: true,
      color: true,
    },
  })

  const categories = dbCategories.map(c => ({
    id: c.id,
    name: c.cognitiveCategory,
    categoryType: c.categoryType,
    color: c.color,
  }))

  // 3. Fetch Events Scheduled for the Target Date
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  const dbEvents = await prisma.event.findMany({
    where: {
      userId,
      startTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      calendar: true,
      courseSession: true,
    },
    orderBy: {
      startTime: "asc",
    },
  })

  // 4. Map & Format Raw Event Details with Safe Fallbacks
  const events = dbEvents.map((e) => {
    const durationMinutes = Math.round(
      (e.endTime.getTime() - e.startTime.getTime()) / 60000
    )

    const rawType = e.calendar?.categoryType || "GENERAL"
    // Safe Fallback Rule: If linked config is soft-deleted or inactive, fallback type to GENERAL
    const isConfigValid = e.calendar && e.calendar.isActive && !e.calendar.deletedAt
    const resolvedType = isConfigValid ? rawType : "GENERAL"
    const catType = resolvedType.toLowerCase().replace("_", "-")

    if (e.calendar && (!e.calendar.isActive || e.calendar.deletedAt)) {
      console.warn(`[Cognitive Diagnostics Alert] Event "${e.title}" (id: ${e.id}) references an inactive or deleted calendar configuration. Falling back semantic classification to GENERAL.`);
    }

    return {
      id: e.id,
      title: e.title,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime.toISOString(),
      categoryName: e.calendar?.cognitiveCategory || "General",
      categoryType: catType,
      durationMinutes,
      courseSession: e.courseSession ? {
        sessionType: e.courseSession.sessionType,
        sessionMode: e.courseSession.sessionMode,
      } : null,
    }
  })

  // 5. Calculate Focus & Recovery Durations
  let focusMinutes = 0
  let recoveryMinutes = 0
  let examCount = 0
  let deadlineCount = 0

  events.forEach((e) => {
    const type = e.categoryType
    const titleLower = e.title.toLowerCase()
    
    // Focus activities: deep-work, academic, exams
    // Academic Course Sessions (except HOLIDAY) are focus activities
    const isAcademicFocus = e.courseSession && e.courseSession.sessionType !== "HOLIDAY";
    
    if (isAcademicFocus || type === "deep-work" || type === "academic" || type === "exam") {
      focusMinutes += e.durationMinutes
    } else if (titleLower.includes("focus") || titleLower.includes("deep") || titleLower.includes("belajar") || titleLower.includes("kuliah")) {
      focusMinutes += e.durationMinutes
    }
    
    // Recovery activities: sleep, workout, ibadah, leisure/social
    if (type === "recovery" || type === "health" || type === "spiritual" || type === "social") {
      recoveryMinutes += e.durationMinutes
    } else if (titleLower.includes("istirahat") || titleLower.includes("workout") || titleLower.includes("ibadah") || titleLower.includes("relax")) {
      recoveryMinutes += e.durationMinutes
    }

    // Exam Counting (including CourseSession MID_EXAM and FINAL_EXAM)
    const isAcademicExam = e.courseSession && (e.courseSession.sessionType === "MID_EXAM" || e.courseSession.sessionType === "FINAL_EXAM");
    if (isAcademicExam || type === "exam" || titleLower.includes("ujian") || titleLower.includes("evaluasi") || titleLower.includes("test") || titleLower.includes("uts") || titleLower.includes("uas")) {
      examCount++
    }

    // Deadline/Quiz/Presentation Counting
    const isAcademicDeadline = e.courseSession && (e.courseSession.sessionType === "QUIZ" || e.courseSession.sessionType === "PRESENTATION");
    if (isAcademicDeadline || type === "deadline" || titleLower.includes("deadline") || titleLower.includes("tugas")) {
      deadlineCount++
    }
  })

  // 6. Calculate Context Switching Count
  let contextSwitchingCount = 0
  for (let i = 1; i < events.length; i++) {
    if (events[i].categoryName !== events[i - 1].categoryName) {
      contextSwitchingCount++
    }
  }

  // 7. Calculate Focus Fragmentation (Gaps between events)
  let shortGapsCount = 0
  let totalGaps = 0
  for (let i = 1; i < dbEvents.length; i++) {
    const prevEnd = dbEvents[i - 1].endTime.getTime()
    const nextStart = dbEvents[i].startTime.getTime()
    const gapMinutes = Math.round((nextStart - prevEnd) / 60000)

    if (gapMinutes > 0) {
      totalGaps++
      // If gap is between 5 and 60 mins, focus is interrupted/fragmented
      if (gapMinutes <= 60) {
        shortGapsCount++
      }
    }
  }
  const focusFragmentation = totalGaps > 0 
    ? Math.round((shortGapsCount / totalGaps) * 100)
    : 0

  // 8. Compute Cognitive Load Score (0-100)
  // Base load begins at 10% if there are events scheduled
  let score = events.length > 0 ? 10 : 0
  
  // Add per event scheduled (+5% per event, max +25%)
  score += Math.min(events.length * 5, 25)

  // Focus hour weight: +20% per hour of Deep Work/Academic focus
  const focusHours = focusMinutes / 60
  score += focusHours * 20

  // Exams: +30% per exam event
  score += examCount * 30

  // Deadlines: +15% per deadline event
  score += deadlineCount * 15

  // Context switching penalty: +5% per category transition
  score += contextSwitchingCount * 5

  // Deduct for Recovery:
  // - Workout: -10% per hour
  // - Rest/Sleep: -20% per hour
  events.forEach((e) => {
    const type = e.categoryType
    const hours = e.durationMinutes / 60
    if (type === "health") {
      score -= hours * 10
    } else if (type === "recovery") {
      score -= hours * 20
    } else if (type === "social" || type === "spiritual") {
      score -= hours * 5
    }
  })

  // Normalization
  score = Math.max(0, Math.min(Math.round(score), 100))

  // Determine state
  let state: "low" | "medium" | "high" = "low"
  if (score > 70) state = "high"
  else if (score > 35) state = "medium"

  // 9. Detect Burnout Risks & Generate Empathic Warning Logs
  const burnoutWarnings: string[] = []

  // Check for consecutive focus blocks without recovery
  let consecutiveFocusMinutes = 0
  let maxConsecutiveFocus = 0
  for (let i = 0; i < dbEvents.length; i++) {
    const e = dbEvents[i]
    const rawType = e.calendar?.categoryType || "GENERAL"
    const isConfigValid = e.calendar && e.calendar.isActive && !e.calendar.deletedAt
    const resolvedType = isConfigValid ? rawType : "GENERAL"
    const type = resolvedType.toLowerCase().replace("_", "-")
    const duration = Math.round((e.endTime.getTime() - e.startTime.getTime()) / 60000)

    if (type === "deep-work" || type === "academic" || type === "exam") {
      consecutiveFocusMinutes += duration
      if (consecutiveFocusMinutes > maxConsecutiveFocus) {
        maxConsecutiveFocus = consecutiveFocusMinutes
      }
    } else if (type === "recovery" || type === "health") {
      // Reset on recovery
      consecutiveFocusMinutes = 0
    }
  }

  if (maxConsecutiveFocus >= 180) {
    burnoutWarnings.push("Terdeteksi durasi Deep Work berturut-turut melebihi 3 jam tanpa jeda istirahat.")
  }

  if (focusMinutes >= 360) {
    burnoutWarnings.push("Durasi pengerjaan mendalam (Deep Work) hari ini sangat tinggi (melebihi 6 jam).")
  }

  if (focusMinutes > 120 && recoveryMinutes < 30) {
    burnoutWarnings.push("Alokasi waktu pemulihan (istirahat/olahraga) sangat minim dibandingkan porsi fokus Anda.")
  }

  if (contextSwitchingCount >= 4) {
    burnoutWarnings.push("Perpindahan konteks (context switching) terlalu sering, berisiko menguras fokus mental.")
  }

  if (examCount + deadlineCount >= 2) {
    burnoutWarnings.push("Anda menghadapi beberapa deadline tugas atau evaluasi penting hari ini.")
  }

  // Risk Rating
  let burnoutRisk: "low" | "medium" | "high" = "low"
  if (burnoutWarnings.length >= 3 || score >= 80) {
    burnoutRisk = "high"
  } else if (burnoutWarnings.length >= 1 || score >= 50) {
    burnoutRisk = "medium"
  }

  return {
    userName: user?.name || "SOPHIA Dev User",
    userPreferences: {
      aiModel: settings.aiModel,
      aiMode: settings.aiMode,
      productivityIntensity: settings.productivityIntensity,
      cognitiveThreshold: settings.cognitiveThreshold,
    },
    metrics: {
      score,
      state,
      focusMinutes,
      recoveryMinutes,
      burnoutRisk,
      burnoutWarnings,
      focusFragmentation,
      contextSwitchingCount,
    },
    categories,
    events,
  }
}
