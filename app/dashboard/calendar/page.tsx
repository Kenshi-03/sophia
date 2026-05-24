import React from "react"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { mockEvents } from "@/lib/db/mocks"
import CalendarWorkspace from "@/components/calendar/calendar-workspace"
import { CalendarEvent } from "@/types/calendar"

/** Shape returned by Prisma event query – keeps us free of generated-client imports */
interface DbEvent {
  id: string
  title: string
  description: string | null
  startTime: Date
  endTime: Date
  location: string | null
}

export default async function CalendarPage() {
  const session = await auth()
  const email = session?.user?.email || "user@sophia.local"

  // Check if Google credentials exist in environments
  const hasCredentials = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  )

  let events: CalendarEvent[] = []
  let dbUser = null

  try {
    dbUser = await prisma.user.findUnique({
      where: { email },
      include: {
        events: {
          orderBy: { startTime: "asc" },
        },
      },
    })

    // Fallback seed user
    if (!dbUser) {
      dbUser = await prisma.user.findFirst({
        include: {
          events: {
            orderBy: { startTime: "asc" },
          },
        },
      })
    }

    if (dbUser) {
      events = dbUser.events.map((event: DbEvent) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.location,
        isFocusMode: event.title.toLowerCase().includes("focus") || event.title.toLowerCase().includes("deep work") || event.title.toLowerCase().includes("sprint"),
        cognitiveLoad: event.title.toLowerCase().includes("sprint") ? 80 : 35,
        tags: event.title.toLowerCase().includes("sprint") ? ["coding", "sprint"] : ["routine"],
      }))
    }
  } catch (error) {
    console.warn("Database connection could not be established in Calendar page. Falling back to mocks.", error)
  }

  // Fallback to rich mock data if empty
  if (events.length === 0) {
    // Map dates to ISO strings for serialization
    events = mockEvents.map((event) => ({
      ...event,
      startTime: new Date(event.startTime).toISOString(),
      endTime: new Date(event.endTime).toISOString(),
    }))
  }

  return <CalendarWorkspace initialEvents={events} hasCredentials={hasCredentials} />
}
