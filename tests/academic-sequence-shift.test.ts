import { prisma } from "@/lib/db/prisma";
import { shiftAcademicSequence } from "../lib/academic/academic-sequence-shift";
import { 
  CourseSessionStatus, 
  CourseSessionType, 
  CourseSessionMode,
  TimelineMutationType,
  SessionProgressState,
  Weekday,
  CognitiveCategoryType
} from "@prisma/client";

describe("Academic Sequence Shifting Tests", () => {
  const userId = "test-user-sequence-shift";
  let testCourseId = "";
  let testCalendarId = "";
  let sessionIds: string[] = [];

  beforeAll(async () => {
    // 1. Clean up potential orphan test records
    await prisma.timelineMutationLog.deleteMany({ where: { userId } });
    await prisma.event.deleteMany({ where: { userId } });
    await prisma.courseSession.deleteMany({ where: { course: { userId } } });
    await prisma.course.deleteMany({ where: { userId } });
    await prisma.calendarConfig.deleteMany({ where: { userId } });
    
    // 2. Ensure test user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: "test-shift@sophia.local",
        name: "Test Shift User",
      }
    });

    // Create a test CalendarConfig
    const config = await prisma.calendarConfig.create({
      data: {
        userId,
        googleCalendarId: "local-test-academics-shift",
        cognitiveCategory: "Academics",
        categoryType: CognitiveCategoryType.ACADEMIC,
      }
    });
    testCalendarId = config.id;

    // 3. Create a test Course with authoritative MONDAY normalWeekday
    const course = await prisma.course.create({
      data: {
        userId,
        title: "Test Struktur Aljabar",
        lecturer: "Dr. Anton",
        semester: 3,
        academicYear: "2026/2027",
        totalSessions: 3,
        normalWeekday: Weekday.MONDAY,
      }
    });

    testCourseId = course.id;

    // Create 3 sessions on consecutive Mondays:
    // Session 1: 2026-06-01 (Monday)
    // Session 2: 2026-06-08 (Monday)
    // Session 3: 2026-06-15 (Monday)
    const dates = [
      new Date("2026-06-01T08:00:00Z"),
      new Date("2026-06-08T08:00:00Z"),
      new Date("2026-06-15T08:00:00Z"),
    ];

    for (let i = 0; i < 3; i++) {
      const session = await prisma.courseSession.create({
        data: {
          courseId: testCourseId,
          sequenceNumber: i + 1,
          sessionType: CourseSessionType.CLASS,
          plannedDate: dates[i],
          startTime: "08:00",
          endTime: "09:40",
          status: CourseSessionStatus.SCHEDULED,
          sessionMode: CourseSessionMode.OFFLINE,
          progressState: SessionProgressState.NOT_STARTED,
          progressPercentage: 0,
          wasActuallyHeld: false,
        }
      });
      sessionIds.push(session.id);

      // Create an associated local Event for each session
      await prisma.event.create({
        data: {
          userId,
          calendarId: testCalendarId,
          courseSessionId: session.id,
          title: `[Class] Test Struktur Aljabar - Pertemuan ${i + 1}`,
          startTime: new Date(dates[i].getTime()),
          endTime: new Date(dates[i].getTime() + 100 * 60000), // 100 mins
          location: "Ruang 402",
        }
      });
    }
  });

  afterAll(async () => {
    // Cleanup test records
    await prisma.timelineMutationLog.deleteMany({ where: { userId } });
    await prisma.event.deleteMany({ where: { userId } });
    await prisma.courseSession.deleteMany({ where: { course: { userId } } });
    await prisma.course.deleteMany({ where: { userId } });
    await prisma.calendarConfig.deleteMany({ where: { userId } });
    try {
      await prisma.user.delete({ where: { id: userId } });
    } catch (e) {
      // Ignored
    }
  });

  it("should shift downstream sessions correctly while strictly preserving MONDAY weekday pattern", async () => {
    // Let's shift Session 2 (index 1) to Wednesday (2026-06-10)
    // The target is Session 2 which originally was on Monday 2026-06-08.
    // The target new date is Wednesday 2026-06-10.
    // Downstream Session 3 (index 2) was originally on Monday 2026-06-15.
    // After Session 2 shifts to Wednesday 2026-06-10, the engine should look for the NEXT Monday after Wednesday 2026-06-10.
    // The next Monday after Wednesday 2026-06-10 is indeed Monday 2026-06-15.
    // Thus, Session 3 should stay on Monday 2026-06-15!
    // Let's execute the sequence shift:
    const targetNewDate = new Date("2026-06-10T08:00:00Z");

    const result = await shiftAcademicSequence({
      sessionId: sessionIds[1],
      userId,
      newDate: targetNewDate,
      reason: "Dosen dinas luar kota pada hari Senin",
    });

    expect(result.success).toBe(true);
    expect(result.shiftedCount).toBe(2); // Session 2 and Session 3 are evaluated

    // Verify Session 2 date is Wednesday 2026-06-10
    const s2 = await prisma.courseSession.findUnique({ where: { id: sessionIds[1] } });
    expect(s2!.plannedDate.toISOString().split("T")[0]).toBe("2026-06-10");
    expect(s2!.status).toBe(CourseSessionStatus.RESCHEDULED);

    // Verify Session 3 date remains Monday 2026-06-15 (next occurrence of Monday strictly after 2026-06-10)
    const s3 = await prisma.courseSession.findUnique({ where: { id: sessionIds[2] } });
    expect(s3!.plannedDate.toISOString().split("T")[0]).toBe("2026-06-15");
    expect(s3!.status).toBe(CourseSessionStatus.RESCHEDULED);

    // Verify Timeline Mutation Log was registered
    const logs = await prisma.timelineMutationLog.findMany({
      where: { courseId: testCourseId, mutationType: TimelineMutationType.SEQUENCE_SHIFT }
    });
    expect(logs.length).toBe(1);
    expect(logs[0].affectedSequences).toContain(2);
    expect(logs[0].affectedSequences).toContain(3);

    // Verify Course timeline version incremented
    const course = await prisma.course.findUnique({ where: { id: testCourseId } });
    expect(course!.timelineVersion).toBe(2); // was 1 initially, then incremented to 2
  });

  it("should cascade shift downstream sessions by weeks if shifted to next Monday", async () => {
    // Let's shift Session 2 again, but this time to next Monday (2026-06-17 or 2026-06-22 depending on original date)
    // Wait, let's fetch the current state. Session 2 is currently on Wednesday 2026-06-10.
    // Let's shift Session 2 to Monday 2026-06-15.
    // The next Monday after Monday 2026-06-15 is Monday 2026-06-22.
    // Thus, Session 3 should shift to Monday 2026-06-22!
    const targetNewDate = new Date("2026-06-15T08:00:00Z");

    const session2 = await prisma.courseSession.findUnique({ where: { id: sessionIds[1] } });
    const result = await shiftAcademicSequence({
      sessionId: sessionIds[1],
      userId,
      newDate: targetNewDate,
      reason: "Shift Session 2 to next Monday cascadingly",
    });

    expect(result.success).toBe(true);

    // Verify Session 2 is Monday 2026-06-15
    const s2 = await prisma.courseSession.findUnique({ where: { id: sessionIds[1] } });
    expect(s2!.plannedDate.toISOString().split("T")[0]).toBe("2026-06-15");

    // Verify Session 3 is Monday 2026-06-22 (next Monday after Monday 2026-06-15)
    const s3 = await prisma.courseSession.findUnique({ where: { id: sessionIds[2] } });
    expect(s3!.plannedDate.toISOString().split("T")[0]).toBe("2026-06-22");
  });
});
