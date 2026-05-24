import DashboardSidebar from "@/components/dashboard/dashboard-sidebar"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import DashboardBottomNav from "@/components/dashboard/dashboard-bottom-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#111316] text-[#e2e2e6] font-sans flex flex-col">
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