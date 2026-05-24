import { CompletionOptions, ProviderResponse } from "./types"

export async function generateOllamaResponse(
  prompt: string,
  options?: CompletionOptions
): Promise<ProviderResponse> {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434"
  const modelName = options?.model || "maia-local"
  const startTime = Date.now()

  try {
    const messages = []
    if (options?.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction })
    }
    messages.push({ role: "user", content: prompt })

    const response = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxOutputTokens,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ""
    const latency = Date.now() - startTime

    return {
      text,
      provider: "ollama",
      model: modelName,
      latency,
    }
  } catch (error) {
    console.error("Ollama Provider Error:", error)
    throw error
  }
}
