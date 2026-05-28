import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateAcademicConfig } from "@/lib/settings/category-seeding";
import { deleteGoogleEvent } from "@/lib/google/calendar/delete-event";
import { invalidateUserCache } from "@/lib/redis";
import { logger } from "@/lib/logger";

// GET: Fetch individual course detail, sessions, and timeline logs
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const course = await prisma.course.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      include: {
        sessions: {
          where: { deletedAt: null },
          orderBy: { sequenceNumber: "asc" },
        },
        mutationLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, course });
  } catch (error) {
    console.error("GET /api/academic/courses/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Soft-delete course and its sessions, and delete associated events (with Google sync removal)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch course details
    const course = await prisma.course.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      include: {
        sessions: {
          where: { deletedAt: null },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course tidak ditemukan." }, { status: 404 });
    }

    // Resolve calendar config to check Google Sync details
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

    const sessionIds = course.sessions.map((s) => s.id);

    // 2. Query and delete associated events (including Google Calendar deletion if mapped)
    const associatedEvents = await prisma.event.findMany({
      where: {
        courseSessionId: { in: sessionIds },
      },
    });

    // Run DB deletion and soft-deletes inside transaction
    await prisma.$transaction(async (tx) => {
      // Delete local database events
      await tx.event.deleteMany({
        where: {
          courseSessionId: { in: sessionIds },
        },
      });

      // Soft delete all sessions
      await tx.courseSession.updateMany({
        where: {
          courseId: course.id,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // Soft delete the course
      await tx.course.update({
        where: { id: course.id },
        data: {
          deletedAt: new Date(),
        },
      });
    });

    // Delete Google Calendar events asynchronously
    if (hasGoogleAccount && isGoogleCalValid) {
      for (const event of associatedEvents) {
        if (event.googleEventId) {
          try {
            await deleteGoogleEvent(user.id, config.googleCalendarId, event.googleEventId);
          } catch (err) {
            logger.error(`Failed to delete Google Calendar event ${event.googleEventId} on course deletion:`, err);
          }
        }
      }
    }

    // Invalidate user cognitive briefing cache
    await invalidateUserCache(user.id, "cognitive");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/academic/courses/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
