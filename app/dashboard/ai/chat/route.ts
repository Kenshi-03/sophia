import { google } from "@ai-sdk/google"
import { generateText } from "ai"

export async function POST(req: Request) {
  try {
    const { query } = await req.json()

    const result = await generateText({
      model: google("gemini-2.5-flash"),

      prompt: query,
    })

    return Response.json({
      response: result.text,
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