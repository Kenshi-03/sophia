import { ChatMessage } from './ai';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface ChatResponse {
  query: string;
  agentType: string;
  response: string;
}

export interface RecommendationResponse {
  status: string;
  suggestion: string;
}
