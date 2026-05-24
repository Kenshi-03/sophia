export type AgentType = 'schedule' | 'memory' | 'productivity' | 'general';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
}

export interface AgentConfig {
  name: string;
  description: string;
  type: AgentType;
  isActive: boolean;
}
