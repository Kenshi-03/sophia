export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  location?: string | null;
  isFocusMode?: boolean;
  cognitiveLoad?: number;
  tags?: string[];
}

export interface FocusSlot {
  id: string;
  time: string;
  duration: string;
}
