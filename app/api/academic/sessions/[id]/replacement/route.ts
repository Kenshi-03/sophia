import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { combineDateAndTime, logTimelineMutation } from "@/lib/academic/academic";
import { getOrCreateAcademicConfig } from "@/lib/settings/category-seeding";
import { createGoogleEvent } from "@/lib/google/calendar/create-event";
import { invalidateUserCache } from "@/lib/redis";
import { CourseSessionMode, CourseSessionType, CourseSessionStatus, SessionProgressState, TimelineMutationType } from "@prisma/client";
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
      plannedDate,
      startTime,
      endTime,
      room,
      meetingLink,
      sessionMode,
      notes,
    } = body;

    if (!plannedDate || !startTime || !endTime || !sessionMode) {
      return NextResponse.json({ error: "Missing required fields for replacement session." }, { status: 400 });
    }

    // 1. Fetch parent session to replace
    const parentSession = await prisma.courseSession.findFirst({
      where: { id, deletedAt: null },
      include: { course: true },
    });

    if (!parentSession || parentSession.course.userId !== user.id) {
      return NextResponse.json({ error: "Sesi asal tidak ditemukan." }, { status: 404 });
    }

    // 2. Perform DB creation transaction
    const targetPlannedDate = new Date(plannedDate);
    const targetSessionMode = sessionMode as CourseSessionMode;
    const targetRoom = targetSessionMode !== CourseSessionMode.ONLINE ? room : null;
    const targetMeetingLink = targetSessionMode !== CourseSessionMode.OFFLINE ? meetingLink : null;

    const { newSession, newEvent } = await prisma.$transaction(async (tx) => {
      // Create CourseSession record
      const newSession = await tx.courseSession.create({
        data: {
          courseId: parentSession.courseId,
          sequenceNumber: parentSession.sequenceNumber,
          sessionType: CourseSessionType.REPLACEMENT,
          plannedDate: targetPlannedDate,
          startTime,
          endTime,
          sessionMode: targetSessionMode,
          room: targetRoom,
          meetingLink: targetMeetingLink,
          notes: notes || null,
          status: CourseSessionStatus.SCHEDULED,
          progressState: SessionProgressState.NOT_STARTED,
          isReplacement: true,
          replacementForId: parentSession.id,
        },
      });

      // Retrieve or create Academics CalendarConfig
      const academicConfig = await getOrCreateAcademicConfig(user.id);

      // Create corresponding Event record
      const eventTitle = `[Replacement] ${parentSession.course.title} - Pertemuan ${parentSession.sequenceNumber}`;
      const eventStart = combineDateAndTime(targetPlannedDate, startTime);
      const eventEnd = combineDateAndTime(targetPlannedDate, endTime);
      const eventLocation = targetSessionMode === CourseSessionMode.ONLINE ? targetMeetingLink : targetRoom;
      const description = `Kelas pengganti untuk Pertemuan ${parentSession.sequenceNumber}. Catatan: ${notes || ""}`;

      const newEvent = await tx.event.create({
        data: {
          userId: user.id,
          calendarId: academicConfig.id,
          courseSessionId: newSession.id,
          title: eventTitle,
          description,
          startTime: eventStart,
          endTime: eventEnd,
          location: eventLocation,
        },
      });

      // Log Mutation
      await tx.timelineMutationLog.create({
        data: {
          userId: user.id,
          courseId: parentSession.courseId,
          courseSessionId: newSession.id,
          mutationType: TimelineMutationType.REPLACEMENT_SESSION_CREATED,
          affectedSequences: [parentSession.sequenceNumber],
          newState: {
            id: newSession.id,
            sequenceNumber: newSession.sequenceNumber,
            plannedDate: targetPlannedDate.toISOString(),
            startTime,
            endTime,
          },
          reason: notes || `Created replacement session for S${parentSession.sequenceNumber}`,
        }
      });

      return { newSession, newEvent };
    });

    // 3. Google Calendar synchronization outside transaction
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

    if (hasGoogleAccount && isGoogleCalValid) {
      try {
        const eventStart = combineDateAndTime(targetPlannedDate, startTime);
        const eventEnd = combineDateAndTime(targetPlannedDate, endTime);
        const eventLocation = targetSessionMode === CourseSessionMode.ONLINE ? targetMeetingLink : targetRoom;
        const description = `Kelas pengganti untuk Pertemuan ${parentSession.sequenceNumber}. Catatan: ${notes || ""}`;

        const googleEventId = await createGoogleEvent(user.id, config.googleCalendarId, {
          title: `[Replacement] ${parentSession.course.title} - Pertemuan ${parentSession.sequenceNumber}`,
          description,
          startTime: eventStart,
          endTime: eventEnd,
          location: eventLocation,
        });

        // Patch local event with googleEventId
        await prisma.event.update({
          where: { id: newEvent.id },
          data: { googleEventId },
        });
      } catch (err) {
        logger.error(`Failed to sync Replacement Session Event to Google Calendar:`, err);
      }
    }

    // Invalidate user cognitive briefing cache
    await invalidateUserCache(user.id, "cognitive");

    return NextResponse.json({
      success: true,
      session: newSession,
    });
  } catch (error) {
    console.error("POST /api/academic/sessions/[id]/replacement error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
