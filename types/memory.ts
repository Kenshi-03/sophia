export interface MemoryNode {
  id: string;
  content: string;
  category: string;
  tags: string[];
  importance?: number;
  decayRate?: number;
  sourceType?: string | null;
  visibility?: string;
  taxonomy?: string;
  contentHash?: string | null;
  reliability?: number;
  memoryType?: string;
  userId?: string;
  createdAt: Date | string;
  relevanceScore?: number;
}

export interface MemorySearchResult {
  node: MemoryNode;
  relevanceScore: number;
}

