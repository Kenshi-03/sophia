import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { updateGoogleEvent } from "@/lib/google/calendar/update-event";
import { deleteGoogleEvent } from "@/lib/google/calendar/delete-event";
import { invalidateUserCache } from "@/lib/redis";

// PATCH: Update an existing event and sync edits to Google Calendar
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        accounts: {
          where: { provider: "google" },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, startTime, endTime, location, calendarId } = body;

    const existingEvent = await prisma.event.findUnique({
      where: { id, userId: dbUser.id },
      include: { calendar: true },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify calendarId if changed
    const targetCalendarId = calendarId || existingEvent.calendarId;
    const category = await prisma.calendarConfig.findFirst({
      where: { id: targetCalendarId, userId: dbUser.id },
    });

    if (!category) {
      return NextResponse.json({ error: "Kategori kalender tidak ditemukan." }, { status: 400 });
    }

    // Active/integrity validation during event update:
    // Reject event update if CalendarConfig is inactive, soft-deleted, or has invalid mapping
    if (!category.isActive) {
      return NextResponse.json({ error: "Kategori kognitif yang dipilih sedang tidak aktif." }, { status: 400 });
    }

    if (category.deletedAt !== null) {
      return NextResponse.json({ error: "Kategori kognitif yang dipilih telah dihapus." }, { status: 400 });
    }

    if (!category.googleCalendarId || category.googleCalendarId.trim() === "") {
      return NextResponse.json({ error: "Kategori kognitif tidak memiliki pemetaan Google Calendar yang valid." }, { status: 400 });
    }

    // 1. Update event locally
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingEvent.title,
        description: description !== undefined ? description : existingEvent.description,
        startTime: startTime ? new Date(startTime) : existingEvent.startTime,
        endTime: endTime ? new Date(endTime) : existingEvent.endTime,
        location: location !== undefined ? location : existingEvent.location,
        calendarId: targetCalendarId,
      },
    });

    // 2. Sync edits to Google Calendar if credentials exist
    const hasGoogleAccount = dbUser.accounts.length > 0;
    const isGoogleCalValid = category.googleCalendarId && !category.googleCalendarId.startsWith("local-");

    if (hasGoogleAccount && isGoogleCalValid && existingEvent.googleEventId) {
      try {
        await updateGoogleEvent(dbUser.id, category.googleCalendarId, existingEvent.googleEventId, {
          title: updatedEvent.title,
          description: updatedEvent.description,
          startTime: updatedEvent.startTime,
          endTime: updatedEvent.endTime,
          location: updatedEvent.location,
        });
      } catch (err) {
        console.error(`Failed to update event ${id} on Google Calendar:`, err);
      }
    }

    await invalidateUserCache(dbUser.id, "cognitive");

    return NextResponse.json({
      success: true,
      event: {
        ...updatedEvent,
        startTime: updatedEvent.startTime.toISOString(),
        endTime: updatedEvent.endTime.toISOString(),
      },
    });
  } catch (error) {
    console.error("PATCH /api/calendar/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Delete an event locally and remove it from Google Calendar
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        accounts: {
          where: { provider: "google" },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingEvent = await prisma.event.findUnique({
      where: { id, userId: dbUser.id },
      include: { calendar: true },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // 1. Delete on Google Calendar if valid
    const hasGoogleAccount = dbUser.accounts.length > 0;
    const isGoogleCalValid =
      existingEvent.calendar?.googleCalendarId &&
      !existingEvent.calendar.googleCalendarId.startsWith("local-");

    if (hasGoogleAccount && isGoogleCalValid && existingEvent.googleEventId) {
      try {
        await deleteGoogleEvent(
          dbUser.id,
          existingEvent.calendar.googleCalendarId,
          existingEvent.googleEventId
        );
      } catch (err) {
        console.error(`Failed to delete event ${id} on Google Calendar:`, err);
      }
    }

    // 2. Delete locally
    await prisma.event.delete({
      where: { id },
    });

    await invalidateUserCache(dbUser.id, "cognitive");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/calendar/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
