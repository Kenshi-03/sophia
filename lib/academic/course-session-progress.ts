import { prisma } from "@/lib/db/prisma";
import { 
  SessionProgressState, 
  CourseSessionStatus, 
  TimelineMutationType 
} from "@prisma/client";

// Governance constant: finalized sessions cannot be reopened after 7 days without explicit override
export const GOVERNANCE_LOCK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const ALLOWED_TRANSITIONS: Record<SessionProgressState, SessionProgressState[]> = {
  NOT_STARTED: [
    SessionProgressState.IN_PROGRESS,
    SessionProgressState.COMPLETED,
    SessionProgressState.POSTPONED,
    SessionProgressState.CANCELLED,
    SessionProgressState.SKIPPED
  ],
  IN_PROGRESS: [
    SessionProgressState.COMPLETED,
    SessionProgressState.PARTIALLY_COMPLETED,
    SessionProgressState.POSTPONED,
    SessionProgressState.CANCELLED,
    SessionProgressState.SKIPPED
  ],
  POSTPONED: [
    SessionProgressState.IN_PROGRESS,
    SessionProgressState.COMPLETED,
    SessionProgressState.CANCELLED,
    SessionProgressState.SKIPPED
  ],
  PARTIALLY_COMPLETED: [
    SessionProgressState.IN_PROGRESS,
    SessionProgressState.COMPLETED,
    SessionProgressState.CANCELLED
  ],
  COMPLETED: [
    SessionProgressState.IN_PROGRESS, // Reopening
    SessionProgressState.NOT_STARTED  // Reopening directly to NOT_STARTED
  ],
  SKIPPED: [
    SessionProgressState.IN_PROGRESS, // Reopening
    SessionProgressState.NOT_STARTED, // Reopening
    SessionProgressState.CANCELLED
  ],
  CANCELLED: [] // Terminal-state locked, requires explicit reschedule/re-creation flow
};

/**
 * Validates whether a state transition from `from` to `to` is permitted.
 */
export function validateProgressTransition(from: SessionProgressState, to: SessionProgressState): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export interface ProgressMutationParams {
  sessionId: string;
  userId: string;
  state: SessionProgressState;
  percentage?: number;
  notes?: string | null;
  actualStartTime?: Date | null;
  actualEndTime?: Date | null;
  metadata?: any;
  reason?: string | null;
  lastUpdatedAt: string; // ISO string for optimistic concurrency check
  actorUserId?: string | null;
  actorType?: string; // "USER", "SYSTEM", "CRON"
  triggerSource?: string; // "WEB_INTERFACE", "API", "MUTATION_SHIFTER"
  allowOverride?: boolean; // Bypass historical governance lock
  bypassTimestamps?: boolean; // Bypass strict execution timestamps for completed sessions
}

/**
 * The master transaction runner for session progress mutations.
 * Enforces all deterministic governance rules, validations, locks, and logs mutations.
 */
