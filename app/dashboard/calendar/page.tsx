import React from "react"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { mockEvents } from "@/lib/db/mocks"
import CalendarWorkspace from "@/components/calendar/calendar-workspace"
import { CalendarEvent } from "@/types/calendar"
import { seedDefaultCategoriesForUser } from "@/lib/settings/category-seeding"

export default async function CalendarPage() {
  const session = await auth()
  const email = session?.user?.email || "user@sophia.local"

  // Check if Google credentials exist in environment
  const hasCredentials = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  )

  let initialEvents: CalendarEvent[] = []
  let initialCategories: any[] = []
  let dbUser = null

  try {
    dbUser = await prisma.user.findUnique({
      where: { email },
    })

    // Fallback first user if session user not found
    if (!dbUser) {
      dbUser = await prisma.user.findFirst()
    }

    if (dbUser) {
      // Server-side seeding of categories
      await seedDefaultCategoriesForUser(dbUser.id)

      // Fetch categories
      initialCategories = await prisma.calendarCategory.findMany({
        where: { userId: dbUser.id },
        orderBy: { name: "asc" },
      })

      // Fetch events with categories
      const dbEvents = await prisma.event.findMany({
        where: { userId: dbUser.id },
        include: { calendar: true },
        orderBy: { startTime: "asc" },
      })

      initialEvents = dbEvents.map((event) => {
        const catType = event.calendar?.categoryType || ""
        let cognitiveLoad = 35
        if (catType === "exam-evaluation") cognitiveLoad = 80
        else if (catType === "deep-work") cognitiveLoad = 75
        else if (catType === "workout-health") cognitiveLoad = -15
        else if (catType === "rest") cognitiveLoad = -30
        else if (catType === "leisure-social") cognitiveLoad = -10

        const isFocusMode = catType === "deep-work" || event.title.toLowerCase().includes("focus")

        return {
          id: event.id,
          title: event.title,
          description: event.description,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          location: event.location,
          googleEventId: event.googleEventId,
          calendarId: event.calendarId,
          color: event.calendar?.color || "#8083ff",
          categoryName: event.calendar?.name || "General",
          categoryType: catType,
          isFocusMode,
          cognitiveLoad,
          tags: event.calendar?.name ? [event.calendar.name.toLowerCase()] : [],
        }
      })
    }
  } catch (error) {
    console.warn("Database connection could not be established in Calendar page. Falling back to mocks.", error)
  }

  // Fallback to rich mock data if empty
  if (initialEvents.length === 0) {
    // Seed dummy categories for mock data rendering
    initialCategories = [
      { id: "mock-cat-1", name: "Deep Work", color: "#8083ff", categoryType: "deep-work" },
      { id: "mock-cat-2", name: "Jadwal Kelas", color: "#c0c1ff", categoryType: "class-schedule" },
      { id: "mock-cat-3", name: "Workout & Kesehatan", color: "#4edea3", categoryType: "workout-health" },
      { id: "mock-cat-4", name: "Istirahat", color: "#282a2d", categoryType: "rest" },
    ]

    initialEvents = mockEvents.map((event) => {
      const isFocus = event.title.toLowerCase().includes("focus") || event.title.toLowerCase().includes("deep work")
      return {
        ...event,
        startTime: new Date(event.startTime).toISOString(),
        endTime: new Date(event.endTime).toISOString(),
        calendarId: isFocus ? "mock-cat-1" : "mock-cat-2",
        color: isFocus ? "#8083ff" : "#c0c1ff",
        categoryName: isFocus ? "Deep Work" : "Jadwal Kelas",
        categoryType: isFocus ? "deep-work" : "class-schedule",
        isFocusMode: isFocus,
        cognitiveLoad: isFocus ? 75 : 35,
        tags: isFocus ? ["deep-work"] : ["class-schedule"],
      }
    })
  }

  return (
    <CalendarWorkspace
      initialEvents={initialEvents}
      initialCategories={initialCategories}
      hasCredentials={hasCredentials}
    />
  )
}
