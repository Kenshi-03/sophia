import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { CompletionOptions, ProviderResponse } from "./types"

export async function generateGeminiResponse(
  prompt: string,
  options?: CompletionOptions
): Promise<ProviderResponse> {
  const modelName = options?.model || "gemini-2.5-flash"
  const startTime = Date.now()

  try {
    const result = await generateText({
      model: google(modelName),
      prompt: prompt,
      system: options?.systemInstruction,
      temperature: options?.temperature,
      maxOutputTokens: options?.maxOutputTokens,
    })

    const latency = Date.now() - startTime

    return {
      text: result.text,
      provider: "gemini",
      model: modelName,
      latency,
    }
  } catch (error) {
    console.error("Gemini Provider Error:", error)
    throw error
  }
}
