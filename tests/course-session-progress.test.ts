import { prisma } from "@/lib/db/prisma";
import { 
  validateProgressTransition, 
  updateSessionProgress,
  GOVERNANCE_LOCK_WINDOW_MS
} from "../lib/academic/course-session-progress";
import { 
  CourseSessionStatus, 
  CourseSessionType, 
  CourseSessionMode,
  TimelineMutationType,
  SessionProgressState
} from "@prisma/client";

describe("Course Session Progress Tracking Tests", () => {
  const userId = "test-user-progress-engine";
  let testCourseId = "";
  let testSessionId = "";

  beforeAll(async () => {
    // 1. Clean up potential orphan test records
    await prisma.timelineMutationLog.deleteMany({ where: { userId } });
    await prisma.courseSession.deleteMany({ where: { course: { userId } } });
    await prisma.course.deleteMany({ where: { userId } });
    
    // 2. Ensure test user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: "test-progress@sophia.local",
        name: "Test Progress User",
      }
    });

    // 3. Create a test Course and Session for database tests
    const course = await prisma.course.create({
      data: {
        userId,
        title: "Test Kimia Organik",
        lecturer: "Dr. Linda",
        semester: 2,
        academicYear: "2026/2027",
        totalSessions: 4,
      }
    });

    testCourseId = course.id;

    const session = await prisma.courseSession.create({
      data: {
        courseId: testCourseId,
        sequenceNumber: 1,
        sessionType: CourseSessionType.CLASS,
        plannedDate: new Date("2026-06-01T08:00:00Z"),
        startTime: "08:00",
        endTime: "09:40",
        status: CourseSessionStatus.SCHEDULED,
        sessionMode: CourseSessionMode.OFFLINE,
        progressState: SessionProgressState.NOT_STARTED,
        progressPercentage: 0,
        wasActuallyHeld: false,
      }
    });

    testSessionId = session.id;
  });

  afterAll(async () => {
    // Cleanup test records
    await prisma.timelineMutationLog.deleteMany({ where: { userId } });
    await prisma.courseSession.deleteMany({ where: { course: { userId } } });
    await prisma.course.deleteMany({ where: { userId } });
    try {
      await prisma.user.delete({ where: { id: userId } });
    } catch (e) {
      // Ignored if already removed
    }
  });

  describe("1. Pure Transition Validation Rules", () => {
    it("should allow valid transitions", () => {
      expect(validateProgressTransition(SessionProgressState.NOT_STARTED, SessionProgressState.IN_PROGRESS)).toBe(true);
      expect(validateProgressTransition(SessionProgressState.IN_PROGRESS, SessionProgressState.COMPLETED)).toBe(true);
      expect(validateProgressTransition(SessionProgressState.POSTPONED, SessionProgressState.COMPLETED)).toBe(true);
      expect(validateProgressTransition(SessionProgressState.COMPLETED, SessionProgressState.IN_PROGRESS)).toBe(true); // Reopening
      expect(validateProgressTransition(SessionProgressState.COMPLETED, SessionProgressState.NOT_STARTED)).toBe(true); // Direct Reopening
    });

    it("should reject invalid transitions", () => {
      expect(validateProgressTransition(SessionProgressState.CANCELLED, SessionProgressState.COMPLETED)).toBe(false);
      expect(validateProgressTransition(SessionProgressState.SKIPPED, SessionProgressState.COMPLETED)).toBe(false);
    });
  });

  describe("2. Database Operations & Transition Governance", () => {
    it("should execute NOT_STARTED -> IN_PROGRESS transition and apply default 50% percentage", async () => {
      const session = await prisma.courseSession.findUnique({ where: { id: testSessionId } });
      expect(session).toBeDefined();

      const updated = await updateSessionProgress({
        sessionId: testSessionId,
        userId,
        state: SessionProgressState.IN_PROGRESS,
        lastUpdatedAt: session!.updatedAt.toISOString(),
      });

      expect(updated.progressState).toBe(SessionProgressState.IN_PROGRESS);
      expect(updated.progressPercentage).toBe(50); // Default for IN_PROGRESS
      expect(updated.wasActuallyHeld).toBe(true);
      expect(updated.completedAt).toBeNull();
    });

    it("should reject invalid transition from IN_PROGRESS back to NOT_STARTED directly without reopening", async () => {
      const session = await prisma.courseSession.findUnique({ where: { id: testSessionId } });
      
      await expect(
        updateSessionProgress({
          sessionId: testSessionId,
          userId,
          state: SessionProgressState.NOT_STARTED,
          lastUpdatedAt: session!.updatedAt.toISOString(),
        })
      ).rejects.toThrow("invalid");
    });

    it("should enforce optimistic concurrency checking and reject mismatching updatedAt tokens", async () => {
      const staleUpdatedAt = new Date("2020-01-01T00:00:00Z").toISOString();

      await expect(
        updateSessionProgress({
          sessionId: testSessionId,
          userId,
          state: SessionProgressState.COMPLETED,
          lastUpdatedAt: staleUpdatedAt,
        })
      ).rejects.toThrow("CONCURRENCY_VIOLATION");
    });

    it("should enforce timestamp validation: endTime >= startTime", async () => {
      const session = await prisma.courseSession.findUnique({ where: { id: testSessionId } });
      const now = new Date();
      const earlier = new Date(now.getTime() - 1000 * 60);

      await expect(
        updateSessionProgress({
          sessionId: testSessionId,
          userId,
          state: SessionProgressState.COMPLETED,
          actualStartTime: now,
          actualEndTime: earlier, // Invalid
          lastUpdatedAt: session!.updatedAt.toISOString(),
        })
      ).rejects.toThrow("TIMESTAMP_VIOLATION");
    });

    it("should execute IN_PROGRESS -> COMPLETED transition with proper timestamps and logs", async () => {
      const session = await prisma.courseSession.findUnique({ where: { id: testSessionId } });
      const now = new Date();
      const startTime = new Date(now.getTime() - 1000 * 60 * 90); // 90 min ago

      const updated = await updateSessionProgress({
        sessionId: testSessionId,
        userId,
        state: SessionProgressState.COMPLETED,
        actualStartTime: startTime,
        actualEndTime: now,
        notes: "Ujian selesai tepat waktu.",
        lastUpdatedAt: session!.updatedAt.toISOString(),
      });

      expect(updated.progressState).toBe(SessionProgressState.COMPLETED);
      expect(updated.progressPercentage).toBe(100);
      expect(updated.wasActuallyHeld).toBe(true);
      expect(updated.completedAt).not.toBeNull();
      expect(updated.executionNotes).toBe("Ujian selesai tepat waktu.");

      // Check that a TimelineMutationLog was logged with actor type metadata
      const log = await prisma.timelineMutationLog.findFirst({
        where: { courseSessionId: testSessionId, mutationType: TimelineMutationType.SESSION_COMPLETED }
      });
      expect(log).toBeDefined();
      expect(log!.actorType).toBe("USER");
      expect(log!.triggerSource).toBe("WEB_INTERFACE");
      expect(log!.previousState).not.toBeNull();
      expect(log!.newState).not.toBeNull();
    });

    it("should allow reopening completed sessions and clear completedAt timestamp while retaining notes", async () => {
      const session = await prisma.courseSession.findUnique({ where: { id: testSessionId } });
      
      const updated = await updateSessionProgress({
        sessionId: testSessionId,
        userId,
        state: SessionProgressState.IN_PROGRESS,
        lastUpdatedAt: session!.updatedAt.toISOString(),
      });

      expect(updated.progressState).toBe(SessionProgressState.IN_PROGRESS);
      expect(updated.progressPercentage).toBe(50);
      expect(updated.completedAt).toBeNull();
      expect(updated.executionNotes).toBe("Ujian selesai tepat waktu."); // Note is preserved!

      // Check reopen log
      const reopenLog = await prisma.timelineMutationLog.findFirst({
        where: { courseSessionId: testSessionId, mutationType: TimelineMutationType.SESSION_REOPENED }
      });
      expect(reopenLog).toBeDefined();
    });

    it("should reject reopening completed session if lock window is exceeded unless allowOverride is provided", async () => {
      // Simulate historical completed session by patching completedAt in database to 10 days ago
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      // Transition session to COMPLETED first
      let session = await prisma.courseSession.findUnique({ where: { id: testSessionId } });
      session = await prisma.courseSession.update({
        where: { id: testSessionId },
        data: {
          progressState: SessionProgressState.COMPLETED,
          completedAt: tenDaysAgo,
          progressPercentage: 100,
        }
      });

      // Try to reopen directly (should fail due to GOVERNANCE_LOCK_VIOLATION)
      await expect(
        updateSessionProgress({
          sessionId: testSessionId,
          userId,
          state: SessionProgressState.IN_PROGRESS,
          lastUpdatedAt: session.updatedAt.toISOString(),
        })
      ).rejects.toThrow("GOVERNANCE_LOCK_VIOLATION");

      // Verify override successfully reopens the locked session
      const overridden = await updateSessionProgress({
        sessionId: testSessionId,
        userId,
        state: SessionProgressState.IN_PROGRESS,
        allowOverride: true, // Bypass lock
        lastUpdatedAt: session.updatedAt.toISOString(),
      });

      expect(overridden.progressState).toBe(SessionProgressState.IN_PROGRESS);
      expect(overridden.completedAt).toBeNull();
    });

    it("should synchronize terminal SKIPPED and CANCELLED progressState to CourseSessionStatus status", async () => {
      const session = await prisma.courseSession.findUnique({ where: { id: testSessionId } });

      const skipped = await updateSessionProgress({
        sessionId: testSessionId,
        userId,
        state: SessionProgressState.SKIPPED,
        lastUpdatedAt: session!.updatedAt.toISOString(),
      });

      expect(skipped.progressState).toBe(SessionProgressState.SKIPPED);
      expect(skipped.status).toBe(CourseSessionStatus.SKIPPED); // Synchronized!

      const cancelled = await updateSessionProgress({
        sessionId: testSessionId,
        userId,
        state: SessionProgressState.CANCELLED,
        lastUpdatedAt: skipped.updatedAt.toISOString(),
      });

      expect(cancelled.progressState).toBe(SessionProgressState.CANCELLED);
      expect(cancelled.status).toBe(CourseSessionStatus.CANCELLED); // Synchronized!
    });
  });
});
