export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  location?: string | null;
  googleEventId?: string | null;
  calendarId?: string;
  color?: string;
  categoryName?: string;
  categoryType?: string;
  isFocusMode?: boolean;
  cognitiveLoad?: number;
  tags?: string[];
}

export interface FocusSlot {
  id: string;
  time: string;
  duration: string;
}
