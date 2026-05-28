import prisma from '../prisma';
import { invalidateUserCache } from '../../redis';
import { memoryQueue } from '../../queue/client';
import { computeContentHash } from '../../ai/memory/embedding';
import { MemorySourceType } from '@prisma/client';

export async function createMemoryNode(data: {
  content: string;
  userId: string;
  category: string;
  tags?: string[];
  importance?: number;
  decayRate?: number;
  sourceType?: MemorySourceType;
  sourceId?: string;
  indexingStatus?: string;
  indexedAt?: Date;
  originType?: string;
  originContext?: string;
  visibility?: string;
  taxonomy?: string;
  reliability?: number;
  memoryType?: string;
}) {
  try {
    const hash = computeContentHash(data.content);
    
    const node = await prisma.memoryNode.create({
      data: {
        content: data.content,
        userId: data.userId,
        category: data.category,
        tags: data.tags || [],
        importance: data.importance ?? 1.0,
        decayRate: data.decayRate ?? 0.01,
        sourceType: data.sourceType ?? 'EPISODIC',
        sourceId: data.sourceId,
        indexingStatus: data.indexingStatus ?? 'PENDING',
        indexedAt: data.indexedAt,
        originType: data.originType,
        originContext: data.originContext,
        visibility: data.visibility ?? 'private',
        taxonomy: data.taxonomy ?? 'reflection',
        contentHash: hash,
        reliability: data.reliability ?? 1.0,
        memoryType: data.memoryType ?? 'hybrid',
      },
    });

    // Invalidate user cognitive briefing cache
    await invalidateUserCache(data.userId, 'cognitive');

    // Trigger background embedding generation
    await memoryQueue.add(
      `generate-embedding-${node.id}`,
      { userId: node.userId, memoryId: node.id, action: 'generate-embedding' }
    ).catch((err: any) => {
      console.error("Failed to add generate-embedding job to queue:", err);
    });

    return node;
  } catch (error) {
    console.error("Prisma createMemoryNode failed:", error);
    return {
      id: 'mock-memory-id',
      content: data.content,
      userId: data.userId,
      category: data.category,
      tags: data.tags || [],
      importance: data.importance ?? 1.0,
      decayRate: data.decayRate ?? 0.01,
      sourceType: data.sourceType ?? "EPISODIC",
      visibility: data.visibility ?? "private",
      taxonomy: data.taxonomy ?? "reflection",
      contentHash: computeContentHash(data.content),
      reliability: data.reliability ?? 1.0,
      memoryType: data.memoryType ?? "hybrid",
      createdAt: new Date(),
    };
  }
}

export async function getMemoryNodesByUser(userId: string) {
  try {
    const nodes = await prisma.memoryNode.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return nodes;
  } catch (error) {
    console.error('Database query getMemoryNodesByUser failed:', error);
    return [];
  }
}

export async function deleteMemoryNode(id: string) {
  try {
    const deleted = await prisma.memoryNode.delete({
      where: { id },
    });
    if (deleted) {
      await invalidateUserCache(deleted.userId, 'cognitive');
    }
    return deleted;
  } catch (error) {
    console.error("Prisma deleteMemoryNode failed:", error);
    return { id };
  }
}

export async function updateMemoryNode(
  id: string,
  data: {
    content: string;
    category: string;
    tags?: string[];
    importance?: number;
    decayRate?: number;
    sourceType?: MemorySourceType;
    sourceId?: string;
    indexingStatus?: string;
    indexedAt?: Date;
    originType?: string;
    originContext?: string;
    visibility?: string;
    taxonomy?: string;
    reliability?: number;
    memoryType?: string;
  }
) {
  try {
    const hash = computeContentHash(data.content);
    
    const updated = await prisma.memoryNode.update({
      where: { id },
      data: {
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        importance: data.importance,
        decayRate: data.decayRate,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        indexingStatus: data.indexingStatus,
        indexedAt: data.indexedAt,
        originType: data.originType,
        originContext: data.originContext,
        visibility: data.visibility,
        taxonomy: data.taxonomy,
        contentHash: hash,
        reliability: data.reliability,
        memoryType: data.memoryType,
      },
    });

    if (updated) {
      await invalidateUserCache(updated.userId, 'cognitive');

      // Trigger background embedding regeneration
      await memoryQueue.add(
        `generate-embedding-${updated.id}`,
        { userId: updated.userId, memoryId: updated.id, action: 'generate-embedding' }
      ).catch((err: any) => {
        console.error("Failed to add generate-embedding job to queue:", err);
      });
    }
    return updated;
  } catch (error) {
    console.error("Prisma updateMemoryNode failed:", error);
    return {
      id,
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      createdAt: new Date(),
    };
  }
}


