import { generateRouterResponse } from "@/lib/ai/providers/router"

export async function POST(req: Request) {
  try {
    const { query } = await req.json()

    const responseText = await generateRouterResponse(query, {
      provider: "gemini",
      model: "gemini-2.5-flash",
    })

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