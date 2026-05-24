import { create } from 'zustand';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
}

interface CalendarState {
  events: CalendarEvent[];
  isSyncing: boolean;
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  setSyncing: (isSyncing: boolean) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [
    { id: '1', title: 'Morning Lecture Prep', startTime: '09:00 AM', endTime: '10:30 AM' },
    { id: '2', title: 'SOPHIA Dev Sprint', startTime: '02:00 PM', endTime: '04:00 PM' },
  ],
  isSyncing: false,
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  setSyncing: (isSyncing) => set({ isSyncing }),
}));
export default useCalendarStore;
