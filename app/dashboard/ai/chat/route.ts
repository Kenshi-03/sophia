import { generateGatewayResponse } from "@/lib/ai/gateway/maia_gateway"
import { getCurrentUser } from "@/lib/auth/session"
import { getSettings } from "@/lib/settings/settings"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { query, model, aiMode } = await req.json()

    const settings = await getSettings(user.id)
    const { decrypt } = await import("@/lib/security/encryption")
    const customApiKey = settings.aiApiKey ? decrypt(settings.aiApiKey) : null

    const gatewayResponse = await generateGatewayResponse(query, {
      model: model || settings.aiModel,
      aiMode: aiMode || (settings.aiMode as any),
      customApiKey,
    })

    return NextResponse.json({
      response: gatewayResponse.text,
      provider: gatewayResponse.provider,
      model: gatewayResponse.model,
      latency: gatewayResponse.latency,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: "AI Error",
      },
      {
        status: 500,
      }
    )
  }
}