import { CompletionOptions } from "./types"

export async function generateGroqResponse(
  prompt: string,
  options?: CompletionOptions
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || ""
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not defined")
  }

  const modelName = options?.model || "llama-3.3-70b-versatile"
  const systemPrompt = options?.systemInstruction

  try {
    const messages = []
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt })
    }
    messages.push({ role: "user", content: prompt })

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
      throw new Error(`Groq API returned status ${response.status}: ${JSON.stringify(errData)}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ""
  } catch (error) {
    console.error("Groq Provider Error:", error)
    throw error
  }
}
