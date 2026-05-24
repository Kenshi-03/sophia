import prisma from '../prisma';
import { CalendarEvent } from '@/types/calendar';

export async function upsertUserSchedule(userId: string, events: CalendarEvent[]) {
  // Dummy query placeholder
  return { success: true, count: events.length };
}

export async function getUserSchedule(userId: string) {
  // Dummy query placeholder
  return [];
}
