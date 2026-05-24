import { create } from 'zustand';

interface DashboardState {
  systemLoad: number;
  recentMemoriesCount: number;
  activeNotesCount: number;
  completedTasksTodayCount: number;
  setSystemLoad: (load: number) => void;
  incrementMemories: () => void;
  incrementNotes: () => void;
  setCompletedTasksCount: (count: number) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  systemLoad: 12,
  recentMemoriesCount: 142,
  activeNotesCount: 28,
  completedTasksTodayCount: 4,
  setSystemLoad: (systemLoad) => set({ systemLoad }),
  incrementMemories: () => set((state) => ({ recentMemoriesCount: state.recentMemoriesCount + 1 })),
  incrementNotes: () => set((state) => ({ activeNotesCount: state.activeNotesCount + 1 })),
  setCompletedTasksCount: (completedTasksTodayCount) => set({ completedTasksTodayCount }),
}));
export default useDashboardStore;
