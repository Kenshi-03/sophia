import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { cognitiveCategory, categoryType, googleCalendarId, description, color, isActive, isDefault } = body

    const existing = await prisma.calendarConfig.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 })
    }

    // If setting isDefault to true, un-default others for the user
    if (isDefault) {
      await prisma.calendarConfig.updateMany({
        where: { userId: user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.calendarConfig.update({
      where: { id },
      data: {
        cognitiveCategory: cognitiveCategory !== undefined ? cognitiveCategory : existing.cognitiveCategory,
        categoryType: categoryType !== undefined ? categoryType : existing.categoryType,
        googleCalendarId: googleCalendarId !== undefined ? googleCalendarId : existing.googleCalendarId,
        description: description !== undefined ? description : existing.description,
        color: color !== undefined ? color : existing.color,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
      },
    })

    return NextResponse.json({ success: true, config: updated })
  } catch (error: any) {
    console.error("PATCH /api/settings/calendar-configs/[id] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existing = await prisma.calendarConfig.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 })
    }

    // Soft delete by setting deletedAt
    const softDeleted = await prisma.calendarConfig.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isDefault: false,
      },
    })

    // If the soft-deleted config was default, set another active one as default
    if (existing.isDefault) {
      const fallback = await prisma.calendarConfig.findFirst({
        where: { userId: user.id, deletedAt: null, isActive: true },
      })
      if (fallback) {
        await prisma.calendarConfig.update({
          where: { id: fallback.id },
          data: { isDefault: true },
        })
      }
    }

    return NextResponse.json({ success: true, config: softDeleted })
  } catch (error: any) {
    console.error("DELETE /api/settings/calendar-configs/[id] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
