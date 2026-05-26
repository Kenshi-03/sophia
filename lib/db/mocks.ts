import { DashboardTask, CognitiveAgent } from "@/types/dashboard"
import { CalendarEvent } from "@/types/calendar"
import { MemoryNode } from "@/types/memory"

export const mockUser = {
  name: "SOPHIA Dev User",
  email: "user@sophia.local",
}

export const mockTasks: DashboardTask[] = [
  {
    id: "mock-task-1",
    title: "Review SOPHIA System Specifications",
    content: "Analyze the system prompt requirements and cognitive layout designs.",
    completed: true,
    dueDate: null,
    userId: "mock-user-id",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "mock-task-2",
    title: "Deep Work: Core AI Router Module",
    content: "Integrate the query routing logic with Google Generative AI agent endpoints.",
    completed: false,
    dueDate: null,
    userId: "mock-user-id",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

export const mockEvents: CalendarEvent[] = [
  {
    id: "mock-event-1",
    title: "Morning Lecture Prep",
    description: "Prepare materials for higher cognitive computing.",
    startTime: new Date(new Date().setHours(9, 0, 0, 0)),
    endTime: new Date(new Date().setHours(10, 30, 0, 0)),
    location: "Room 302",
    isFocusMode: false,
    cognitiveLoad: 35,
    tags: ["prep", "cognitive"],
  },
  {
    id: "mock-event-2",
    title: "SOPHIA Dev User Sprint",
    description: "Implement backend API route definitions and next-auth credentials.",
    startTime: new Date(new Date().setHours(14, 0, 0, 0)),
    endTime: new Date(new Date().setHours(16, 0, 0, 0)),
    location: "Localhost",
    isFocusMode: true,
    cognitiveLoad: 80,
    tags: ["coding", "nextjs", "prisma"],
  },
  {
    id: "mock-event-3",
    title: "Deep Work: Vector Similarity Retrieval",
    description: "Build semantic search indices for note items using local embeddings.",
    startTime: new Date(new Date().setHours(11, 0, 0, 0)),
    endTime: new Date(new Date().setHours(12, 30, 0, 0)),
    location: "Localhost",
    isFocusMode: true,
    cognitiveLoad: 60,
    tags: ["vector-search", "embeddings"],
  },
  {
    id: "mock-event-4",
    title: "Sync Session with Sophia Adviser",
    description: "Weekly sync meeting to discuss cognitive load metrics and advisor recommendations.",
    startTime: new Date(new Date().setHours(16, 30, 0, 0)),
    endTime: new Date(new Date().setHours(17, 30, 0, 0)),
    location: "Room 302",
    isFocusMode: false,
    cognitiveLoad: 40,
    tags: ["sync", "planning"],
  },
]

export const mockMemories: MemoryNode[] = [
  {
    id: "mock-mem-1",
    content: "Parenthesis in NextJS routes e.g. (dashboard) acts as route grouping. Omit from actual pathname.",
    category: "Research",
    tags: ["web-dev", "nextjs", "routing"],
    createdAt: new Date(),
  },
  {
    id: "mock-mem-2",
    content: "Academic lecture scheduled in Room 302 focuses on higher cognitive computing logs.",
    category: "Academics",
    tags: ["calendar", "schedule", "academics"],
    createdAt: new Date(),
  },
]

export const mockAgents: CognitiveAgent[] = [
  {
    name: "Analyst Prime",
    role: "Schedule & load analysis",
    status: "Active",
  },
  {
    name: "Sentinel v8",
    role: "Permanent memory indexing",
    status: "Active",
  },
  {
    name: "Creative Core",
    role: "Dynamic focus advisor",
    status: "Standby",
  },
]
