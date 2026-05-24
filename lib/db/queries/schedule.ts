import prisma from '../prisma';

export async function upsertUserSchedule(userId: string, events: any[]) {
  // Dummy query placeholder
  return { success: true, count: events.length };
}

export async function getUserSchedule(userId: string) {
  // Dummy query placeholder
  return [];
}
