import { prisma } from "@/lib/db/prisma"
import { UserSettings } from "@prisma/client"

/**
 * Mendapatkan pengaturan pengguna berdasarkan userId.
 * Jika pengaturan belum ada, buat pengaturan default secara otomatis.
 */
export async function getSettings(userId: string): Promise<UserSettings> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  })

  if (settings) {
    return settings
  }

  // Jika tidak ditemukan, buat pengaturan bawaan baru
  try {
    return await prisma.userSettings.create({
      data: {
        userId,
        theme: "dark",
        aiModel: "maia/gemini-2.5-flash",
        aiMode: "balanced",
        memoryDepth: 10,
        productivityIntensity: "balanced",
        localAIEnabled: false,
        cognitiveThreshold: 75,
        themeAccent: "lavender",
        autoSyncCalendar: true,
        autoDndFocus: true,
        isOnboarded: false,
        aiApiKey: null,
      },
    })
  } catch (error) {
    console.error("Gagal membuat UserSettings default, melakukan retry dengan upsert:", error)
    // Penanganan race condition
    return await prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        theme: "dark",
        aiModel: "maia/gemini-2.5-flash",
        aiMode: "balanced",
        memoryDepth: 10,
        productivityIntensity: "balanced",
        localAIEnabled: false,
        cognitiveThreshold: 75,
        themeAccent: "lavender",
        autoSyncCalendar: true,
        autoDndFocus: true,
        isOnboarded: false,
        aiApiKey: null,
      },
    })
  }
}

/**
 * Memperbarui pengaturan pengguna.
 */
export async function updateSettings(
  userId: string,
  data: Partial<Omit<UserSettings, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<UserSettings> {
  return await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      theme: data.theme || "dark",
      aiModel: data.aiModel || "maia/gemini-2.5-flash",
      aiMode: data.aiMode || "balanced",
      memoryDepth: data.memoryDepth || 10,
      productivityIntensity: data.productivityIntensity || "balanced",
      localAIEnabled: data.localAIEnabled !== undefined ? data.localAIEnabled : false,
      cognitiveThreshold: data.cognitiveThreshold || 75,
      themeAccent: data.themeAccent || "lavender",
      autoSyncCalendar: data.autoSyncCalendar !== undefined ? data.autoSyncCalendar : true,
      autoDndFocus: data.autoDndFocus !== undefined ? data.autoDndFocus : true,
      isOnboarded: data.isOnboarded !== undefined ? data.isOnboarded : false,
      aiApiKey: data.aiApiKey !== undefined ? data.aiApiKey : null,
    },
  })
}
