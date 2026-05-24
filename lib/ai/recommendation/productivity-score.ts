export function calculateDailyProductivityScore(
  completedTasks: number,
  totalTasks: number,
  focusHours: number
): number {
  if (totalTasks === 0) return focusHours > 0 ? 80 : 0;
  
  const taskRatio = completedTasks / totalTasks;
  const score = (taskRatio * 70) + (Math.min(focusHours, 4) * 7.5);
  return Math.min(100, Math.round(score));
}
