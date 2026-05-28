import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkGlobalCollisions } from "@/lib/academic/academic";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plannedDate, startTime, endTime, room, excludeEventId } = body;

    if (!plannedDate || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const conflicts = await checkGlobalCollisions(
      user.id,
      plannedDate,
      startTime,
      endTime,
      room || null,
      excludeEventId || null
    );

    return NextResponse.json({ success: true, conflicts });
  } catch (error) {
    console.error("POST /api/academic/collisions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
