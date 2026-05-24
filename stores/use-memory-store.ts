import { create } from 'zustand';
import { MemoryNode as TypeMemoryNode } from '@/types/memory';

export type MemoryNode = TypeMemoryNode;

interface MemoryState {
  memories: MemoryNode[];
  searchQuery: string;
  setMemories: (memories: MemoryNode[]) => void;
  addMemory: (memory: MemoryNode) => void;
  deleteMemory: (id: string) => void;
  updateMemory: (memory: MemoryNode) => void;
  setSearchQuery: (query: string) => void;
}

export const useMemoryStore = create<MemoryState>((set) => ({
  memories: [
    {
      id: '1',
      content: 'Parenthesis in NextJS routes e.g. (dashboard) acts as route grouping. Omit from actual pathname.',
      category: 'Research',
      tags: ['web-dev', 'nextjs', 'routing'],
      createdAt: 'May 24, 2026',
    },
    {
      id: '2',
      content: 'Academic lecture scheduled in Room 302 focuses on higher cognitive computing logs.',
      category: 'Academics',
      tags: ['calendar', 'schedule', 'academics'],
      createdAt: 'May 23, 2026',
    },
  ],
  searchQuery: '',
  setMemories: (memories) => set({ memories }),
  addMemory: (memory) => set((state) => ({ memories: [memory, ...state.memories] })),
  deleteMemory: (id) => set((state) => ({ memories: state.memories.filter((m) => m.id !== id) })),
  updateMemory: (memory) => set((state) => ({ memories: state.memories.map((m) => (m.id === memory.id ? memory : m)) })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
export default useMemoryStore;
