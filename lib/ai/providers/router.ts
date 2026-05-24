import { generateGeminiResponse } from "./gemini"
import { generateGroqResponse } from "./groq"
import { generateMaiaResponse } from "./maia"

export async function generateRouterResponse(
  prompt: string,
  options?: { systemInstruction?: string; model?: string; provider?: string }
): Promise<string> {
  const provider = (options?.provider || "").toLowerCase()
  const model = options?.model

  if (provider === "groq") {
    return generateGroqResponse(prompt, { systemInstruction: options?.systemInstruction, model })
  }

  if (provider === "maia") {
    return generateMaiaResponse(prompt, { systemInstruction: options?.systemInstruction, model })
  }

  // Default is Gemini
  return generateGeminiResponse(prompt, { systemInstruction: options?.systemInstruction, model })
}
