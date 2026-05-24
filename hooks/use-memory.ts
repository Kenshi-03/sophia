'use client'

import { useEffect } from 'react';
import useMemoryStore, { MemoryNode } from '@/stores/use-memory-store';
import useDashboardStore from '@/stores/use-dashboard-store';

export function useMemory() {
  const { memories, searchQuery, setMemories, addMemory, setSearchQuery } = useMemoryStore();
  const { incrementMemories } = useDashboardStore();

  const fetchRecentMemories = async () => {
    try {
      const res = await fetch('/api/memory/recent');
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error('Failed to load recent memories:', err);
    }
  };

  const searchMemories = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      await fetchRecentMemories();
      return;
    }
    
    try {
      const res = await fetch(`/api/memory/search?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error('Failed semantic memory search:', err);
    }
  };

  const saveMemory = async (content: string, category: string, tags?: string[]) => {
    try {
      const res = await fetch('/api/memory/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, category, tags }),
      });

      if (res.ok) {
        const node: MemoryNode = await res.json();
        addMemory(node);
        incrementMemories();
        return { success: true, node };
      }
    } catch (err) {
      console.error('Failed to insert memory fact:', err);
    }
    return { success: false };
  };

  useEffect(() => {
    fetchRecentMemories();
  }, []);

  return {
    memories,
    searchQuery,
    searchMemories,
    saveMemory,
    refreshMemories: fetchRecentMemories,
  };
}
export default useMemory;
