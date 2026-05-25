export interface ModelConfig {
  id: string
  label: string
  category: "fast" | "reasoning" | "lightweight"
}

export const AI_MODELS = {
  FAST: "maia/gemini-2.5-flash",
  REASONING: "maia/gemini-2.5-pro",
  LIGHTWEIGHT: "maia/llama-3.1-8b",
} as const

export const AVAILABLE_MODELS: ModelConfig[] = [
  { id: AI_MODELS.FAST, label: "Gemini 2.5 Flash", category: "fast" },
  { id: AI_MODELS.REASONING, label: "Gemini 2.5 Pro", category: "reasoning" },
  { id: AI_MODELS.LIGHTWEIGHT, label: "Llama 3.1 8B", category: "lightweight" },
]
