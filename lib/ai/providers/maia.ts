import { CompletionOptions } from "./types"

export async function generateMaiaResponse(
  prompt: string,
  options?: CompletionOptions
): Promise<string> {
  const apiKey = process.env.MAIA_API_KEY || ""
  if (!apiKey) {
    throw new Error("MAIA_API_KEY is not defined")
  }

  const apiUrl = process.env.MAIA_API_URL || "https://api.maia.ai/v1"
  const modelName = options?.model || "maia-latest"
  const systemPrompt = options?.systemInstruction

  try {
    const messages = []
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt })
    }
    messages.push({ role: "user", content: prompt })

    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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
      const errData = await response.json().catch(() => ({}))
      throw new Error(`Maia API returned status ${response.status}: ${JSON.stringify(errData)}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ""
  } catch (error) {
    console.error("Maia Provider Error:", error)
    throw error
  }
}
