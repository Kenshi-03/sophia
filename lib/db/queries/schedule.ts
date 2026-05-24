import prisma from '../prisma';
import { CalendarEvent } from '@/types/calendar';

export async function getUserSchedule(userId: string): Promise<CalendarEvent[]> {
  const dbEvents = await prisma.event.findMany({
    where: { userId },
    orderBy: { startTime: 'asc' },
  });

  return dbEvents.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    location: event.location,
    // Add heuristics for UI tags and cognitive load calculation
    isFocusMode: event.title.toLowerCase().includes("focus") || 
                 event.title.toLowerCase().includes("deep work") || 
                 event.title.toLowerCase().includes("sprint"),
    cognitiveLoad: event.title.toLowerCase().includes("sprint") ? 80 : 35,
    tags: event.title.toLowerCase().includes("sprint") ? ["coding", "sprint"] : ["routine"],
  }));
}

export async function upsertUserSchedule(userId: string, events: CalendarEvent[]) {
  const operations = events.map(event => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);

    return prisma.event.upsert({
      where: { id: event.id },
      update: {
        title: event.title,
        description: event.description || null,
        startTime,
        endTime,
        location: event.location || null,
      },
      create: {
        id: event.id,
        userId,
        title: event.title,
        description: event.description || null,
        startTime,
        endTime,
        location: event.location || null,
      },
    });
  });

  await prisma.$transaction(operations);
  return { success: true, count: events.length };
}
