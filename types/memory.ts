export interface MemoryNode {
  id: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date | string;
}

export interface MemorySearchResult {
  node: MemoryNode;
  relevanceScore: number;
}
