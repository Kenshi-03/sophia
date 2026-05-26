import prisma from "../../db/prisma";
import { MemoryNode } from "@/types/memory";
import { logger } from "../../logger";

/**
 * Calculates current importance based on exponential temporal decay:
 * S = I_base * e^(-decayRate * daysPassed)
 */
export function calculateDecayedImportance(node: MemoryNode): number {
  const baseImportance = node.importance ?? 1.0;
  const decayRate = node.decayRate ?? 0.01;
  
  const createdTime = node.createdAt 
    ? (node.createdAt instanceof Date ? node.createdAt.getTime() : new Date(node.createdAt).getTime()) 
    : Date.now();
    
  const diffMs = Date.now() - createdTime;
  const daysPassed = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  
  const currentImportance = baseImportance * Math.exp(-decayRate * daysPassed);
  return Number(currentImportance.toFixed(4));
}

/**
 * Boosts importance of an existing memory due to thought repetition or user interaction.
 * Capped at 10.0 maximum.
 */
export async function reinforceMemory(
  memoryNodeId: string,
  boostAmount: number = 0.2
): Promise<any> {
  try {
    const node = await prisma.memoryNode.findUnique({
      where: { id: memoryNodeId },
      select: { id: true, importance: true },
    });

    if (!node) {
      logger.warn("Memory node to reinforce not found", { memoryNodeId });
      return null;
    }

    const nextImportance = Math.min(10.0, (node.importance ?? 1.0) + boostAmount);
    
    const updated = await prisma.memoryNode.update({
      where: { id: memoryNodeId },
      data: {
        importance: nextImportance,
      },
    });

    logger.info("Memory node importance reinforced successfully", {
      memoryNodeId,
      oldImportance: node.importance,
      newImportance: nextImportance,
    });

    return updated;
  } catch (error) {
    logger.error("Failed to reinforce memory node", error);
    throw error;
  }
}

/**
 * Periodically decays all memory importance rates in the database or sweeps out extremely stale thoughts.
 * If current importance drops below threshold (e.g. 0.05) and memory is not persistent,
 * we can either delete or archive them.
 */
export async function archiveDecayedMemories(userId: string, threshold: number = 0.05): Promise<number> {
  try {
    const nodes = await prisma.memoryNode.findMany({
      where: { userId },
    });

    let count = 0;
    for (const node of nodes) {
      // Treat mapped type as MemoryNode
      const currentVal = calculateDecayedImportance(node as unknown as MemoryNode);
      if (currentVal < threshold) {
        // Delete or mark as archived (since schema does not have archive, delete or set importance to 0)
        // Let's delete the node if it's below the threshold, but keep it if it's a critical category (e.g. reflection/planning)
        if (node.taxonomy !== "planning" && node.taxonomy !== "insight") {
          await prisma.memoryNode.delete({
            where: { id: node.id },
          });
          count++;
        }
      }
    }
    
    if (count > 0) {
      logger.info(`Archived/cleaned up ${count} stale/decayed memories for user`, { userId });
    }
    return count;
  } catch (error) {
    logger.error("Failed to archive decayed memories", error);
    return 0;
  }
}
