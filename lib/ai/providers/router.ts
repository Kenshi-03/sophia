import { generateGeminiResponse } from "./gemini"
import { generateGroqResponse } from "./groq"
import { generateMaiaResponse } from "./maia"
import { generateOllamaResponse } from "./ollama"
import { CompletionOptions, AIProvider } from "./types"

export async function generateRouterResponse(
  prompt: string,
  options?: CompletionOptions & { provider?: AIProvider }
): Promise<string> {
  const provider = (options?.provider || "groq").toLowerCase() as AIProvider

  if (provider === "groq") {
    return generateGroqResponse(prompt, options)
  }

  if (provider === "maia") {
    return generateMaiaResponse(prompt, options)
  }

  if (provider === "ollama") {
    return generateOllamaResponse(prompt, options)
  }

  // Fallback to Gemini
  return generateGeminiResponse(prompt, options)
}
