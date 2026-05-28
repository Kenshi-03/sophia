import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { updateSessionProgress } from "@/lib/academic/course-session-progress";
import { invalidateUserCache } from "@/lib/redis";

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
      state,
      percentage,
      notes,
      actualStartTime,
      actualEndTime,
      reason,
      lastUpdatedAt,
      allowOverride,
      bypassTimestamps,
    } = body;

    if (!lastUpdatedAt) {
      return NextResponse.json({ 
        error: "Missing optimistic concurrency verification marker (lastUpdatedAt)." 
      }, { status: 400 });
    }

    if (!state) {
      return NextResponse.json({ 
        error: "Missing required execution status parameter (state)." 
      }, { status: 400 });
    }

    // Parse execution ISO timestamps to Date objects if provided
    const parsedStart = actualStartTime ? new Date(actualStartTime) : null;
    const parsedEnd = actualEndTime ? new Date(actualEndTime) : null;

    try {
      const updatedSession = await updateSessionProgress({
        sessionId: id,
        userId: user.id,
        state,
        percentage: percentage !== undefined ? Number(percentage) : undefined,
        notes,
        actualStartTime: parsedStart,
        actualEndTime: parsedEnd,
        reason,
        lastUpdatedAt,
        allowOverride: !!allowOverride,
        bypassTimestamps: !!bypassTimestamps,
        actorUserId: user.id,
        actorType: "USER",
        triggerSource: "WEB_INTERFACE",
      });

      // Invalidate cognitive load & briefing caches
      await invalidateUserCache(user.id, "cognitive");

      return NextResponse.json({
        success: true,
        session: updatedSession
      });
    } catch (validationErr: any) {
      const errMsg = validationErr.message || "Gagal memperbarui status eksekusi sesi.";
      
      // Determine proper client error status based on type
      if (
        errMsg.includes("CONCURRENCY_VIOLATION") ||
        errMsg.includes("GOVERNANCE_LOCK_VIOLATION") ||
        errMsg.includes("TIMESTAMP_VIOLATION") ||
        errMsg.includes("PERCENTAGE_VIOLATION") ||
        errMsg.includes("invalid")
      ) {
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }

      throw validationErr; // Escalate unexpected DB or transaction issues
    }

  } catch (error: any) {
    console.error("POST /api/academic/sessions/[id]/progress error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error. Gagal menyimpan perubahan progress." 
    }, { status: 500 });
  }
}
