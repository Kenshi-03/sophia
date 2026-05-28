import { prisma } from "@/lib/db/prisma";
import { 
  CourseSessionType, 
  CourseSessionStatus, 
  CourseSessionMode, 
  TimelineMutationType,
  CognitiveCategoryType
} from "@prisma/client";
import { getOrCreateAcademicConfig } from "../settings/category-seeding";
import { logger } from "../logger";

// Let's verify import paths for google api helpers:
// In app/api/calendar/route.ts:
// import { createGoogleEvent } from "@/lib/google/calendar/create-event";
import { createGoogleEvent as createGEvent } from "@/lib/google/calendar/create-event";
import { updateGoogleEvent as updateGEvent } from "@/lib/google/calendar/update-event";
import { deleteGoogleEvent as deleteGEvent } from "@/lib/google/calendar/delete-event";

export function combineDateAndTime(date: Date, timeStr: string): Date {
  const d = new Date(date);
  const [hours, minutes] = timeStr.split(":").map(Number);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export interface CourseCreationParams {
  userId: string;
  title: string;
  lecturer: string;
  semester: number;
  academicYear: string;
  totalSessions: number;
  defaultSessionMode: CourseSessionMode;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  firstSessionDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

/**
 * Generates the full academic timeline of CourseSessions and associated Events.
 */
export async function generateSemesterTimeline(params: CourseCreationParams) {
  const {
    userId,
    title,
    lecturer,
    semester,
    academicYear,
    totalSessions,
    defaultSessionMode,
    defaultLocation,
    defaultMeetingLink,
    firstSessionDate,
    startTime,
    endTime,
  } = params;

  // Retrieve or create Academics CalendarConfig
  const academicConfig = await getOrCreateAcademicConfig(userId);

  // Check if Google credentials exist and user accounts exist
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        where: { provider: "google" },
      },
    },
  });

  const hasGoogleAccount = dbUser && dbUser.accounts.length > 0;
  const isGoogleCalValid = academicConfig.googleCalendarId && !academicConfig.googleCalendarId.startsWith("local-");

  // Run Course creation and Session timeline generation inside a transaction
  return await prisma.$transaction(async (tx) => {
    // 1. Create Course
    const course = await tx.course.create({
      data: {
        userId,
        title,
        lecturer,
        semester,
        academicYear,
        totalSessions,
        defaultSessionMode,
        defaultLocation: defaultLocation || null,
        defaultMeetingLink: defaultMeetingLink || null,
        categoryType: CognitiveCategoryType.ACADEMIC,
      },
    });

    const sessionsData = [];
    const baseDate = new Date(firstSessionDate);

    // 2. Generate CourseSessions
    for (let i = 0; i < totalSessions; i++) {
      const sessionDate = new Date(baseDate);
      sessionDate.setDate(baseDate.getDate() + i * 7);

      const sequenceNumber = i + 1;
      let sessionType: CourseSessionType = CourseSessionType.CLASS;

      // Create CourseSession record
      const session = await tx.courseSession.create({
        data: {
          courseId: course.id,
          sequenceNumber,
          sessionType,
          plannedDate: sessionDate,
          startTime,
          endTime,
          sessionMode: defaultSessionMode,
          room: defaultSessionMode !== CourseSessionMode.ONLINE ? (defaultLocation || null) : null,
          meetingLink: defaultSessionMode !== CourseSessionMode.OFFLINE ? (defaultMeetingLink || null) : null,
          status: CourseSessionStatus.SCHEDULED,
        },
      });

      // Format Event Title
      const eventTitle = `[Class] ${title} - Pertemuan ${sequenceNumber}`;

      // Calculate Dates for Event
      const eventStart = combineDateAndTime(sessionDate, startTime);
      const eventEnd = combineDateAndTime(sessionDate, endTime);

      // Create corresponding Event record
      const event = await tx.event.create({
        data: {
          userId,
          calendarId: academicConfig.id,
          courseSessionId: session.id,
          title: eventTitle,
          description: `Jadwal perkuliahan ${title} - Pertemuan ${sequenceNumber}. Dosen: ${lecturer}.`,
          startTime: eventStart,
          endTime: eventEnd,
          location: defaultSessionMode === CourseSessionMode.ONLINE ? (defaultMeetingLink || null) : (defaultLocation || null),
        },
      });

      // Sync with Google Calendar if connected
      if (hasGoogleAccount && isGoogleCalValid) {
        try {
          const googleEventId = await createGEvent(userId, academicConfig.googleCalendarId, {
            title: eventTitle,
            description: `Jadwal perkuliahan ${title} - Pertemuan ${sequenceNumber}. Dosen: ${lecturer}.`,
            startTime: eventStart,
            endTime: eventEnd,
            location: defaultSessionMode === CourseSessionMode.ONLINE ? (defaultMeetingLink || null) : (defaultLocation || null),
          });

          await tx.event.update({
            where: { id: event.id },
            data: { googleEventId },
          });
        } catch (err) {
          logger.error(`Failed to sync Academic Session ${sequenceNumber} to Google Calendar:`, err);
        }
      }

      sessionsData.push(session);
    }

    return { course, sessions: sessionsData };
  });
}

