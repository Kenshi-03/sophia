import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const configs = await prisma.calendarConfig.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ success: true, configs })
  } catch (error: any) {
    console.error("GET /api/settings/calendar-configs error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { cognitiveCategory, categoryType, googleCalendarId, description, color, isActive, isDefault } = body

    if (!cognitiveCategory || !categoryType || !googleCalendarId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // If setting isDefault to true, un-default others for the user
    if (isDefault) {
      await prisma.calendarConfig.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const config = await prisma.calendarConfig.create({
      data: {
        userId: user.id,
        cognitiveCategory,
        categoryType,
        googleCalendarId,
        description: description || null,
        color: color || "#8083ff",
        isActive: isActive !== undefined ? isActive : true,
        isDefault: isDefault !== undefined ? isDefault : false,
        isSeededDefault: false,
      },
    })

    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    console.error("POST /api/settings/calendar-configs error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
