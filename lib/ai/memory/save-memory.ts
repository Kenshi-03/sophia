import { createMemoryNode } from '../../db/queries/memory';

export async function savePermanentMemory(userId: string, content: string, category: string, tags?: string[]) {
  // Call DB queries to insert the memory node
  return await createMemoryNode({ userId, content, category, tags });
}
