import { MemoryNode } from '@/types/memory';

export function buildMemoryContext(memories: MemoryNode[]): string {
  if (memories.length === 0) return 'No relevant memories retrieved.';
  
  return memories
    .map((m, i) => `Memory [${i + 1}] (${m.category}): "${m.content}"`)
    .join('\n');
}
