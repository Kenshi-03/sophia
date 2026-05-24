import { getMemoryNodesByUser } from '../../db/queries/memory';
import { MemoryNode } from '@/types/memory';

export async function retrieveRelevantMemories(userId: string, query: string): Promise<MemoryNode[]> {
  const allNodes = await getMemoryNodesByUser(userId) as unknown as MemoryNode[];
  // Basic substring matching as placeholder for semantic vectors
  return allNodes.filter((node: MemoryNode) => 
    node.content.toLowerCase().includes(query.toLowerCase())
  );
}
