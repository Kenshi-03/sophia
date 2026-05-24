export function formatDate(date: Date | string, formatStr: string = 'PP'): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(parsedDate.getTime())) return '';

  if (formatStr === 'PP') {
    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  return parsedDate.toLocaleDateString();
}

export function formatTime(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(parsedDate.getTime())) return '';

  return parsedDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
