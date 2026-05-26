import React from "react"
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import CalendarWorkspace from "@/components/calendar/calendar-workspace"
import { CalendarEvent } from "@/types/calendar"
import { seedDefaultCategoriesForUser } from "@/lib/settings/category-seeding"

export default async function CalendarPage() {
  const { session, user } = await requireSession()

  // Check if Google credentials exist in environment
  const hasCredentials = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  )

  let initialEvents: CalendarEvent[] = []
  let initialCategories: any[] = []

  try {
    // Server-side seeding of categories
    await seedDefaultCategoriesForUser(user.id)

    // Fetch categories
    initialCategories = await prisma.calendarCategory.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    })

    // Fetch events with categories
    const dbEvents = await prisma.event.findMany({
      where: { userId: user.id },
      include: { calendar: true },
      orderBy: { startTime: "asc" },
    })

    initialEvents = dbEvents.map((event) => {
      const catType = event.calendar?.categoryType || ""
      let cognitiveLoad = 35
      if (catType === "exam") cognitiveLoad = 80
      else if (catType === "deep-work") cognitiveLoad = 75
      else if (catType === "health") cognitiveLoad = -15
      else if (catType === "recovery") cognitiveLoad = -30
      else if (catType === "social") cognitiveLoad = -10

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
  } catch (error) {
    console.error("Database connection could not be established in Calendar page.", error)
  }

  return (
    <CalendarWorkspace
      initialEvents={initialEvents}
      initialCategories={initialCategories}
      hasCredentials={hasCredentials}
    />
  )
}
