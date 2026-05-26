import prisma from "../../db/prisma";
import { logger } from "../../logger";

export interface RelatedEntity {
  type: string;
  data: any;
  relation: any;
}

/**
 * Creates or updates a relationship between two nodes in the semantic graph.
 * If strength drops below the threshold (0.3), the relationship is discarded to maintain a sparse graph.
 */
export async function setRelationship(params: {
  userId: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relationType: string;
  relationStrength: number;
  relationConfidence: number;
}): Promise<any> {
  const {
    userId,
    sourceId,
    sourceType,
    targetId,
    targetType,
    relationType,
    relationStrength,
    relationConfidence,
  } = params;

  try {
    const existing = await prisma.memoryRelation.findFirst({
      where: {
        userId,
        sourceId,
        sourceType,
        targetId,
        targetType,
      },
    });

    if (relationStrength < 0.3) {
      if (existing) {
        await prisma.memoryRelation.delete({
          where: { id: existing.id },
        });
        logger.info("Removed weak relationship due to graph thresholding", {
          sourceId,
          targetId,
          relationStrength,
        });
      }
      return null;
    }

    if (existing) {
      const updated = await prisma.memoryRelation.update({
        where: { id: existing.id },
        data: {
          relationType,
          relationStrength,
          relationConfidence,
        },
      });
      return updated;
    } else {
      const created = await prisma.memoryRelation.create({
        data: {
          userId,
          sourceId,
          sourceType,
          targetId,
          targetType,
          relationType,
          relationStrength,
          relationConfidence,
        },
      });
      return created;
    }
  } catch (error) {
    logger.error("Failed to establish relationship", error);
    throw error;
  }
}

/**
 * Traverses relations connected to a node, returning actual fetched objects.
 */
export async function getRelatedContexts(
  userId: string,
  nodeId: string,
  nodeType: string
): Promise<RelatedEntity[]> {
  try {
    const relations = await prisma.memoryRelation.findMany({
      where: {
        userId,
        OR: [
          { sourceId: nodeId, sourceType: nodeType },
          { targetId: nodeId, targetType: nodeType },
        ],
        relationStrength: { gte: 0.3 },
      },
    });

    const results: RelatedEntity[] = [];

    for (const rel of relations) {
      const isSource = rel.sourceId === nodeId && rel.sourceType === nodeType;
      const targetId = isSource ? rel.targetId : rel.sourceId;
      const targetType = isSource ? rel.targetType : rel.sourceType;

      if (targetType === "memory") {
        const node = await prisma.memoryNode.findUnique({
          where: { id: targetId },
        });
        if (node) results.push({ type: "memory", data: node, relation: rel });
      } else if (targetType === "event") {
        const event = await prisma.event.findUnique({
          where: { id: targetId },
        });
        if (event) results.push({ type: "event", data: event, relation: rel });
      } else if (targetType === "task") {
        const task = await prisma.task.findUnique({
          where: { id: targetId },
        });
        if (task) results.push({ type: "task", data: task, relation: rel });
      }
    }

    return results;
  } catch (error) {
    logger.error("Failed to retrieve related contexts", error);
    return [];
  }
}

/**
 * Discovers and records relations between a newly created memory and other existing user events/tasks.
 */
export async function autoDiscoverRelations(
  userId: string,
  memoryId: string
): Promise<number> {
  try {
    const memory = await prisma.memoryNode.findUnique({
      where: { id: memoryId },
    });

    if (!memory) return 0;

    const contentWords = memory.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (contentWords.length === 0) return 0;

    // Fetch tasks & events
    const [tasks, events] = await Promise.all([
      prisma.task.findMany({ where: { userId, completed: false } }),
      prisma.event.findMany({
        where: { userId },
        orderBy: { startTime: "desc" },
        take: 30,
      }),
    ]);

    let relationCount = 0;

    // Check overlap with tasks
    for (const task of tasks) {
      const titleLower = task.title.toLowerCase();
      const contentLower = (task.content || "").toLowerCase();
      let matches = 0;

      contentWords.forEach((word) => {
        if (titleLower.includes(word) || contentLower.includes(word)) {
          matches++;
        }
      });

      if (matches >= 2) {
        const strength = Math.min(1.0, 0.2 + (matches * 0.15));
        await setRelationship({
          userId,
          sourceId: memoryId,
          sourceType: "memory",
          targetId: task.id,
          targetType: "task",
          relationType: "related",
          relationStrength: strength,
          relationConfidence: 0.8,
        });
        relationCount++;
      }
    }

    // Check overlap with events
    for (const event of events) {
      const titleLower = event.title.toLowerCase();
      const descLower = (event.description || "").toLowerCase();
      let matches = 0;

      contentWords.forEach((word) => {
        if (titleLower.includes(word) || descLower.includes(word)) {
          matches++;
        }
      });

      if (matches >= 2) {
        const strength = Math.min(1.0, 0.2 + (matches * 0.15));
        await setRelationship({
          userId,
          sourceId: memoryId,
          sourceType: "memory",
          targetId: event.id,
          targetType: "event",
          relationType: "related",
          relationStrength: strength,
          relationConfidence: 0.8,
        });
        relationCount++;
      }
    }

    return relationCount;
  } catch (error) {
    logger.error("Auto discover relations failed", error);
    return 0;
  }
}