export async function updateSessionProgress(params: ProgressMutationParams) {
  const {
    sessionId,
    userId,
    state: targetState,
    percentage,
    notes,
    actualStartTime,
    actualEndTime,
    metadata,
    reason,
    lastUpdatedAt,
    actorUserId,
    actorType = "USER",
    triggerSource = "WEB_INTERFACE",
    allowOverride = false,
    bypassTimestamps = false,
  } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current session with lock
    const session = await tx.courseSession.findUnique({
      where: { id: sessionId },
      include: { course: true }
    });

    if (!session) {
      throw new Error(`Course session not found: ${sessionId}`);
    }

    if (session.course.userId !== userId) {
      throw new Error("Unauthorized to access this course session");
    }

    // 2. Optimistic Concurrency Check
    const dbUpdatedAtISO = session.updatedAt.toISOString();
    const clientUpdatedAtISO = new Date(lastUpdatedAt).toISOString();
    if (dbUpdatedAtISO !== clientUpdatedAtISO) {
      throw new Error("CONCURRENCY_VIOLATION: The session has been modified by another action. Please reload.");
    }

    const currentState = session.progressState;

    // 3. Transition Validation Check
    if (!validateProgressTransition(currentState, targetState)) {
      throw new Error(`Transition from ${currentState} to ${targetState} is invalid.`);
    }

    // 4. Governance Reopen Lock Check
    const isReopening = (
      currentState === SessionProgressState.COMPLETED || 
      currentState === SessionProgressState.PARTIALLY_COMPLETED || 
      currentState === SessionProgressState.SKIPPED
    ) && (
      targetState === SessionProgressState.IN_PROGRESS || 
      targetState === SessionProgressState.NOT_STARTED
    );

    if (isReopening && session.completedAt && !allowOverride) {
      const elapsedMs = Date.now() - session.completedAt.getTime();
      if (elapsedMs > GOVERNANCE_LOCK_WINDOW_MS) {
        throw new Error("GOVERNANCE_LOCK_VIOLATION: Reopening this archived session is locked. Timeout window exceeded.");
      }
    }

    // 5. Execution Timestamp Validation
    if (actualStartTime && actualEndTime) {
      if (actualEndTime.getTime() < actualStartTime.getTime()) {
        throw new Error("TIMESTAMP_VIOLATION: Actual end time must be greater than or equal to actual start time.");
      }
    }

    if (targetState === SessionProgressState.COMPLETED && !bypassTimestamps) {
      if (!actualStartTime || !actualEndTime) {
        throw new Error("TIMESTAMP_VIOLATION: Completed sessions require both actual start and end times unless explicitly bypassed.");
      }
    }

    // 6. Stronger Progress Percentage & wasActuallyHeld Governance
    let resolvedPercentage = 0;
    let resolvedWasActuallyHeld = false;

    if (targetState === SessionProgressState.NOT_STARTED) {
      resolvedPercentage = 0;
      resolvedWasActuallyHeld = false;
    } else if (targetState === SessionProgressState.IN_PROGRESS) {
      resolvedPercentage = percentage !== undefined ? percentage : 50;
      resolvedWasActuallyHeld = true;
    } else if (targetState === SessionProgressState.COMPLETED) {
      resolvedPercentage = 100;
      resolvedWasActuallyHeld = true;
    } else if (targetState === SessionProgressState.PARTIALLY_COMPLETED) {
      if (percentage === undefined || percentage <= 0 || percentage >= 100) {
        throw new Error("PERCENTAGE_VIOLATION: Partially completed sessions require a progress percentage between 1 and 99.");
      }
      resolvedPercentage = percentage;
      resolvedWasActuallyHeld = true;
    } else {
      // POSTPONED, CANCELLED, SKIPPED
      resolvedPercentage = 0;
      resolvedWasActuallyHeld = false;
    }

    // 7. Determine completedAt timestamp
    let resolvedCompletedAt = session.completedAt;
    if (targetState === SessionProgressState.COMPLETED || targetState === SessionProgressState.PARTIALLY_COMPLETED) {
      if (!session.completedAt) {
        resolvedCompletedAt = new Date();
      }
    } else if (isReopening) {
      resolvedCompletedAt = null;
    }

    // 8. Synchronize primary terminal states back to CourseSessionStatus status
    let resolvedStatus: CourseSessionStatus = session.status;
    if (targetState === SessionProgressState.CANCELLED) {
      resolvedStatus = CourseSessionStatus.CANCELLED;
    } else if (targetState === SessionProgressState.SKIPPED) {
      resolvedStatus = CourseSessionStatus.SKIPPED;
    }

    // 9. Update database record
    const updatedSession = await tx.courseSession.update({
      where: { id: sessionId },
      data: {
        progressState: targetState,
        progressPercentage: resolvedPercentage,
        completedAt: resolvedCompletedAt,
        actualStartTime: actualStartTime !== undefined ? actualStartTime : session.actualStartTime,
        actualEndTime: actualEndTime !== undefined ? actualEndTime : session.actualEndTime,
        executionNotes: notes !== undefined ? notes : session.executionNotes,
        executionMetadata: metadata !== undefined ? metadata : (session.executionMetadata || undefined),
        wasActuallyHeld: resolvedWasActuallyHeld,
        status: resolvedStatus,
      }
    });

    // 10. Map mutationType for logging
    let mutationType: TimelineMutationType = TimelineMutationType.SESSION_PROGRESS_UPDATED;
    if (isReopening) {
      mutationType = TimelineMutationType.SESSION_REOPENED;
    } else if (targetState === SessionProgressState.COMPLETED) {
      mutationType = TimelineMutationType.SESSION_COMPLETED;
    } else if (targetState === SessionProgressState.PARTIALLY_COMPLETED) {
      mutationType = TimelineMutationType.SESSION_PARTIAL;
    } else if (targetState === SessionProgressState.POSTPONED) {
      mutationType = TimelineMutationType.SESSION_POSTPONED;
    } else if (targetState === SessionProgressState.SKIPPED) {
      mutationType = TimelineMutationType.SESSION_SKIPPED;
    }

    // 11. Append TimelineMutationLog Entry
    await tx.timelineMutationLog.create({
      data: {
        userId,
        courseId: session.courseId,
        courseSessionId: sessionId,
        mutationType,
        affectedSequences: [session.sequenceNumber],
        previousState: {
          progressState: session.progressState,
          progressPercentage: session.progressPercentage,
          completedAt: session.completedAt ? session.completedAt.toISOString() : null,
          wasActuallyHeld: session.wasActuallyHeld,
          status: session.status
        },
        newState: {
          progressState: targetState,
          progressPercentage: resolvedPercentage,
          completedAt: resolvedCompletedAt ? resolvedCompletedAt.toISOString() : null,
          wasActuallyHeld: resolvedWasActuallyHeld,
          status: resolvedStatus
        },
        reason: reason || notes || `Progress updated to ${targetState}`,
        actorUserId: actorUserId || userId,
        actorType,
        triggerSource
      }
    });

    return updatedSession;
  });
}

