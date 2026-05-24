import { create } from 'zustand';

export interface MemoryNode {
  id: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
}

interface MemoryState {
  memories: MemoryNode[];
  searchQuery: string;
  setMemories: (memories: MemoryNode[]) => void;
  addMemory: (memory: MemoryNode) => void;
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
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
export default useMemoryStore;
