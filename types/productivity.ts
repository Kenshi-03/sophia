export interface ProductivityMetrics {
  score: number;
  cognitiveLoad: number;
  completedTasksCount: number;
  totalTasksCount: number;
}

export interface TaskItem {
  id: string;
  title: string;
  content?: string;
  completed: boolean;
  dueDate?: Date | string;
  createdAt: Date | string;
}
