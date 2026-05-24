import { generateGeminiResponse } from "../providers/gemini"
import { generateGroqResponse } from "../providers/groq"
import { generateOllamaResponse } from "../providers/ollama"
import { CompletionOptions, AIProvider, ProviderResponse } from "../providers/types"

const PROVIDER_PRIORITY: AIProvider[] = ["groq", "gemini", "ollama"]

export async function generateGatewayResponse(
  prompt: string,
  options?: CompletionOptions & { provider?: AIProvider }
): Promise<ProviderResponse> {
  const requestedProvider = options?.provider?.toLowerCase() as AIProvider | undefined

  // Arrange target providers queue: requested provider first, then the rest by priority
  const providersToTry: AIProvider[] = requestedProvider && PROVIDER_PRIORITY.includes(requestedProvider)
    ? [requestedProvider, ...PROVIDER_PRIORITY.filter(p => p !== requestedProvider)]
    : PROVIDER_PRIORITY

  let lastError: any = null

  for (const provider of providersToTry) {
    try {
      if (provider === "groq") {
        return await generateGroqResponse(prompt, options)
      }
      if (provider === "gemini") {
        return await generateGeminiResponse(prompt, options)
      }
      if (provider === "ollama") {
        return await generateOllamaResponse(prompt, options)
      }
    } catch (error) {
      console.warn(`MAIA Gateway: Provider ${provider} failed. Trying next fallback...`, error)
      lastError = error
    }
  }

  throw lastError || new Error("All AI providers failed.")
}
