export type AIProvider = "gemini" | "groq" | "ollama"

export interface CompletionOptions {
  systemInstruction?: string
  temperature?: number
  maxOutputTokens?: number
  model?: string
}

export interface CompletionResponse {
  text: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}
