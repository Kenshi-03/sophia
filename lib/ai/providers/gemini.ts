import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { CompletionOptions } from "./types"

export async function generateGeminiResponse(
  prompt: string,
  options?: CompletionOptions
): Promise<string> {
  try {
    const modelName = options?.model || "gemini-2.5-flash"
    const result = await generateText({
      model: google(modelName),
      prompt: prompt,
      system: options?.systemInstruction,
      temperature: options?.temperature,
      maxOutputTokens: options?.maxOutputTokens,
    })
    return result.text
  } catch (error) {
    console.error("Gemini Provider Error:", error)
    throw error
  }
}
