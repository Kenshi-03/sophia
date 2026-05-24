import { getMemoryNodesByUser } from '../../db/queries/memory';
import { MemoryNode } from '@/types/memory';

export async function retrieveRelevantMemories(userId: string, query: string): Promise<MemoryNode[]> {
  const allNodes = await getMemoryNodesByUser(userId) as unknown as MemoryNode[];
  
  if (!query.trim()) {
    return allNodes;
  }

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (queryWords.length === 0) {
    return allNodes;
  }

  const scoredNodes = allNodes.map((node) => {
    let matchCount = 0;
    const contentLower = node.content.toLowerCase();
    
    queryWords.forEach((word) => {
      if (contentLower.includes(word)) {
        matchCount += 1;
      }
    });

    const relevanceScore = Math.min(Math.round((matchCount / queryWords.length) * 100), 100);
    return { ...node, relevanceScore };
  });

  // Filter out completely irrelevant nodes and sort by score descending
  return scoredNodes
    .filter((node) => node.relevanceScore > 0)
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}
