"use server"

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { CalendarEvent } from "@/types/calendar";
import { revalidatePath } from "next/cache";

export async function saveFocusBlockAction(event: Omit<CalendarEvent, "id"> & { id?: string }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized" };
    }

    const email = session.user.email;
    const dbUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    const newEvent = await prisma.event.create({
      data: {
        id: event.id || undefined,
        userId: dbUser.id,
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
