import { generateGeminiResponse } from "../providers/gemini"
import { generateGroqResponse } from "../providers/groq"
import { generateOllamaResponse } from "../providers/ollama"
import { CompletionOptions, AIProvider } from "../providers/types"

export async function generateGatewayResponse(
  prompt: string,
  options?: CompletionOptions & { provider?: AIProvider }
): Promise<string> {
  const provider = (options?.provider || "groq").toLowerCase() as AIProvider

  try {
    if (provider === "groq") {
      return await generateGroqResponse(prompt, options)
    }

    if (provider === "ollama") {
      return await generateOllamaResponse(prompt, options)
    }

    if (provider === "gemini") {
      return await generateGeminiResponse(prompt, options)
    }

    throw new Error(`Unsupported AI provider: ${provider}`)
  } catch (error) {
    console.warn(`MAIA Gateway: Provider ${provider} failed. Attempting fallback to gemini...`, error)
    
    // Avoid infinite loop if gemini itself failed
    if (provider !== "gemini") {
      try {
        return await generateGeminiResponse(prompt, options)
      } catch (fallbackError) {
        console.error("MAIA Gateway: Fallback to gemini failed:", fallbackError)
        throw fallbackError
      }
    }
    throw error
  }
}
