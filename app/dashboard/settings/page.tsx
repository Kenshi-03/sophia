import React from "react"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import PageHeader from "@/components/shared/page-header"
import SettingsContainer from "@/components/settings/settings-container"

export default async function SettingsPage() {
  const session = await auth()
  const email = session?.user?.email || "user@sophia.local"

  // Check if Google credentials exist in environments
  const hasCredentials = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  )

  let memoryNodesCount = 0

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      include: {
        _count: {
          select: { memories: true },
        },
      },
    })

    if (dbUser) {
      memoryNodesCount = dbUser._count.memories
    } else {
      // Seed user fallback
      const seedUser = await prisma.user.findFirst({
        include: {
          _count: {
            select: { memories: true },
          },
        },
      })
      if (seedUser) {
        memoryNodesCount = seedUser._count.memories
      }
    }
  } catch (error) {
    console.warn("Database connection offline in Settings Page. Falling back to default mock node count.", error)
    memoryNodesCount = 2 // Match length of mockMemories in lib/db/mocks.ts
  }

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
      />
    </div>
  )
}
