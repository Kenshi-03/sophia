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
    initialCategories = await prisma.calendarConfig.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { cognitiveCategory: "asc" },
    })

    // Fetch events with categories
    const dbEvents = await prisma.event.findMany({
      where: { userId: user.id },
      include: { calendar: true },
      orderBy: { startTime: "asc" },
    })

    initialEvents = dbEvents.map((event) => {
      const rawType = event.calendar?.categoryType || "GENERAL"
      
      // Safe Fallback Rule: If linked config is soft-deleted or inactive, fallback type to GENERAL
      const isConfigValid = event.calendar && event.calendar.isActive && !event.calendar.deletedAt
      const resolvedType = isConfigValid ? rawType : "GENERAL"
      const catType = resolvedType.toLowerCase().replace("_", "-")

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
        categoryName: event.calendar?.cognitiveCategory || "General",
        categoryType: catType,
        isFocusMode,
        cognitiveLoad,
        tags: event.calendar?.cognitiveCategory ? [event.calendar.cognitiveCategory.toLowerCase()] : [],
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
