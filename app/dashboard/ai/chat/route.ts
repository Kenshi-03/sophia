import { generateGatewayResponse } from "@/lib/ai/gateway/maia"

export async function POST(req: Request) {
  try {
    const { query } = await req.json()

    const responseText = await generateGatewayResponse(query)

    return Response.json({
      response: responseText,
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