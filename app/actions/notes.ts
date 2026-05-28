"use server"

import { getCurrentUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { MemoryManager } from "@/lib/ai/memory/memory-manager"
import { revalidatePath } from "next/cache"

export async function getNotesAction() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const notes = await prisma.note.findMany({
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
      notes: notes.map(n => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
        deletedAt: n.deletedAt ? n.deletedAt.toISOString() : null,
      }))
    }
  } catch (error) {
    console.error("Failed to fetch notes:", error)
    return { success: false, error: "Database error" }
  }
}

export async function createNoteAction(data: {
  title: string;
  content: string;
  category?: string;
  notebook?: string;
  tags?: string[];
}) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const note = await MemoryManager.createNote(user.id, data)

    revalidatePath("/dashboard/notes")
    revalidatePath("/dashboard/memory")
    return {
      success: true,
      note: {
        ...note,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        deletedAt: null,
      }
    }
  } catch (error) {
    console.error("Failed to create note:", error)
    return { success: false, error: "Failed to create note" }
  }
}

export async function updateNoteAction(
  noteId: string,
  data: {
    title: string;
    content: string;
    category?: string;
    notebook?: string;
    tags?: string[];
  }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    const note = await MemoryManager.updateNote(noteId, user.id, data)

    revalidatePath("/dashboard/notes")
    revalidatePath("/dashboard/memory")
    return {
      success: true,
      note: {
        ...note,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        deletedAt: null,
      }
    }
  } catch (error) {
    console.error("Failed to update note:", error)
    return { success: false, error: "Failed to update note" }
  }
}

export async function deleteNoteAction(noteId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    await MemoryManager.deleteNote(noteId, user.id)

    revalidatePath("/dashboard/notes")
    revalidatePath("/dashboard/memory")
    return { success: true, noteId }
  } catch (error) {
    console.error("Failed to delete note:", error)
    return { success: false, error: "Failed to delete note" }
  }
}
