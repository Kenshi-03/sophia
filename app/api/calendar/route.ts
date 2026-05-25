import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { seedDefaultCategoriesForUser } from "@/lib/settings/category-seeding";
import { createGoogleEvent } from "@/lib/google/calendar/create-event";

// GET: Fetch all calendar categories and events for the authenticated user
export async function GET() {
  try {
    const session = await auth();
    const email = session?.user?.email || "user@sophia.local";

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Dynamic Seeding of Categories
    await seedDefaultCategoriesForUser(user.id);

    // Retrieve categories and events
    const categories = await prisma.calendarCategory.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });

    const dbEvents = await prisma.event.findMany({
      where: { userId: user.id },
      include: { calendar: true },
      orderBy: { startTime: "asc" },
    });

    // Format events for UI with cognitive metadata
    const events = dbEvents.map((event) => {
      const catType = event.calendar?.categoryType || "";
      
      // Calculate cognitive load weights based on categories
      let cognitiveLoad = 35; // Default moderate load
      if (catType === "exam-evaluation") cognitiveLoad = 80;
      else if (catType === "deep-work") cognitiveLoad = 75;
      else if (catType === "workout-health") cognitiveLoad = -15; // Recovery
      else if (catType === "rest") cognitiveLoad = -30; // High recovery
      else if (catType === "leisure-social") cognitiveLoad = -10;

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
        categoryName: event.calendar?.name || "General",
        categoryType: catType,
        isFocusMode,
        cognitiveLoad,
        tags: event.calendar?.name ? [event.calendar.name.toLowerCase()] : [],
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
    const session = await auth();
    const email = session?.user?.email || "user@sophia.local";

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          where: { provider: "google" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, startTime, endTime, location, calendarId } = body;

    if (!title || !startTime || !endTime || !calendarId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const category = await prisma.calendarCategory.findUnique({
      where: { id: calendarId, userId: user.id },
    });

    if (!category) {
      return NextResponse.json({ error: "Invalid calendar category" }, { status: 400 });
    }

    // 1. Create event locally
    const event = await prisma.event.create({
      data: {
        userId: user.id,
        calendarId,
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: location || null,
      },
    });

    let googleEventId: string | null = null;
    const hasGoogleAccount = user.accounts.length > 0;
    const isGoogleCalValid = category.googleCalId && !category.googleCalId.startsWith("local-");

    // 2. Sync to Google Calendar if available
    if (hasGoogleAccount && isGoogleCalValid) {
      try {
        googleEventId = await createGoogleEvent(user.id, category.googleCalId, {
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
