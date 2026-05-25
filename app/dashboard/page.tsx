import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import {
  mockUser,
  mockTasks,
  mockEvents,
  mockMemories,
  mockAgents,
} from "@/lib/db/mocks"
import WelcomeHeader from "@/components/dashboard/welcome-header"
import CurrentFocusCard from "@/components/dashboard/current-focus-card"
import ActiveAgentsWidget from "@/components/dashboard/active-agents-widget"
import IntegratedScheduleWidget from "@/components/dashboard/integrated-schedule-widget"
import RecentThoughtsWidget from "@/components/dashboard/recent-thoughts-widget"
import { DashboardTask } from "@/types/dashboard"
import { CalendarEvent } from "@/types/calendar"
import { MemoryNode } from "@/types/memory"

export default async function DashboardPage() {
  const session = await auth()
  const email = session?.user?.email || "user@sophia.local"

  let dbUser = null
  let tasks: DashboardTask[] = []
  let events: CalendarEvent[] = []
  let memories: MemoryNode[] = []

  try {
    dbUser = await prisma.user.findUnique({
      where: { email },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
        },
        events: {
          include: { calendar: true },
          orderBy: { startTime: "asc" },
        },
        memories: {
          orderBy: { createdAt: "desc" },
          take: 2,
        },
      },
    })

    // Graceful fallback to the first seeded user if the session user is not found
    if (!dbUser) {
      dbUser = await prisma.user.findFirst({
        include: {
          tasks: {
            orderBy: { createdAt: "desc" },
          },
          events: {
            include: { calendar: true },
            orderBy: { startTime: "asc" },
          },
          memories: {
            orderBy: { createdAt: "desc" },
            take: 2,
          },
        },
      })
    }

    if (dbUser) {
      tasks = dbUser.tasks.map((t: any) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      }))
      
      events = dbUser.events.map((e: any) => {
        const catType = e.calendar?.categoryType || ""
        let cognitiveLoad = 35
        if (catType === "exam") cognitiveLoad = 80
        else if (catType === "deep-work") cognitiveLoad = 75
        else if (catType === "health") cognitiveLoad = -15
        else if (catType === "recovery") cognitiveLoad = -30
        else if (catType === "social") cognitiveLoad = -10

        const isFocusMode = catType === "deep-work" || e.title.toLowerCase().includes("focus")

        return {
          id: e.id,
          title: e.title,
          description: e.description,
          startTime: e.startTime.toISOString(),
          endTime: e.endTime.toISOString(),
          location: e.location,
          googleEventId: e.googleEventId,
          calendarId: e.calendarId,
          color: e.calendar?.color || "#8083ff",
          categoryName: e.calendar?.name || "General",
          categoryType: catType,
          isFocusMode,
          cognitiveLoad,
          tags: e.calendar?.name ? [e.calendar.name.toLowerCase()] : [],
        }
      })

      memories = dbUser.memories.map((m: any) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      }))
    }
  } catch (error) {
    console.warn("Database connection could not be established. Falling back to local mock data.", error)
  }

  // Seeding mock fallbacks if database returns empty or fails
  const name = dbUser?.name || mockUser.name
  
  if (tasks.length === 0) {
    tasks = mockTasks
  }
  
  if (events.length === 0) {
    events = mockEvents.map((event) => {
      const isFocus = event.title.toLowerCase().includes("focus") || event.title.toLowerCase().includes("deep work")
      return {
        ...event,
        startTime: new Date(event.startTime).toISOString(),
        endTime: new Date(event.endTime).toISOString(),
        calendarId: isFocus ? "mock-cat-1" : "mock-cat-2",
        color: isFocus ? "#2563EB" : "#3B82F6",
        categoryName: isFocus ? "Deep Work" : "Jadwal Kelas",
        categoryType: isFocus ? "deep-work" : "academic",
        isFocusMode: isFocus,
        cognitiveLoad: isFocus ? 75 : 35,
        tags: isFocus ? ["deep-work"] : ["academic"],
      }
    })
  }

  if (memories.length === 0) {
    memories = mockMemories
  }

  // Find active focus task (first incomplete task)
  const activeFocusTask = tasks.find((t) => !t.completed) || {
    id: "no-task",
    title: "Tidak ada fokus aktif",
    content: "Buat tugas baru di ruang kerja Anda untuk mulai melacak sesi fokus kognitif.",
    completed: false,
    userId: "mock-user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Calculate statistics
  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Calculate dynamic cognitive load index
  const incompleteCount = tasks.filter((t) => !t.completed).length
  
  // Filter events scheduled for today
  const today = new Date()
  const todayEvents = events.filter((e) => {
    const eventDate = new Date(e.startTime)
    return (
      eventDate.getFullYear() === today.getFullYear() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getDate() === today.getDate()
    )
  })

  // Compute category-based weights for today's events
  let calendarLoadSum = 0
  todayEvents.forEach((e) => {
    const catType = e.categoryType || ""
    if (catType === "exam") calendarLoadSum += 40      // High stress exam adds load
    else if (catType === "deep-work") calendarLoadSum += 25        // Intellect intensive adds load
    else if (catType === "health") calendarLoadSum -= 10   // Workout aids recovery
    else if (catType === "recovery") calendarLoadSum -= 20             // Rest aids recovery
    else if (catType === "social") calendarLoadSum -= 5    // Leisure aids recovery
    else calendarLoadSum += 10                                     // Default schedule impact
  })

  // Formula: Tasks load + Calendar load, capped at 100%, minimum 0%
  const cognitiveLoad = Math.max(0, Math.min(incompleteCount * 15 + calendarLoadSum, 100))

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Header Greeting & Cognitive Load Indicator */}
      <WelcomeHeader name={name} cognitiveLoad={cognitiveLoad} />

      {/* Main Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Module A: Current Focus Card (Col span: 8) */}
        <CurrentFocusCard task={activeFocusTask} progressPercent={progressPercent} />

        {/* Module B: System Status / Active Agents (Col span: 4) */}
        <ActiveAgentsWidget agents={mockAgents} />

        {/* Module C: Integrated Schedule (Col span: 5) */}
        <IntegratedScheduleWidget events={events} />

        {/* Module D: Recent Thoughts / Notes Grid (Col span: 7) */}
        <RecentThoughtsWidget memories={memories} />
      </div>
    </div>
  )
}