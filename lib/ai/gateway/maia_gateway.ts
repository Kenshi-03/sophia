import OpenAI from "openai"
import { AIResponse, CompletionOptions } from "../types"

// Initialize OpenAI client pointing to MAIA Router
const getMaiaClient = () => {
  const apiKey = process.env.MAIA_API_KEY || ""
  
  return new OpenAI({
    baseURL: "https://api.maiarouter.ai/v1",
    apiKey: apiKey,
  })
}

/**
 * Generate completion using MAIA AI Gateway
 */
export async function generateGatewayResponse(
  prompt: string,
  options?: CompletionOptions
): Promise<AIResponse> {
  const startTime = Date.now()
  const apiKey = process.env.MAIA_API_KEY || ""
  
  if (!apiKey) {
    throw new Error("MAIA_API_KEY is not defined in the environment variables.")
  }

  // Determine model selection (default: maia/gemini-2.5-flash)
  const selectedModel = options?.model || "maia/gemini-2.5-flash"

  // Map AI Mode to temperature as requested:
  // Focus -> 0.2, Creative -> 0.9, Balanced -> 0.7
  let temperature = options?.temperature ?? 0.7
  if (options?.aiMode) {
    if (options.aiMode === "focus") {
      temperature = 0.2
    } else if (options.aiMode === "creative") {
      temperature = 0.9
    } else if (options.aiMode === "balanced") {
      temperature = 0.7
    }
  }

  try {
    const client = getMaiaClient()
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    if (options?.systemInstruction) {
      messages.push({
        role: "system",
        content: options.systemInstruction,
      })
    }

    messages.push({
      role: "user",
      content: prompt,
    })

    const response = await client.chat.completions.create({
      model: selectedModel,
      messages: messages,
      temperature: temperature,
      max_tokens: options?.maxOutputTokens,
    })

    const text = response.choices[0]?.message?.content || ""
    const latency = Date.now() - startTime

    return {
      text,
      provider: "maia",
      model: selectedModel,
      latency,
    }
  } catch (error: any) {
    console.error("MAIA Gateway Error:", error)
    throw new Error(
      error?.message || "MAIA Gateway failed to generate a response."
    )
  }
}
