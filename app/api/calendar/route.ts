import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { seedDefaultCategoriesForUser } from "@/lib/settings/category-seeding";
import { createGoogleEvent } from "@/lib/google/calendar/create-event";
import { invalidateUserCache } from "@/lib/redis";

// GET: Fetch all calendar configs and events for the authenticated user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Seed default configurations if empty
    await seedDefaultCategoriesForUser(user.id);

    // Retrieve active and inactive configurations
    const categories = await prisma.calendarConfig.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { cognitiveCategory: "asc" },
    });

    const dbEvents = await prisma.event.findMany({
      where: { userId: user.id },
      include: { calendar: true },
      orderBy: { startTime: "asc" },
    });

    // Format events for UI with cognitive metadata and safe fallbacks
    const events = dbEvents.map((event) => {
      const rawType = event.calendar?.categoryType || "GENERAL"
      
      // Safe Fallback Rule: If linked config is soft-deleted or inactive, fallback type to GENERAL
      const isConfigValid = event.calendar && event.calendar.isActive && !event.calendar.deletedAt
      const resolvedType = isConfigValid ? rawType : "GENERAL"
      const catType = resolvedType.toLowerCase().replace("_", "-")
      
      // Calculate cognitive load weights based on categories
      let cognitiveLoad = 35; // Default moderate load
      if (catType === "exam") cognitiveLoad = 80;
      else if (catType === "deep-work") cognitiveLoad = 75;
      else if (catType === "health") cognitiveLoad = -15; // Recovery
      else if (catType === "recovery") cognitiveLoad = -30; // High recovery
      else if (catType === "social") cognitiveLoad = -10;

      const isFocusMode = catType === "deep-work" || event.title.toLowerCase().includes("focus");

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.location,
        googleEventId: event.googleEventId,
        calendarId: event.calendarId,
        color: event.calendar?.color || "#8083ff",
        categoryName: event.calendar?.cognitiveCategory || "General",
        categoryType: catType,
        isFocusMode,
        cognitiveLoad,
        tags: event.calendar?.cognitiveCategory ? [event.calendar.cognitiveCategory.toLowerCase()] : [],
      };
    });

    return NextResponse.json({ success: true, events, categories });
  } catch (error) {
    console.error("GET /api/calendar error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create a new event and sync it to Google Calendar if credentials exist
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Refresh user object to fetch accounts
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        accounts: {
          where: { provider: "google" },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, startTime, endTime, location, calendarId } = body;

    if (!title || !startTime || !endTime || !calendarId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Query CalendarConfig
    const category = await prisma.calendarConfig.findFirst({
      where: { id: calendarId, userId: dbUser.id },
    });

    if (!category) {
      return NextResponse.json({ error: "Kategori kalender tidak ditemukan." }, { status: 400 });
    }

    // Active/integrity validation during event creation:
    // Reject event creation if CalendarConfig is inactive, soft-deleted, or has invalid mapping
    if (!category.isActive) {
      return NextResponse.json({ error: "Kategori kognitif yang dipilih sedang tidak aktif." }, { status: 400 });
    }

    if (category.deletedAt !== null) {
      return NextResponse.json({ error: "Kategori kognitif yang dipilih telah dihapus." }, { status: 400 });
    }

    if (!category.googleCalendarId || category.googleCalendarId.trim() === "") {
      return NextResponse.json({ error: "Kategori kognitif tidak memiliki pemetaan Google Calendar yang valid." }, { status: 400 });
    }

    // 1. Create event locally
    const event = await prisma.event.create({
      data: {
        userId: dbUser.id,
        calendarId,
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: location || null,
      },
    });

    let googleEventId: string | null = null;
    const hasGoogleAccount = dbUser.accounts.length > 0;
    const isGoogleCalValid = category.googleCalendarId && !category.googleCalendarId.startsWith("local-");

    // 2. Sync to Google Calendar if available
    if (hasGoogleAccount && isGoogleCalValid) {
      try {
        googleEventId = await createGoogleEvent(dbUser.id, category.googleCalendarId, {
          title,
          description,
          startTime,
          endTime,
          location,
        });

        // Update local event with Google event ID
        await prisma.event.update({
          where: { id: event.id },
          data: { googleEventId },
        });
      } catch (err) {
        console.error("Failed to sync new event to Google Calendar:", err);
        // We proceed as local creation succeeded
      }
    }

    // Invalidate user cognitive briefing cache
    await invalidateUserCache(dbUser.id, "cognitive");

    return NextResponse.json({
      success: true,
      event: {
        ...event,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        googleEventId,
      },
    });
  } catch (error) {
    console.error("POST /api/calendar error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
