import prisma from "../../db/prisma";
import { createMemoryNode, updateMemoryNode } from "../../db/queries/memory";
import { logger } from "../../logger";
import { MemorySourceType } from "@prisma/client";

// Bounded duplicate suppression configurations for Thought
const THOUGHT_DUPLICATE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const THOUGHT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const THOUGHT_RATE_LIMIT_MAX_COUNT = 5;

export class MemoryManager {
  /**
   * Note persistence and indexing
   */
  static async createNote(userId: string, data: {
    title: string;
    content: string;
    category?: string;
    notebook?: string;
    tags?: string[];
  }) {
    logger.info("MemoryManager.createNote: saving note to database", { userId, title: data.title });

    // 1. Save Note to PostgreSQL (Persistence Layer)
    const note = await prisma.note.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        category: data.category ?? "Ideas",
        notebook: data.notebook ?? "Personal",
        tags: data.tags ?? [],
      }
    });

    // 2. Index Note as MemoryNode (Retrieval Layer)
    try {
      const memoryContent = `# ${note.title}\n\n${note.content}`;
      const memoryNode = await createMemoryNode({
        userId,
        content: memoryContent,
        category: note.notebook, // Mapping notebook to category for retrieval
        tags: note.tags,
        sourceType: MemorySourceType.NOTE,
        sourceId: note.id,
        originType: "NOTE",
        originContext: "dashboard_notes",
        memoryType: "semantic",
        importance: 1.0,
      });

      // Update Note's index state if indexing succeeded
      if (memoryNode && memoryNode.id) {
        await prisma.memoryNode.update({
          where: { id: memoryNode.id },
          data: {
            indexingStatus: "COMPLETED",
            indexedAt: new Date(),
          }
        });
      }
    } catch (err) {
      logger.error("MemoryManager.createNote: failed to index note to MemoryNode", err, { noteId: note.id });
    }

    return note;
  }

  static async updateNote(noteId: string, userId: string, data: {
    title: string;
    content: string;
    category?: string;
    notebook?: string;
    tags?: string[];
  }) {
    logger.info("MemoryManager.updateNote: updating note in database", { userId, noteId });

    // 1. Update Note in PostgreSQL (Persistence Layer)
    const note = await prisma.note.update({
      where: { id: noteId, userId },
      data: {
        title: data.title,
        content: data.content,
        category: data.category,
        notebook: data.notebook,
        tags: data.tags,
      }
    });

    // 2. Update indexed MemoryNode (Retrieval Layer)
    try {
      // Find the existing MemoryNode associated with this Note
      const existingNode = await prisma.memoryNode.findFirst({
        where: {
          userId,
          sourceId: note.id,
          sourceType: MemorySourceType.NOTE,
        }
      });

      const memoryContent = `# ${note.title}\n\n${note.content}`;

      if (existingNode) {
        await updateMemoryNode(existingNode.id, {
          content: memoryContent,
          category: note.notebook,
          tags: note.tags,
          indexingStatus: "COMPLETED",
          indexedAt: new Date(),
        });
      } else {
        // If no node exists, create it (backfill indexer)
        const memoryNode = await createMemoryNode({
          userId,
          content: memoryContent,
          category: note.notebook,
          tags: note.tags,
          sourceType: MemorySourceType.NOTE,
          sourceId: note.id,
          originType: "NOTE",
          originContext: "dashboard_notes",
          memoryType: "semantic",
          importance: 1.0,
        });
        if (memoryNode && memoryNode.id) {
          await prisma.memoryNode.update({
            where: { id: memoryNode.id },
            data: {
              indexingStatus: "COMPLETED",
              indexedAt: new Date(),
            }
          });
        }
      }
    } catch (err) {
      logger.error("MemoryManager.updateNote: failed to update indexed MemoryNode", err, { noteId: note.id });
    }

    return note;
  }

  static async deleteNote(noteId: string, userId: string) {
    logger.info("MemoryManager.deleteNote: soft deleting note", { userId, noteId });

    // 1. Soft Delete Note (Persistence Layer)
    const note = await prisma.note.update({
      where: { id: noteId, userId },
      data: {
        deletedAt: new Date(),
        isArchived: true,
      }
    });

    // 2. Delete/Remove associated MemoryNode from retrieval substrate (Retrieval Layer)
    try {
      const existingNode = await prisma.memoryNode.findFirst({
        where: {
          userId,
          sourceId: noteId,
          sourceType: MemorySourceType.NOTE,
        }
      });

      if (existingNode) {
        await prisma.memoryNode.delete({
          where: { id: existingNode.id }
        });
      }
    } catch (err) {
      logger.error("MemoryManager.deleteNote: failed to remove indexed MemoryNode", err, { noteId });
    }

    return note;
  }

  /**
   * Thought persistence and indexing with duplicate suppression & throttling
   */
  static async createThought(userId: string, content: string, tags: string[] = []) {
    logger.info("MemoryManager.createThought: analyzing thought input", { userId });
    const cleanContent = content.trim();

    if (!cleanContent) {
      throw new Error("Thought content cannot be empty.");
    }

    const now = new Date();

    // 1. Duplicate Suppression Check (Last 10 minutes)
    const tenMinutesAgo = new Date(now.getTime() - THOUGHT_DUPLICATE_COOLDOWN_MS);
    const existingDuplicate = await prisma.thought.findFirst({
      where: {
        userId,
        content: cleanContent,
        createdAt: { gte: tenMinutesAgo },
        deletedAt: null,
      }
    });

    if (existingDuplicate) {
      logger.warn("MemoryManager.createThought: duplicate thought detected within cooldown window. Throttling insertion.", { userId, thoughtId: existingDuplicate.id });
      return existingDuplicate; // Suppress duplicate, return existing instance safely
    }

    // 2. Rate-Limiting Throttling Check (Max 5 thoughts per 10 minutes)
    const recentThoughtsCount = await prisma.thought.count({
      where: {
        userId,
        createdAt: { gte: tenMinutesAgo },
        deletedAt: null,
      }
    });

    if (recentThoughtsCount >= THOUGHT_RATE_LIMIT_MAX_COUNT) {
      logger.warn("MemoryManager.createThought: rate-limit threshold hit for quick capture thoughts.", { userId, count: recentThoughtsCount });
      throw new Error("Thought rate limit exceeded. Please wait a few minutes before capturing more thoughts.");
    }

    // 3. Save Thought to PostgreSQL (Persistence Layer)
    const thought = await prisma.thought.create({
      data: {
        userId,
        content: cleanContent,
        tags,
        visibility: "PRIVATE",
        retrievalEligible: true,
      }
    });

    // 4. Index Thought to MemoryNode (Retrieval Layer)
    if (thought.retrievalEligible) {
      try {
        const memoryNode = await createMemoryNode({
          userId,
          content: thought.content,
          category: "Personal", // Thoughts default to Personal category
          tags: thought.tags,
          sourceType: MemorySourceType.THOUGHT,
          sourceId: thought.id,
          originType: "THOUGHT",
          originContext: "quick_capture",
          memoryType: "episodic", // Thoughts represent episodic state captures
          importance: 0.8, // Slightly lower than explicit notes by default
        });

        if (memoryNode && memoryNode.id) {
          await prisma.memoryNode.update({
            where: { id: memoryNode.id },
            data: {
              indexingStatus: "COMPLETED",
              indexedAt: new Date(),
            }
          });
        }
      } catch (err) {
        logger.error("MemoryManager.createThought: failed to index thought to MemoryNode", err, { thoughtId: thought.id });
      }
    }

    return thought;
  }

  static async deleteThought(thoughtId: string, userId: string) {
    logger.info("MemoryManager.deleteThought: soft deleting thought", { userId, thoughtId });

    // 1. Soft Delete Thought (Persistence Layer)
    const thought = await prisma.thought.update({
      where: { id: thoughtId, userId },
      data: {
        deletedAt: new Date(),
        isArchived: true,
      }
    });

    // 2. Remove associated MemoryNode from retrieval substrate (Retrieval Layer)
    try {
      const existingNode = await prisma.memoryNode.findFirst({
        where: {
          userId,
          sourceId: thoughtId,
          sourceType: MemorySourceType.THOUGHT,
        }
      });

      if (existingNode) {
        await prisma.memoryNode.delete({
          where: { id: existingNode.id }
        });
      }
    } catch (err) {
      logger.error("MemoryManager.deleteThought: failed to remove indexed MemoryNode", err, { thoughtId });
    }

    return thought;
  }
}
