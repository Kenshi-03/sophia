import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { getSettings, updateSettings } from "@/lib/settings/settings"
import { encrypt } from "@/lib/security/encryption"

/**
 * GET /api/settings
 * Mengambil pengaturan pengguna yang sedang masuk.
 */
export async function GET() {
  try {
    const dbUser = await getCurrentUser()
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await getSettings(dbUser.id)
    return NextResponse.json({
      ...settings,
      aiApiKey: settings.aiApiKey ? "••••••••" : null,
      userName: dbUser.name || "Sophia Dev"
    })
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
    const dbUser = await getCurrentUser()
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
    if (typeof body.cognitiveThreshold === "number") {
      updatedFields.cognitiveThreshold = body.cognitiveThreshold
    }
    if (typeof body.themeAccent === "string") {
      updatedFields.themeAccent = body.themeAccent
    }
    if (typeof body.autoSyncCalendar === "boolean") {
      updatedFields.autoSyncCalendar = body.autoSyncCalendar
    }
    if (typeof body.autoDndFocus === "boolean") {
      updatedFields.autoDndFocus = body.autoDndFocus
    }
    
    if (typeof body.aiApiKey === "string") {
      const trimmedKey = body.aiApiKey.trim();
      if (trimmedKey === "") {
        updatedFields.aiApiKey = null;
      } else if (trimmedKey !== "••••••••") {
        updatedFields.aiApiKey = encrypt(trimmedKey);
      }
    }

    if (typeof body.isOnboarded === "boolean") {
      updatedFields.isOnboarded = body.isOnboarded
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

    // Update userName in User table if provided
    if (typeof body.userName === "string") {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { name: body.userName },
      })
    }

    const settings = await updateSettings(dbUser.id, updatedFields)
    
    // Return unified object including the updated name
    const updatedUser = await prisma.user.findUnique({
      where: { id: dbUser.id },
      select: { name: true }
    })

    return NextResponse.json({
      ...settings,
      aiApiKey: settings.aiApiKey ? "••••••••" : null,
      userName: updatedUser?.name || "Sophia Dev"
    })
  } catch (error: any) {
    console.error("POST /api/settings error:", error)
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan." },
      { status: 500 }
    )
  }
}