// -------------------------------------------------------------
// Specialized Helper wrappers
// -------------------------------------------------------------

export async function markSessionCompleted(params: {
  sessionId: string;
  userId: string;
  notes?: string;
  actualStartTime?: Date;
  actualEndTime?: Date;
  lastUpdatedAt: string;
  actorUserId?: string;
  actorType?: string;
  triggerSource?: string;
  bypassTimestamps?: boolean;
}) {
  return await updateSessionProgress({
    ...params,
    state: SessionProgressState.COMPLETED,
    percentage: 100,
  });
}

export async function markSessionInProgress(params: {
  sessionId: string;
  userId: string;
  lastUpdatedAt: string;
  actorUserId?: string;
  actorType?: string;
  triggerSource?: string;
}) {
  return await updateSessionProgress({
    ...params,
    state: SessionProgressState.IN_PROGRESS,
    percentage: 50,
  });
}

export async function markSessionPostponed(params: {
  sessionId: string;
  userId: string;
  reason: string;
  lastUpdatedAt: string;
  actorUserId?: string;
  actorType?: string;
  triggerSource?: string;
}) {
  return await updateSessionProgress({
    ...params,
    state: SessionProgressState.POSTPONED,
    reason: params.reason,
    notes: params.reason,
  });
}

export async function markSessionSkipped(params: {
  sessionId: string;
  userId: string;
  reason: string;
  lastUpdatedAt: string;
  actorUserId?: string;
  actorType?: string;
  triggerSource?: string;
}) {
  return await updateSessionProgress({
    ...params,
    state: SessionProgressState.SKIPPED,
    reason: params.reason,
    notes: params.reason,
  });
}

export async function reopenSession(params: {
  sessionId: string;
  userId: string;
  targetState?: SessionProgressState;
  reason: string;
  lastUpdatedAt: string;
  actorUserId?: string;
  actorType?: string;
  triggerSource?: string;
  allowOverride?: boolean;
}) {
  const target = params.targetState || SessionProgressState.IN_PROGRESS;
  return await updateSessionProgress({
    ...params,
    state: target,
    reason: params.reason,
  });
}