export interface CollisionResult {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string | null;
  type: "course_session" | "general_event";
  courseTitle?: string;
  sequenceNumber?: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Checks for database scheduling collisions on a specific date/time.
 */
export async function checkGlobalCollisions(
  userId: string,
  plannedDate: Date | string,
  startTime: string,
  endTime: string,
  room?: string | null,
  excludeEventId?: string | null
): Promise<CollisionResult[]> {
  const checkStart = combineDateAndTime(new Date(plannedDate), startTime);
  const checkEnd = combineDateAndTime(new Date(plannedDate), endTime);

  // Fetch all events that overlap in time
  const overlappingEvents = await prisma.event.findMany({
    where: {
      userId,
      startTime: { lt: checkEnd },
      endTime: { gt: checkStart },
      ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
    },
    include: {
      calendar: true,
      courseSession: {
        include: {
          course: true,
        },
      },
    },
  });

  const conflicts: CollisionResult[] = [];

  for (const event of overlappingEvents) {
    const isCourseSession = !!event.courseSession;
    let severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "LOW";
    
    // Determine Severity
    if (isCourseSession) {
      const sessionType = event.courseSession!.sessionType;
      if (sessionType === CourseSessionType.MID_EXAM || sessionType === CourseSessionType.FINAL_EXAM) {
        severity = "CRITICAL";
      } else if (sessionType === CourseSessionType.QUIZ || sessionType === CourseSessionType.PRESENTATION) {
        severity = "HIGH";
      } else {
        severity = "HIGH";
      }
    } else {
      const catType = event.calendar?.categoryType || "GENERAL";
      if (catType === CognitiveCategoryType.DEEP_WORK) {
        severity = "MEDIUM";
      } else if (catType === CognitiveCategoryType.MEETING) {
        severity = "HIGH";
      } else {
        severity = "LOW";
      }
    }

    conflicts.push({
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      type: isCourseSession ? "course_session" : "general_event",
      courseTitle: event.courseSession?.course.title,
      sequenceNumber: event.courseSession?.sequenceNumber,
      severity,
    });
  }

  // Also check for room collision: if room is specified, find if any overlapping event is in the same room
  if (room && room.trim() !== "") {
    const roomOverlapEvents = await prisma.event.findMany({
      where: {
        userId,
        location: { mode: "insensitive", equals: room },
        startTime: { lt: checkEnd },
        endTime: { gt: checkStart },
        ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
      },
      include: {
        courseSession: {
          include: {
            course: true,
          },
        },
      },
    });

    for (const event of roomOverlapEvents) {
      // Avoid duplicate conflict entries
      if (conflicts.some((c) => c.id === event.id)) continue;

      const isCourseSession = !!event.courseSession;
      conflicts.push({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        type: isCourseSession ? "course_session" : "general_event",
        courseTitle: event.courseSession?.course.title,
        sequenceNumber: event.courseSession?.sequenceNumber,
        severity: "HIGH", // Room double-booking is considered high severity
      });
    }
  }

  return conflicts;
}

/**
 * Helper to log timeline mutations for audit logging.
 */
export async function logTimelineMutation(
  userId: string,
  courseId: string,
  type: TimelineMutationType,
  affectedSequences: number[],
  prevState?: any,
  newState?: any,
  reason?: string | null,
  sessionId?: string | null
) {
  return prisma.timelineMutationLog.create({
    data: {
      userId,
      courseId,
      courseSessionId: sessionId || null,
      mutationType: type,
      affectedSequences,
      previousState: prevState || null,
      newState: newState || null,
      reason: reason || null,
    },
  });
}

/**
 * Cascading shift mutation engine. Shifts dates of remaining sessions (S to N) forward by daysToShift.
 */
export async function shiftCourseSessions(
  userId: string,
  courseId: string,
  startSequenceNumber: number,
  daysToShift: number, // positive or negative
  bypassCooldown = false,
  reason?: string | null
) {
  // 1. Enforce Cooldown Protection
  if (!bypassCooldown) {
    const recentMutation = await prisma.timelineMutationLog.findFirst({
      where: {
        courseId,
        mutationType: {
          in: [TimelineMutationType.SHIFT_FORWARD, TimelineMutationType.SHIFT_BACKWARD],
        },
        createdAt: {
          gte: new Date(Date.now() - 5000), // 5 seconds cooldown
        },
      },
    });

    if (recentMutation) {
      throw new Error(
        "COOLDOWN_ACTIVE: Cascading shift baru saja dilakukan kurang dari 5 detik yang lalu. Mohon tunggu sejenak atau konfirmasi ulang."
      );
    }
  }

  // 2. Fetch Course
  const course = await prisma.course.findUnique({
    where: { id: courseId, deletedAt: null },
  });

  if (!course) {
    throw new Error("Course tidak ditemukan atau sudah dihapus.");
  }

  // Fetch active configurations to check Google sync info
  const config = await getOrCreateAcademicConfig(userId);

  // Retrieve user Google account details
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        where: { provider: "google" },
      },
    },
  });

  const hasGoogleAccount = dbUser && dbUser.accounts.length > 0;
  const isGoogleCalValid = config.googleCalendarId && !config.googleCalendarId.startsWith("local-");

  // 3. Fetch all active sessions starting from startSequenceNumber
  const sessionsToShift = await prisma.courseSession.findMany({
    where: {
      courseId,
      sequenceNumber: { gte: startSequenceNumber },
      deletedAt: null,
    },
    orderBy: { sequenceNumber: "asc" },
  });

  if (sessionsToShift.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  const affectedSequences = sessionsToShift.map((s) => s.sequenceNumber);
  const previousState = sessionsToShift.map((s) => ({
    id: s.id,
    sequenceNumber: s.sequenceNumber,
    plannedDate: s.plannedDate.toISOString(),
  }));

  const newState: any[] = [];

  // Update records inside a database transaction
  await prisma.$transaction(async (tx) => {
    // A. Increment timeline version
    await tx.course.update({
      where: { id: courseId },
      data: {
        timelineVersion: course.timelineVersion + 1,
      },
    });

    // B. Perform shift calculations
    for (const session of sessionsToShift) {
      const oldPlannedDate = new Date(session.plannedDate);
      const newPlannedDate = new Date(oldPlannedDate);
      newPlannedDate.setDate(oldPlannedDate.getDate() + daysToShift);

      // Save to newState log trace
      newState.push({
        id: session.id,
        sequenceNumber: session.sequenceNumber,
        plannedDate: newPlannedDate.toISOString(),
      });

      // Update CourseSession record
      await tx.courseSession.update({
        where: { id: session.id },
        data: {
          plannedDate: newPlannedDate,
          status: CourseSessionStatus.RESCHEDULED,
        },
      });

      // Update associated Events
      const associatedEvents = await tx.event.findMany({
        where: { courseSessionId: session.id },
      });

      for (const event of associatedEvents) {
        const eventStart = combineDateAndTime(newPlannedDate, session.startTime);
        const eventEnd = combineDateAndTime(newPlannedDate, session.endTime);

        // Update local Event record
        await tx.event.update({
          where: { id: event.id },
          data: {
            startTime: eventStart,
            endTime: eventEnd,
          },
        });

        // Sync with Google Calendar
        if (hasGoogleAccount && isGoogleCalValid && event.googleEventId) {
          try {
            await updateGEvent(userId, config.googleCalendarId, event.googleEventId, {
              title: event.title,
              description: event.description,
              startTime: eventStart,
              endTime: eventEnd,
              location: event.location,
            });
          } catch (err) {
            logger.error(`Failed to update Google Calendar event ${event.googleEventId} during cascading shift:`, err);
          }
        }
      }
    }

    // C. Write the TimelineMutationLog
    const type = daysToShift > 0 ? TimelineMutationType.SHIFT_FORWARD : TimelineMutationType.SHIFT_BACKWARD;
    await tx.timelineMutationLog.create({
      data: {
        userId,
        courseId,
        courseSessionId: sessionsToShift[0].id, // Anchor on first shifted session
        mutationType: type,
        affectedSequences,
        previousState: JSON.stringify(previousState),
        newState: JSON.stringify(newState),
        reason: reason || `Cascading shift of remaining sessions starting from sequence ${startSequenceNumber} by ${daysToShift} days`,
      },
    });
  });

  return { success: true, updatedCount: sessionsToShift.length };
}
