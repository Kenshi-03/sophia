import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { 
  shiftCourseSessions, 
  logTimelineMutation, 
  combineDateAndTime 
} from "@/lib/academic/academic";
import { getOrCreateAcademicConfig } from "@/lib/settings/category-seeding";
import { deleteGoogleEvent } from "@/lib/google/calendar/delete-event";
import { updateGoogleEvent } from "@/lib/google/calendar/update-event";
import { invalidateUserCache } from "@/lib/redis";
import { CourseSessionStatus, TimelineMutationType } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      action, 
      newDate, 
      startTime, 
      endTime, 
      daysToShift = 7, 
      bypassCooldown = false, 
      reason 
    } = body;

    if (!action || !["SKIP", "RESCHEDULE", "SHIFT"].includes(action)) {
      return NextResponse.json({ error: "Action tidak valid." }, { status: 400 });
    }

    // Fetch session details
    const session = await prisma.courseSession.findFirst({
      where: { id, deletedAt: null },
      include: {
        course: true,
      },
    });

    if (!session || session.course.userId !== user.id) {
      return NextResponse.json({ error: "Sesi kuliah tidak ditemukan." }, { status: 404 });
    }

    // Resolve calendar configs and user details
    const config = await getOrCreateAcademicConfig(user.id);
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        accounts: {
          where: { provider: "google" },
        },
      },
    });

    const hasGoogleAccount = dbUser && dbUser.accounts.length > 0;
    const isGoogleCalValid = config.googleCalendarId && !config.googleCalendarId.startsWith("local-");

    if (action === "SKIP") {
      const prevState = {
        status: session.status,
      };

      // A. SKIP Session
      await prisma.$transaction(async (tx) => {
        // Update CourseSession status to SKIPPED
        await tx.courseSession.update({
          where: { id: session.id },
          data: {
            status: CourseSessionStatus.SKIPPED,
          },
        });

        // Delete local Event record
        await tx.event.deleteMany({
          where: { courseSessionId: session.id },
        });
      });

      // Fetch the events we want to delete from Google
      const associatedEvents = await prisma.event.findMany({
        where: { courseSessionId: session.id },
      });

      // Sync removal to Google Calendar
      if (hasGoogleAccount && isGoogleCalValid) {
        for (const event of associatedEvents) {
          if (event.googleEventId) {
            try {
              await deleteGoogleEvent(user.id, config.googleCalendarId, event.googleEventId);
            } catch (err) {
              logger.error(`Failed to delete Google Calendar event ${event.googleEventId} on SKIP:`, err);
            }
          }
        }
      }

      await logTimelineMutation(
        user.id,
        session.courseId,
        TimelineMutationType.SKIP,
        [session.sequenceNumber],
        prevState,
        { status: CourseSessionStatus.SKIPPED },
        reason || "Session skipped.",
        session.id
      );

      // Invalidate user cognitive briefing cache
      await invalidateUserCache(user.id, "cognitive");

      return NextResponse.json({ success: true });
    }

    if (action === "RESCHEDULE") {
      if (!newDate || !startTime || !endTime) {
        return NextResponse.json({ error: "Missing required fields for rescheduling." }, { status: 400 });
      }

      const prevState = {
        plannedDate: session.plannedDate.toISOString(),
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
      };

      const targetDate = new Date(newDate);
      const eventStart = combineDateAndTime(targetDate, startTime);
      const eventEnd = combineDateAndTime(targetDate, endTime);

      // B. RESCHEDULE Session
      await prisma.$transaction(async (tx) => {
        // Update CourseSession details
        await tx.courseSession.update({
          where: { id: session.id },
          data: {
            plannedDate: targetDate,
            startTime,
            endTime,
            status: CourseSessionStatus.RESCHEDULED,
          },
        });

        // Update local Event records
        await tx.event.updateMany({
          where: { courseSessionId: session.id },
          data: {
            startTime: eventStart,
            endTime: eventEnd,
          },
        });
      });

      // Fetch the updated event to sync with Google
      const associatedEvent = await prisma.event.findFirst({
        where: { courseSessionId: session.id },
      });

      if (associatedEvent && hasGoogleAccount && isGoogleCalValid && associatedEvent.googleEventId) {
        try {
          await updateGoogleEvent(user.id, config.googleCalendarId, associatedEvent.googleEventId, {
            title: associatedEvent.title,
            description: associatedEvent.description,
            startTime: eventStart,
            endTime: eventEnd,
            location: associatedEvent.location,
          });
        } catch (err) {
          logger.error(`Failed to update Google Calendar event ${associatedEvent.googleEventId} on RESCHEDULE:`, err);
        }
      }

      const newState = {
        plannedDate: targetDate.toISOString(),
        startTime,
        endTime,
        status: CourseSessionStatus.RESCHEDULED,
      };

      await logTimelineMutation(
        user.id,
        session.courseId,
        TimelineMutationType.RESCHEDULE,
        [session.sequenceNumber],
        prevState,
        newState,
        reason || "Session rescheduled.",
        session.id
      );

      // Invalidate user cognitive briefing cache
      await invalidateUserCache(user.id, "cognitive");

      return NextResponse.json({ success: true });
    }

    if (action === "SHIFT") {
      // C. SHIFT remaining sessions forward
      try {
        const result = await shiftCourseSessions(
          user.id,
          session.courseId,
          session.sequenceNumber,
          Number(daysToShift),
          bypassCooldown,
          reason
        );

        // Invalidate user cognitive briefing cache
        await invalidateUserCache(user.id, "cognitive");

        return NextResponse.json({ success: result.success, updatedCount: result.updatedCount });
      } catch (err: any) {
        if (err.message && err.message.startsWith("COOLDOWN_ACTIVE")) {
          return NextResponse.json({ error: "COOLDOWN_ACTIVE", message: err.message }, { status: 409 });
        }
        throw err;
      }
    }

    return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/academic/sessions/[id]/cancel error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
