import { generateGatewayResponse } from "@/lib/ai/gateway/maia_gateway"

export async function POST(req: Request) {
  try {
    const { query, model, aiMode } = await req.json()

    const gatewayResponse = await generateGatewayResponse(query, {
      model,
      aiMode,
    })

    return Response.json({
      response: gatewayResponse.text,
      provider: gatewayResponse.provider,
      model: gatewayResponse.model,
      latency: gatewayResponse.latency,
    })
  } catch (error) {
    console.error(error)

    return Response.json(
      {
        error: "AI Error",
      },
      {
        status: 500,
      }
    )
  }
}