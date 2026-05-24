"use server"

import { prisma } from "@/lib/db/prisma"
import { revalidatePath } from "next/cache"

export async function toggleTaskCompletion(taskId: string, currentStatus: boolean) {
  try {
    // If the task ID is a mock task, we just log it and return success for client-side local toggling
    if (taskId.startsWith("mock-")) {
      console.log(`[Mock Mode] Toggled task ${taskId} completion status to ${!currentStatus}`)
      revalidatePath("/dashboard")
      return { success: true, taskId, completed: !currentStatus }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { completed: !currentStatus },
    })

    revalidatePath("/dashboard")
    return { success: true, taskId: updatedTask.id, completed: updatedTask.completed }
  } catch (error) {
    console.warn("[Database Offline] Failed to toggle task in DB, falling back to client-side toggle:", error)
    return { success: true, taskId, completed: !currentStatus, fallback: true }
  }
}
