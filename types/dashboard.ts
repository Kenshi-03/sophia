import { MemoryNode } from "./memory"
import { CalendarEvent } from "./calendar"

export interface DashboardTask {
  id: string
  title: string
  content?: string | null
  completed: boolean
  dueDate?: Date | string | null
  userId: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CognitiveAgent {
  name: string
  role: string
  status: "Active" | "Standby"
}

export interface DashboardData {
  user: {
    name: string
    email: string
  }
  tasks: DashboardTask[]
  events: CalendarEvent[]
  memories: MemoryNode[]
  agents: CognitiveAgent[]
  cognitiveLoad: number
}
