"use server"

import { prisma } from "@/lib/db/prisma"
import { getCurrentUser } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"

export async function toggleTaskCompletion(taskId: string, currentStatus: boolean) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const updatedTask = await prisma.task.update({
      where: { 
        id: taskId,
        userId: user.id
      },
      data: { completed: !currentStatus },
    })

    revalidatePath("/dashboard")
    return { success: true, taskId: updatedTask.id, completed: updatedTask.completed }
  } catch (error) {
    console.error("Failed to toggle task in DB:", error)
    return { success: false, error: "Database error" }
  }
}
