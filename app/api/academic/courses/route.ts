import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { generateSemesterTimeline } from "@/lib/academic/academic";
import { invalidateUserCache } from "@/lib/redis";
import { CourseSessionMode } from "@prisma/client";

// GET: Fetch all courses and their sessions for the user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courses = await prisma.course.findMany({
      where: { userId: user.id, deletedAt: null },
      include: {
        sessions: {
          where: { deletedAt: null },
          orderBy: { sequenceNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, courses });
  } catch (error) {
    console.error("GET /api/academic/courses error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create a new course and generate its semester timeline sessions and events
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
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
    } = body;

    // Validation
    if (!title || !lecturer || !semester || !academicYear || !totalSessions || !firstSessionDate || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedSemester = Number(semester);
    const parsedTotalSessions = Number(totalSessions);

    if (isNaN(parsedSemester) || isNaN(parsedTotalSessions) || parsedTotalSessions <= 0) {
      return NextResponse.json({ error: "Invalid numeric parameters" }, { status: 400 });
    }

    // Call Recurrence Generator
    const { course, sessions } = await generateSemesterTimeline({
      userId: user.id,
      title,
      lecturer,
      semester: parsedSemester,
      academicYear,
      totalSessions: parsedTotalSessions,
      defaultSessionMode: (defaultSessionMode as CourseSessionMode) || CourseSessionMode.OFFLINE,
      defaultLocation: defaultLocation || null,
      defaultMeetingLink: defaultMeetingLink || null,
      firstSessionDate,
      startTime,
      endTime,
    });

    // Invalidate user cognitive briefing cache
    await invalidateUserCache(user.id, "cognitive");

    return NextResponse.json({
      success: true,
      course,
      sessionsCount: sessions.length,
    });
  } catch (error: any) {
    console.error("POST /api/academic/courses error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
