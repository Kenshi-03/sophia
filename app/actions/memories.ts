"use server"

import { getCurrentUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { revalidatePath } from "next/cache"

export async function deleteMemoryAction(memoryId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    await prisma.memoryNode.delete({
      where: { 
        id: memoryId,
        userId: user.id
      }
    })

    revalidatePath("/dashboard/memory")
    return { success: true, memoryId }
  } catch (error) {
    console.error("Failed to delete memory node in DB:", error)
    return { success: false, error: "Database error" }
  }
}

export async function updateMemoryAction(
  memoryId: string,
  data: { content: string; category: string; tags: string[] }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const updatedNode = await prisma.memoryNode.update({
      where: { 
        id: memoryId,
        userId: user.id
      },
      data: {
        content: data.content,
        category: data.category,
        tags: data.tags,
      }
    })

    revalidatePath("/dashboard/memory")
    return {
      success: true,
      memoryId,
      updatedNode: {
        ...updatedNode,
        createdAt: updatedNode.createdAt.toISOString(),
      },
    }
  } catch (error) {
    console.error("Failed to update memory node in DB:", error)
    return { success: false, error: "Database error" }
  }
}
