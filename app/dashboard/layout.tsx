import DashboardSidebar from "@/components/dashboard/dashboard-sidebar"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import DashboardBottomNav from "@/components/dashboard/dashboard-bottom-nav"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { getSettings } from "@/lib/settings/settings"
import StoreInitializer from "@/components/providers/store-initializer"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const email = session?.user?.email || "user@sophia.local"

  let dbUser = await prisma.user.findUnique({
    where: { email },
  })

  // Fallback to first user in dev mode if not found
  if (!dbUser) {
    dbUser = await prisma.user.findFirst()
  }

  let settingsData = {
    userName: "Sophia Dev",
    theme: "dark",
    aiModel: "maia/gemini-2.5-flash",
    aiMode: "balanced" as "focus" | "creative" | "balanced",
    memoryDepth: 10,
    productivityIntensity: "balanced",
    localAIEnabled: false,
    cognitiveThreshold: 75,
    themeAccent: "lavender" as "lavender" | "mint" | "blue",
    autoSyncCalendar: true,
    autoDndFocus: true,
  }

  if (dbUser) {
    const dbSettings = await getSettings(dbUser.id)
    settingsData = {
      userName: dbUser.name || "Sophia Dev",
      theme: dbSettings.theme,
      aiModel: dbSettings.aiModel,
      aiMode: (dbSettings.aiMode as "focus" | "creative" | "balanced") || "balanced",
      memoryDepth: dbSettings.memoryDepth,
      productivityIntensity: dbSettings.productivityIntensity,
      localAIEnabled: dbSettings.localAIEnabled,
      cognitiveThreshold: dbSettings.cognitiveThreshold,
      themeAccent: (dbSettings.themeAccent as "lavender" | "mint" | "blue") || "lavender",
      autoSyncCalendar: dbSettings.autoSyncCalendar,
      autoDndFocus: dbSettings.autoDndFocus,
    }
  }

  return (
    <div className="min-h-screen bg-[#111316] text-[#e2e2e6] font-sans flex flex-col">
      <StoreInitializer {...settingsData} />

      {/* Top Header Navigation */}
      <DashboardHeader />

      <div className="flex flex-1 pt-20">
        {/* Left Sidebar Navigation (Desktop only) */}
        <DashboardSidebar />

        {/* Main Workspace Canvas (adds bottom padding on mobile for navbar offset) */}
        <main className="flex-1 lg:pl-64 px-4 md:px-12 pt-6 pb-24 lg:py-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Sticky Bottom Navigation (Mobile/Tablet only) */}
      <DashboardBottomNav />
    </div>
  )
}