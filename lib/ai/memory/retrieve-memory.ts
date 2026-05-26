import { getMemoryNodesByUser } from '../../db/queries/memory';
import { MemoryNode } from '@/types/memory';

export async function retrieveRelevantMemories(
  userId: string, 
  query: string,
  characterBudget: number = 8000 // Approximate context budget (~2000 tokens)
): Promise<MemoryNode[]> {
  const allNodes = await getMemoryNodesByUser(userId) as unknown as MemoryNode[];
  
  let processedNodes: MemoryNode[] = [];

  if (!query.trim()) {
    // Return all nodes sorted by recency
    processedNodes = allNodes.map(node => ({ ...node, relevanceScore: 100 }));
  } else {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (queryWords.length === 0) {
      processedNodes = allNodes.map(node => ({ ...node, relevanceScore: 100 }));
    } else {
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

      processedNodes = scoredNodes.filter((node) => node.relevanceScore > 0);
    }
  }

  // Sort by relevanceScore descending, then by createdAt descending
  processedNodes.sort((a, b) => {
    const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
    if (scoreDiff !== 0) return scoreDiff;
    
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  // Apply context budget cap
  const budgetedNodes: MemoryNode[] = [];
  let currentLength = 0;

  for (const node of processedNodes) {
    const nodeLength = node.content.length;
    if (currentLength + nodeLength > characterBudget) {
      break; // Cap reached, ignore remaining lower-priority nodes
    }
    budgetedNodes.push(node);
    currentLength += nodeLength;
  }

  return budgetedNodes;
}
