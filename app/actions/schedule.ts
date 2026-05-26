"use server"

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { CalendarEvent } from "@/types/calendar";
import { revalidatePath } from "next/cache";

export async function saveFocusBlockAction(event: Omit<CalendarEvent, "id"> & { id?: string }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Find or seed a category for the user
    let category = await prisma.calendarCategory.findFirst({
      where: { userId: user.id, categoryType: "deep-work" },
    });

    if (!category) {
      const { seedDefaultCategoriesForUser } = await import("@/lib/settings/category-seeding");
      await seedDefaultCategoriesForUser(user.id);
      category = await prisma.calendarCategory.findFirst({
        where: { userId: user.id, categoryType: "deep-work" },
      });
    }

    const calendarId = category?.id || event.calendarId;

    if (!calendarId) {
      return { success: false, error: "Calendar category not found" };
    }

    const newEvent = await prisma.event.create({
      data: {
        id: event.id || undefined,
        userId: user.id,
        calendarId,
        title: event.title,
        description: event.description || null,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        location: event.location || null,
      },
    });

    revalidatePath("/dashboard/calendar");
    return { 
      success: true, 
      event: {
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description,
        startTime: newEvent.startTime.toISOString(),
        endTime: newEvent.endTime.toISOString(),
        location: newEvent.location,
      } 
    };
  } catch (error) {
    console.error("Failed to save focus block:", error);
    return { success: false, error: "Database error" };
  }
}
