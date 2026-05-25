import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { getSettings, updateSettings } from "@/lib/settings/settings"

/**
 * GET /api/settings
 * Mengambil pengaturan pengguna yang sedang masuk.
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const settings = await getSettings(dbUser.id)
    return NextResponse.json(settings)
  } catch (error: any) {
    console.error("GET /api/settings error:", error)
    return NextResponse.json(
      { error: "Gagal memuat pengaturan." },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings
 * Memperbarui pengaturan pengguna.
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    
    // Validasi payload
    const updatedFields: any = {}
    
    if (typeof body.theme === "string") updatedFields.theme = body.theme
    if (typeof body.aiModel === "string") updatedFields.aiModel = body.aiModel
    if (typeof body.aiMode === "string") updatedFields.aiMode = body.aiMode
    if (typeof body.productivityIntensity === "string") {
      updatedFields.productivityIntensity = body.productivityIntensity
    }
    if (typeof body.localAIEnabled === "boolean") {
      updatedFields.localAIEnabled = body.localAIEnabled
    }
    
    if (body.memoryDepth !== undefined) {
      const depth = parseInt(body.memoryDepth, 10)
      if (!isNaN(depth) && depth >= 1 && depth <= 100) {
        updatedFields.memoryDepth = depth
      } else {
        return NextResponse.json(
          { error: "Parameter memoryDepth harus antara 1 dan 100." },
          { status: 400 }
        )
      }
    }

    const settings = await updateSettings(dbUser.id, updatedFields)
    return NextResponse.json(settings)
  } catch (error: any) {
    console.error("POST /api/settings error:", error)
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan." },
      { status: 500 }
    )
  }
}
