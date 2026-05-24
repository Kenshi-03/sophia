import { calendar_v3 } from 'googleapis';

export interface FormattedEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
}

export function formatGoogleEvent(event: calendar_v3.Schema$Event): FormattedEvent {
  return {
    id: event.id || '',
    title: event.summary || 'Untitled Event',
    description: event.description || '',
    startTime: event.start?.dateTime ? new Date(event.start.dateTime) : new Date(event.start?.date || ''),
    endTime: event.end?.dateTime ? new Date(event.end.dateTime) : new Date(event.end?.date || ''),
    location: event.location || undefined,
  };
}
