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
      tasks = dbUser.tasks.map((t:any) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      }))
      events = dbUser.events.map((e) => ({
        ...e,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
      }))
      memories = dbUser.memories.map((m) => ({
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
    events = mockEvents
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
  // Formula: (Incomplete Tasks * 15%) + (Events Today * 10%), capped at 100%
  const incompleteCount = tasks.filter((t) => !t.completed).length
  const cognitiveLoad = Math.min(incompleteCount * 15 + events.length * 10, 100)

  return (
    <div className="space-y-8 pb-12">
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