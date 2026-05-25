import { prisma } from "../prisma";
import { CalendarEvent } from "@/types/calendar";
import { seedDefaultCategoriesForUser } from "@/lib/settings/category-seeding";

export async function getUserSchedule(userId: string): Promise<CalendarEvent[]> {
  // Ensure default categories are seeded
  await seedDefaultCategoriesForUser(userId);

  const dbEvents = await prisma.event.findMany({
    where: { userId },
    include: { calendar: true },
    orderBy: { startTime: "asc" },
  });

  return dbEvents.map((event) => {
    const catType = event.calendar?.categoryType || "";
    
    // Cognitive load calculations
    let cognitiveLoad = 35;
    if (catType === "exam-evaluation") cognitiveLoad = 80;
    else if (catType === "deep-work") cognitiveLoad = 75;
    else if (catType === "workout-health") cognitiveLoad = -15;
    else if (catType === "rest") cognitiveLoad = -30;
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
}

export async function upsertUserSchedule(userId: string, events: CalendarEvent[]) {
  // Seed categories first to ensure we can reference a category
  await seedDefaultCategoriesForUser(userId);

  // Retrieve seeded categories to map by name or type
  const userCategories = await prisma.calendarCategory.findMany({
    where: { userId },
  });

  // Find a fallback category or mapping
  const defaultCategory = userCategories[0];

  const operations = events.map((event) => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);

    // Try to find matching category by name or use the first one
    const categoryName = (event as any).categoryName || "";
    const matchedCategory = userCategories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    ) || defaultCategory;

    return prisma.event.upsert({
      where: { id: event.id },
      update: {
        title: event.title,
        description: event.description || null,
        startTime,
        endTime,
        location: event.location || null,
        googleEventId: event.googleEventId || null,
        calendarId: event.calendarId || matchedCategory?.id,
      },
      create: {
        id: event.id,
        userId,
        title: event.title,
        description: event.description || null,
        startTime,
        endTime,
        location: event.location || null,
        googleEventId: event.googleEventId || null,
        calendarId: event.calendarId || matchedCategory?.id,
      },
    });
  });

  await prisma.$transaction(operations);
  return { success: true, count: events.length };
}
