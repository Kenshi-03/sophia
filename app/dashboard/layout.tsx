import DashboardSidebar from "@/components/dashboard/dashboard-sidebar"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import DashboardBottomNav from "@/components/dashboard/dashboard-bottom-nav"
import { requireSession } from "@/lib/auth/session"
import { getSettings } from "@/lib/settings/settings"
import StoreInitializer from "@/components/providers/store-initializer"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, user } = await requireSession()
  const settings = await getSettings(user.id)

  // Bypass forced onboarding redirect to allow instant workspace access

  const settingsData = {
    userName: user.name || "SOPHIA Dev User",
    theme: settings.theme,
    aiModel: settings.aiModel,
    aiMode: (settings.aiMode as "focus" | "creative" | "balanced") || "balanced",
    memoryDepth: settings.memoryDepth,
    productivityIntensity: settings.productivityIntensity,
    localAIEnabled: settings.localAIEnabled,
    cognitiveThreshold: settings.cognitiveThreshold,
    themeAccent: (settings.themeAccent as "lavender" | "mint" | "blue") || "lavender",
    autoSyncCalendar: settings.autoSyncCalendar,
    autoDndFocus: settings.autoDndFocus,
    isOnboarded: settings.isOnboarded,
    aiApiKey: settings.aiApiKey ? "••••••••" : null,
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