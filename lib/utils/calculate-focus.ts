/**
 * Calculates a cognitive focus / productivity load score.
 * Factors in calendar event duration, meeting density, and breaks.
 */
export function calculateFocusScore(eventsCount: number, totalMinutes: number): number {
  if (totalMinutes === 0) return 100;
  
  // Cognitive load calculation
  const averageEventDuration = totalMinutes / eventsCount;
  const loadFactor = (eventsCount * 10) + (totalMinutes * 0.1);
  
  // Focus score starts at 100 and declines with heavy load
  const score = Math.max(0, Math.min(100, Math.round(100 - loadFactor)));
  return score;
}
