export interface AIResponse {
  text: string;
  provider: string;
  model: string;
  latency?: number;
}

export type AIMode = 'focus' | 'creative' | 'balanced';

export interface CompletionOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
  aiMode?: AIMode;
}
