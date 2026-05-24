import { getMemoryNodesByUser } from '../../db/queries/memory';

export async function retrieveRelevantMemories(userId: string, query: string) {
  const allNodes = await getMemoryNodesByUser(userId);
  // Basic substring matching as placeholder for semantic vectors
  return allNodes.filter(node => 
    (node as any).content.toLowerCase().includes(query.toLowerCase())
  );
}
