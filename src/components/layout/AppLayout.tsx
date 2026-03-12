import { Outlet } from "@tanstack/react-router"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { MobileNav } from "./MobileNav"
import { useUIStore } from "@/stores/useUIStore"
import { useRealtimeSubscription } from "@/hooks/useRealtime"
import { useAutomationRunner } from "@/hooks/useAutomationRunner"
import { cn } from "@/lib/utils"

export function AppLayout() {
  const { activeProjectId, sidebarOpen } = useUIStore()
  useRealtimeSubscription(activeProjectId)
  useAutomationRunner(activeProjectId)

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAF7]">
      {/* Sidebar — hidden on mobile */}
      <div
        className={cn(
          "hidden md:flex flex-col border-r border-[#E4DDD2] bg-[#FAF8F5] transition-all duration-200",
          sidebarOpen ? "w-[240px]" : "w-[64px]"
        )}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto p-3 sm:p-5 md:p-6 pb-mobile-nav md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
