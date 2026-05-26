import OpenAI from "openai"
import { AIResponse, CompletionOptions } from "../types"
import { AI_MODELS, AVAILABLE_MODELS } from "../config/models"
import { trackAiUsage } from "../cost-tracker"
import { logger } from "../../logger"

// Initialize OpenAI client pointing to MAIA Router
const getMaiaClient = (customApiKey?: string | null) => {
  const apiKey = customApiKey || process.env.MAIA_API_KEY || ""
  
  return new OpenAI({
    baseURL: "https://api.maiarouter.ai/v1",
    apiKey: apiKey,
  })
}

interface CustomCompletionOptions extends CompletionOptions {
  customApiKey?: string | null;
  userId?: string;
}

type NodeError = Error & {
  code?: string;
};

/**
 * Generate completion using MAIA AI Gateway
 */
export async function generateGatewayResponse(
  prompt: string,
  options?: CustomCompletionOptions
): Promise<AIResponse> {
  const startTime = Date.now()
  const apiKey = options?.customApiKey || process.env.MAIA_API_KEY || ""
  
  // 1. AI Health Validation: Validate API Key presence
  if (!apiKey) {
    throw new Error("Kredensial MAIA_API_KEY tidak dikonfigurasi di server.")
  }

  // 2. AI Health Validation: Validate request payload
  if (!prompt || prompt.trim() === "") {
    throw new Error("Payload permintaan tidak valid: Prompt tidak boleh kosong.")
  }

  // 3. Model Validation & Safe Fallback System
  const requestedModel = options?.model || AI_MODELS.FAST
  const isValidModel = AVAILABLE_MODELS.some(m => m.id === requestedModel)
  
  const selectedModel = isValidModel ? requestedModel : AI_MODELS.FAST
  
  if (!isValidModel) {
    logger.warn(
      `MAIA Gateway: Model identifier "${requestedModel}" tidak valid. Mengalihkan otomatis ke fallback: "${AI_MODELS.FAST}".`
    )
  }

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
    const client = getMaiaClient(options?.customApiKey)
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

    const promptTokens = response.usage?.prompt_tokens ?? 0
    const completionTokens = response.usage?.completion_tokens ?? 0

    if (options?.userId && (promptTokens > 0 || completionTokens > 0)) {
      trackAiUsage(options.userId, selectedModel, {
        promptTokens,
        completionTokens,
      }).catch((err) => {
        logger.error("Failed to track AI usage during response generation", err)
      })
    }

    return {
      text,
      provider: "maia",
      model: selectedModel,
      latency,
    }
  } catch (error: unknown) {
    const typedError = error as NodeError
    logger.error("MAIA Gateway Error Details", typedError)
    
    // 4. Improve Error Handling: Clean raw LiteLLM or provider internal errors
    const rawMessage = typedError.message || ""
    let cleanMessage = "Sistem gagal memproses instruksi AI. Mohon coba lagi beberapa saat lagi."
    
    if (
      rawMessage.includes("litellm") || 
      rawMessage.includes("BadRequestError") || 
      rawMessage.includes("Model Group") ||
      rawMessage.includes("You passed in model")
    ) {
      cleanMessage = "Terjadi kesalahan konfigurasi model pada AI Gateway. Sistem dialihkan kembali menggunakan model default."
    } else if (rawMessage.includes("API key") || rawMessage.includes("Unauthorized")) {
      cleanMessage = "Akses ditolak oleh AI Gateway. Harap periksa kevalidan MAIA API Key Anda."
    } else if (typedError.code === "ENOTFOUND" || rawMessage.includes("fetch failed")) {
      cleanMessage = "Gagal menghubungi AI Gateway. Pastikan server memiliki koneksi internet yang stabil."
    }

    throw new Error(cleanMessage)
  }
}
