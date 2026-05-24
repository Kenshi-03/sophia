"use server"

import { deleteMemoryNode, updateMemoryNode } from "@/lib/db/queries/memory"
import { revalidatePath } from "next/cache"

export async function deleteMemoryAction(memoryId: string) {
  try {
    if (memoryId.startsWith("mock-")) {
      console.log(`[Mock Mode] Deleted memory node ${memoryId}`)
      revalidatePath("/dashboard/memory")
      return { success: true, memoryId }
    }

    await deleteMemoryNode(memoryId)
    revalidatePath("/dashboard/memory")
    return { success: true, memoryId }
  } catch (error) {
    console.warn("[Database Offline] Failed to delete memory node in DB, falling back to client-side:", error)
    return { success: true, memoryId, fallback: true }
  }
}

export async function updateMemoryAction(
  memoryId: string,
  data: { content: string; category: string; tags: string[] }
) {
  try {
    if (memoryId.startsWith("mock-") || memoryId.length < 5) {
      console.log(`[Mock Mode] Updated memory node ${memoryId}`)
      revalidatePath("/dashboard/memory")
      return { 
        success: true, 
        memoryId, 
        updatedNode: { 
          id: memoryId, 
          ...data, 
          createdAt: new Date().toISOString() 
        } 
      }
    }

    const updatedNode = await updateMemoryNode(memoryId, data)
    revalidatePath("/dashboard/memory")
    return {
      success: true,
      memoryId,
      updatedNode: {
        ...updatedNode,
        createdAt: updatedNode.createdAt instanceof Date ? updatedNode.createdAt.toISOString() : updatedNode.createdAt,
      },
    }
  } catch (error) {
    console.warn("[Database Offline] Failed to update memory node in DB, falling back to client-side:", error)
    return {
      success: true,
      memoryId,
      updatedNode: { id: memoryId, ...data, createdAt: new Date().toISOString() },
      fallback: true,
    }
  }
}
