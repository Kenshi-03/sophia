interface ScoredMemory {
  node: any;
  score: number;
}

export function rankMemories(memories: any[], query: string): any[] {
  const scored: ScoredMemory[] = memories.map(node => {
    let score = 0;
    // Word overlap count
    const words = query.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (node.content.toLowerCase().includes(word)) {
        score += 1;
      }
    });
    return { node, score };
  });

  // Sort by score descending
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.node);
}
