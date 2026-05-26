import React from "react"
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { getSettings } from "@/lib/settings/settings"
import PageHeader from "@/components/shared/page-header"
import SettingsContainer from "@/components/settings/settings-container"

export default async function SettingsPage() {
  const { session, user } = await requireSession()

  // Check if Google credentials exist in environments
  const hasCredentials = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  )

  let memoryNodesCount = 0
  let initialSettings = null

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        _count: {
          select: { memories: true },
        },
      },
    })

    if (dbUser) {
      memoryNodesCount = dbUser._count.memories
      initialSettings = await getSettings(dbUser.id)
    }
  } catch (error) {
    console.error("Database connection offline in Settings Page.", error)
  }

  const serializedSettings = initialSettings
    ? {
        ...initialSettings,
        aiApiKey: initialSettings.aiApiKey ? "••••••••" : null,
        userName: (user.name || "Sophia Dev"),
        createdAt: initialSettings.createdAt?.toISOString(),
        updatedAt: initialSettings.updatedAt?.toISOString(),
      }
    : null

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Settings & Configurations"
        description="Konfigurasikan integrasi Google API, model AI aktif, aksen antarmuka, dan ambang batas beban kognitif."
      />

      {/* Main Settings tab integration container */}
      <SettingsContainer
        hasCredentials={hasCredentials}
        memoryNodesCount={memoryNodesCount}
        initialSettings={serializedSettings}
      />
    </div>
  )
}
