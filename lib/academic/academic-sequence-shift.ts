import { prisma } from "@/lib/db/prisma";
import { 
  CourseSessionStatus, 
  TimelineMutationType, 
  CourseSessionMode, 
  CourseSessionType,
  Weekday
} from "@prisma/client";
import { getOrCreateAcademicConfig } from "../settings/category-seeding";
import { updateGoogleEvent } from "../google/calendar/update-event";
import { checkGlobalCollisions, combineDateAndTime } from "./academic";
import { logger } from "../logger";

export const WEEKDAY_MAP: Record<Weekday, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export const WEEKDAY_REVERSE_MAP: Record<number, Weekday> = {
  0: Weekday.SUNDAY,
  1: Weekday.MONDAY,
  2: Weekday.TUESDAY,
  3: Weekday.WEDNESDAY,
  4: Weekday.THURSDAY,
  5: Weekday.FRIDAY,
  6: Weekday.SATURDAY,
};

export interface ShiftSequenceParams {
  sessionId: string;
  userId: string;
  newDate: Date;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

/**
 * Shifts the academic sequence starting from the given session.
 * Preserves normal weekday, start time, and end time for downstream sessions.
 */
export async function shiftAcademicSequence(params: ShiftSequenceParams) {
  const { sessionId, userId, newDate, startTime, endTime, reason } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch target session and all non-deleted sessions of the course
    const session = await tx.courseSession.findUnique({
      where: { id: sessionId },
      include: {
        course: {
          include: {
            sessions: {
              where: { deletedAt: null },
              orderBy: { sequenceNumber: "asc" }
            }
          }
        }
      }
    });

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.course.userId !== userId) {
      throw new Error("Unauthorized to access this course session");
    }

    const course = session.course;
    const sessions = course.sessions;
    const targetSeq = session.sequenceNumber;

    // Authoritative normal weekday mapped to integer
    const normalWeekdayNum = WEEKDAY_MAP[course.normalWeekday];

    const shiftedSessions: { session: any; oldDate: Date; newPlannedDate: Date }[] = [];
    let currentNewDate = new Date(newDate);

    for (const s of sessions) {
      if (s.sequenceNumber < targetSeq) {
        continue;
      }

      if (s.sequenceNumber === targetSeq) {
        shiftedSessions.push({
          session: s,
          oldDate: new Date(s.plannedDate),
          newPlannedDate: new Date(currentNewDate)
        });
      } else {
        // Find next occurrence of normalWeekdayNum strictly after currentNewDate
        const nextDate = new Date(currentNewDate);
        nextDate.setDate(nextDate.getDate() + 1);
        while (nextDate.getDay() !== normalWeekdayNum) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        currentNewDate = nextDate;

        shiftedSessions.push({
          session: s,
          oldDate: new Date(s.plannedDate),
          newPlannedDate: new Date(currentNewDate)
        });
      }
    }

    // 2. Collision Detection for all shifted sessions
    const collisions: any[] = [];
    for (const item of shiftedSessions) {
      const s = item.session;
      const sStart = s.sequenceNumber === targetSeq && startTime ? startTime : s.startTime;
      const sEnd = s.sequenceNumber === targetSeq && endTime ? endTime : s.endTime;

      // Find the associated event ID to exclude it from collision check
      const currentEvent = await tx.event.findFirst({
        where: { courseSessionId: s.id },
      });

      const itemConflicts = await checkGlobalCollisions(
        userId,
        item.newPlannedDate,
        sStart,
        sEnd,
        s.room,
        currentEvent?.id
      );
      collisions.push(...itemConflicts);
    }

    // 3. Update CourseSession & local Event records in DB
    const googleSyncJobs: any[] = [];
    const previousState: any[] = [];
    const newState: any[] = [];
    const affectedSequences: number[] = [];

    // Increment timeline version on Course
    await tx.course.update({
      where: { id: course.id },
      data: {
        timelineVersion: course.timelineVersion + 1,
      },
    });

    for (const item of shiftedSessions) {
      const s = item.session;
      const targetStart = s.sequenceNumber === targetSeq && startTime ? startTime : s.startTime;
      const targetEnd = s.sequenceNumber === targetSeq && endTime ? endTime : s.endTime;

      previousState.push({
        id: s.id,
        sequenceNumber: s.sequenceNumber,
        plannedDate: item.oldDate.toISOString(),
        startTime: s.startTime,
        endTime: s.endTime,
      });

      newState.push({
        id: s.id,
        sequenceNumber: s.sequenceNumber,
        plannedDate: item.newPlannedDate.toISOString(),
        startTime: targetStart,
        endTime: targetEnd,
      });

      affectedSequences.push(s.sequenceNumber);

      // Update Session
      await tx.courseSession.update({
        where: { id: s.id },
        data: {
          plannedDate: item.newPlannedDate,
          startTime: targetStart,
          endTime: targetEnd,
          status: CourseSessionStatus.RESCHEDULED,
        }
      });

      // Update local Event
      const eventStart = combineDateAndTime(item.newPlannedDate, targetStart);
      const eventEnd = combineDateAndTime(item.newPlannedDate, targetEnd);

      const associatedEvent = await tx.event.findFirst({
        where: { courseSessionId: s.id },
      });

      if (associatedEvent) {
        let typePrefix = "[Class]";
        if (s.sessionType === CourseSessionType.MID_EXAM) typePrefix = "[UTS]";
        else if (s.sessionType === CourseSessionType.FINAL_EXAM) typePrefix = "[UAS]";
        else if (s.sessionType === CourseSessionType.QUIZ) typePrefix = "[Quiz]";
        else if (s.sessionType === CourseSessionType.PRESENTATION) typePrefix = "[Presentation]";
        else if (s.sessionType === CourseSessionType.LAB) typePrefix = "[Lab]";
        else if (s.sessionType === CourseSessionType.PROJECT_REVIEW) typePrefix = "[Project Review]";
        else if (s.sessionType === CourseSessionType.SEMINAR) typePrefix = "[Seminar]";
        else if (s.sessionType === CourseSessionType.REPLACEMENT) typePrefix = "[Replacement]";
        else if (s.sessionType === CourseSessionType.HOLIDAY) typePrefix = "[Holiday]";

        const newTitle = `${typePrefix} ${course.title} - Pertemuan ${s.sequenceNumber}`;
        const newLocation = s.sessionMode === CourseSessionMode.ONLINE ? s.meetingLink : s.room;

        await tx.event.update({
          where: { id: associatedEvent.id },
          data: {
            title: newTitle,
            startTime: eventStart,
            endTime: eventEnd,
            location: newLocation,
          }
        });

        if (associatedEvent.googleEventId) {
          googleSyncJobs.push({
            googleEventId: associatedEvent.googleEventId,
            title: newTitle,
            description: associatedEvent.description,
            startTime: eventStart,
            endTime: eventEnd,
            location: newLocation,
          });
        }
      }
    }

    // 4. Write TimelineMutationLog
    await tx.timelineMutationLog.create({
      data: {
        userId,
        courseId: course.id,
        courseSessionId: sessionId,
        mutationType: TimelineMutationType.SEQUENCE_SHIFT,
        affectedSequences,
        previousState: previousState,
        newState: newState,
        reason: reason || `Shifted sequence starting from S${targetSeq} to new date ${newDate.toISOString().split("T")[0]}`,
      }
    });

    return {
      success: true,
      shiftedCount: shiftedSessions.length,
      collisions,
      googleSyncJobs,
    };
  });
}
