import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { checkGlobalCollisions, combineDateAndTime, logTimelineMutation } from "@/lib/academic/academic";
import { getOrCreateAcademicConfig } from "@/lib/settings/category-seeding";
import { updateGoogleEvent } from "@/lib/google/calendar/update-event";
import { invalidateUserCache } from "@/lib/redis";
import { CourseSessionMode, CourseSessionType, TimelineMutationType, CourseSessionStatus } from "@prisma/client";
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
      sessionType,
      notes,
    } = body;

    // 1. Fetch current CourseSession
    const session = await prisma.courseSession.findFirst({
      where: { id, deletedAt: null },
      include: {
        course: true,
      },
    });

    if (!session || session.course.userId !== user.id) {
      return NextResponse.json({ error: "Sesi kuliah tidak ditemukan." }, { status: 404 });
    }

    // Capture previous state for mutation log
    const prevState = {
      plannedDate: session.plannedDate.toISOString(),
      startTime: session.startTime,
      endTime: session.endTime,
      room: session.room,
      meetingLink: session.meetingLink,
      sessionMode: session.sessionMode,
      sessionType: session.sessionType,
      notes: session.notes,
    };

    // 2. Prepare new parameters
    const targetPlannedDate = plannedDate ? new Date(plannedDate) : session.plannedDate;
    const targetStartTime = startTime || session.startTime;
    const targetEndTime = endTime || session.endTime;
    const targetRoom = room !== undefined ? room : session.room;
    const targetMeetingLink = meetingLink !== undefined ? meetingLink : session.meetingLink;
    const targetSessionMode = (sessionMode as CourseSessionMode) || session.sessionMode;
    const targetSessionType = (sessionType as CourseSessionType) || session.sessionType;
    const targetNotes = notes !== undefined ? notes : session.notes;

    // 3. Collision Check if date/time or room changed
    let conflicts: any[] = [];
    const scheduleChanged = 
      plannedDate || 
      startTime || 
      endTime || 
      (room !== undefined && room !== session.room);

    if (scheduleChanged) {
      // Find the associated event ID to exclude it from collision check
      const currentEvent = await prisma.event.findFirst({
        where: { courseSessionId: session.id },
      });

      conflicts = await checkGlobalCollisions(
        user.id,
        targetPlannedDate,
        targetStartTime,
        targetEndTime,
        targetRoom,
        currentEvent?.id
      );
    }

    // Resolve calendar config and Google accounts
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

    // 4. Update CourseSession record
    const updatedSession = await prisma.courseSession.update({
      where: { id: session.id },
      data: {
        plannedDate: targetPlannedDate,
        startTime: targetStartTime,
        endTime: targetEndTime,
        room: targetRoom,
        meetingLink: targetMeetingLink,
        sessionMode: targetSessionMode,
        sessionType: targetSessionType,
        notes: targetNotes,
        status: CourseSessionStatus.RESCHEDULED,
      },
    });

    // 5. Update matching Event record
    const associatedEvent = await prisma.event.findFirst({
      where: { courseSessionId: session.id },
    });

    if (associatedEvent) {
      // Determine proper prefix based on type
      let typePrefix = "[Class]";
      if (targetSessionType === CourseSessionType.MID_EXAM) typePrefix = "[UTS]";
      else if (targetSessionType === CourseSessionType.FINAL_EXAM) typePrefix = "[UAS]";
      else if (targetSessionType === CourseSessionType.QUIZ) typePrefix = "[Quiz]";
      else if (targetSessionType === CourseSessionType.PRESENTATION) typePrefix = "[Presentation]";
      else if (targetSessionType === CourseSessionType.LAB) typePrefix = "[Lab]";
      else if (targetSessionType === CourseSessionType.PROJECT_REVIEW) typePrefix = "[Project Review]";
      else if (targetSessionType === CourseSessionType.SEMINAR) typePrefix = "[Seminar]";
      else if (targetSessionType === CourseSessionType.REPLACEMENT) typePrefix = "[Replacement]";
      else if (targetSessionType === CourseSessionType.HOLIDAY) typePrefix = "[Holiday]";

      const newTitle = `${typePrefix} ${session.course.title} - Pertemuan ${session.sequenceNumber}`;
      const eventStart = combineDateAndTime(targetPlannedDate, targetStartTime);
      const eventEnd = combineDateAndTime(targetPlannedDate, targetEndTime);
      const newLocation = targetSessionMode === CourseSessionMode.ONLINE ? targetMeetingLink : targetRoom;

      await prisma.event.update({
        where: { id: associatedEvent.id },
        data: {
          title: newTitle,
          startTime: eventStart,
          endTime: eventEnd,
          location: newLocation,
        },
      });

      // Sync changes to Google Calendar
      if (hasGoogleAccount && isGoogleCalValid && associatedEvent.googleEventId) {
        try {
          await updateGoogleEvent(user.id, config.googleCalendarId, associatedEvent.googleEventId, {
            title: newTitle,
            description: associatedEvent.description,
            startTime: eventStart,
            endTime: eventEnd,
            location: newLocation,
          });
        } catch (err) {
          logger.error(`Failed to update Google Calendar event ${associatedEvent.googleEventId} on override:`, err);
        }
      }
    }

    // 6. Write TimelineMutationLog
    let mutationType: TimelineMutationType = TimelineMutationType.OVERRIDE;
    if (room !== undefined && room !== session.room) mutationType = TimelineMutationType.ROOM_CHANGE;
    else if (sessionMode && sessionMode !== session.sessionMode) mutationType = TimelineMutationType.MODE_CHANGE;
    else if (plannedDate || startTime || endTime) mutationType = TimelineMutationType.RESCHEDULE;

    const newState = {
      plannedDate: targetPlannedDate.toISOString(),
      startTime: targetStartTime,
      endTime: targetEndTime,
      room: targetRoom,
      meetingLink: targetMeetingLink,
      sessionMode: targetSessionMode,
      sessionType: targetSessionType,
      notes: targetNotes,
    };

    await logTimelineMutation(
      user.id,
      session.courseId,
      mutationType,
      [session.sequenceNumber],
      prevState,
      newState,
      "Individual session override applied.",
      session.id
    );

    // Invalidate user cognitive briefing cache
    await invalidateUserCache(user.id, "cognitive");

    return NextResponse.json({
      success: true,
      session: updatedSession,
      warnings: conflicts,
    });
  } catch (error) {
    console.error("POST /api/academic/sessions/[id]/override error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
