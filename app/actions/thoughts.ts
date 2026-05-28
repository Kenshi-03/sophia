"use server"

import { getCurrentUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { MemoryManager } from "@/lib/ai/memory/memory-manager"
import { revalidatePath } from "next/cache"

export async function getThoughtsAction() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const thoughts = await prisma.thought.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return {
      success: true,
      thoughts: thoughts.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        deletedAt: t.deletedAt ? t.deletedAt.toISOString() : null,
      }))
    }
  } catch (error) {
    console.error("Failed to fetch thoughts:", error)
    return { success: false, error: "Database error" }
  }
}

export async function createThoughtAction(content: string, tags: string[] = []) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const thought = await MemoryManager.createThought(user.id, content, tags)

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/memory")
    return {
      success: true,
      thought: {
        ...thought,
        createdAt: thought.createdAt.toISOString(),
        updatedAt: thought.updatedAt.toISOString(),
        deletedAt: null,
      }
    }
  } catch (error: any) {
    console.error("Failed to create thought:", error)
    return { success: false, error: error.message || "Failed to create thought" }
  }
}

export async function deleteThoughtAction(thoughtId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    await MemoryManager.deleteThought(thoughtId, user.id)

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/memory")
    return { success: true, thoughtId }
  } catch (error) {
    console.error("Failed to delete thought:", error)
    return { success: false, error: "Failed to delete thought" }
  }
}
