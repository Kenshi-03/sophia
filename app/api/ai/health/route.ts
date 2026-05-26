import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { getSettings } from "@/lib/settings/settings"
import OpenAI from "openai"
import { AI_MODELS } from "@/lib/ai/config/models"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const settings = await getSettings(user.id)
  const { decrypt } = await import("@/lib/security/encryption")
  const decryptedApiKey = settings.aiApiKey ? decrypt(settings.aiApiKey) : null
  const apiKey = decryptedApiKey || process.env.MAIA_API_KEY || ""
  
  if (!apiKey) {
    return NextResponse.json({
      status: "Missing API Key",
      healthy: false,
      latency: 0,
      error: "MAIA_API_KEY is not defined in backend environment or settings.",
    })
  }

  const startTime = Date.now()

  try {
    const openai = new OpenAI({
      baseURL: "https://api.maiarouter.ai/v1",
      apiKey: apiKey,
    })

    // Uji koneksi ringan menggunakan model awal terkecil/tercepat
    await openai.chat.completions.create({
      model: AI_MODELS.FAST,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    })

    const latency = Date.now() - startTime

    return NextResponse.json({
      status: "Healthy",
      healthy: true,
      latency,
    })
  } catch (error: any) {
    console.error("Gateway Health Check failed:", error)
    return NextResponse.json({
      status: "Unhealthy",
      healthy: false,
      latency: Date.now() - startTime,
      error: error?.message || "Connection failed.",
    })
  }
}
