import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { shiftAcademicSequence } from "@/lib/academic/academic-sequence-shift";
import { getOrCreateAcademicConfig } from "@/lib/settings/category-seeding";
import { prisma } from "@/lib/db/prisma";
import { updateGoogleEvent } from "@/lib/google/calendar/update-event";
import { invalidateUserCache } from "@/lib/redis";
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
    const { newDate, startTime, endTime, reason } = body;

    if (!newDate) {
      return NextResponse.json({ error: "New date is required for sequence shifting." }, { status: 400 });
    }

    // Call the sequence shift engine
    const result = await shiftAcademicSequence({
      sessionId: id,
      userId: user.id,
      newDate: new Date(newDate),
      startTime,
      endTime,
      reason,
    });

    // Resolve calendar config and Google accounts for sync
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

    // Perform Google Calendar updates outside the database transaction
    if (hasGoogleAccount && isGoogleCalValid && result.googleSyncJobs.length > 0) {
      for (const job of result.googleSyncJobs) {
        try {
          await updateGoogleEvent(user.id, config.googleCalendarId, job.googleEventId, {
            title: job.title,
            description: job.description,
            startTime: job.startTime,
            endTime: job.endTime,
            location: job.location,
          });
        } catch (err) {
          logger.error(`Failed to update Google Calendar event ${job.googleEventId} on sequence shift:`, err);
        }
      }
    }

    // Invalidate user cognitive briefing cache
    await invalidateUserCache(user.id, "cognitive");

    return NextResponse.json({
      success: true,
      shiftedCount: result.shiftedCount,
      warnings: result.collisions,
    });
  } catch (error: any) {
    console.error("POST /api/academic/sessions/[id]/shift error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
