import { google } from "@ai-sdk/google"
import { generateText } from "ai"

export async function generateGeminiResponse(
  prompt: string,
  options?: { systemInstruction?: string; model?: string }
): Promise<string> {
  try {
    const modelName = options?.model || "gemini-2.5-flash"
    const systemPrompt = options?.systemInstruction

    const result = await generateText({
      model: google(modelName),
      prompt: prompt,
      system: systemPrompt,
    })

    return result.text
  } catch (error) {
    console.error("Gemini Provider Error:", error)
    throw error
  }
}
