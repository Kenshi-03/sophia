import { generateGeminiResponse } from "./gemini"

export async function generateMaiaResponse(
  prompt: string,
  options?: { systemInstruction?: string; model?: string }
): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434"
  const modelName = options?.model || "maia-local" // Default local model

  try {
    const messages = []
    if (options?.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction })
    }
    messages.push({ role: "user", content: prompt })

    // Abort controller for local instance check timeout
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 5000) // 5s timeout

    const response = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    clearTimeout(id)

    if (!response.ok) {
      throw new Error(`Ollama local model offline or returned status ${response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ""
  } catch (error) {
    console.warn("Maia Local Model offline, falling back to Gemini:", error)
    // Fallback to Gemini when local model is unavailable
    return generateGeminiResponse(prompt, {
      ...options,
      model: "gemini-2.5-flash", // Safe fallback
    })
  }
}
