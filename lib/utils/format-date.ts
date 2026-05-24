import { format, parseISO } from 'date-fns';

export function formatDate(date: Date | string, formatStr: string = 'PP'): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, formatStr);
}

export function formatTime(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, 'p');
}
