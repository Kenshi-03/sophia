import { NextResponse } from "next/server"
import OpenAI from "openai"

export async function GET() {
  const apiKey = process.env.MAIA_API_KEY || ""
  
  if (!apiKey) {
    return NextResponse.json({
      status: "Missing API Key",
      healthy: false,
      latency: 0,
      error: "MAIA_API_KEY is not defined in backend environment.",
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
      model: "maia/gemini-2.5-flash",
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
