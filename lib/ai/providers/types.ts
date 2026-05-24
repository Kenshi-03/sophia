export type AIProvider = "gemini" | "groq" | "ollama"

export interface CompletionOptions {
  systemInstruction?: string
  temperature?: number
  maxOutputTokens?: number
  model?: string
}

export interface ProviderResponse {
  text: string
  provider: AIProvider
  model: string
  latency?: number
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}
