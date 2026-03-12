import { useEffect } from "react"
import { Outlet, useRouter } from "@tanstack/react-router"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { MobileNav } from "./MobileNav"
import { AIAssistant } from "@/components/ai/AIAssistant"
import { useUIStore } from "@/stores/useUIStore"
import { useAuthStore } from "@/stores/useAuthStore"
import { useRealtimeSubscription } from "@/hooks/useRealtime"
import { useAutomationRunner } from "@/hooks/useAutomationRunner"
import { cn } from "@/lib/utils"

export function AppLayout() {
  const { activeProjectId, sidebarOpen } = useUIStore()
  const session = useAuthStore((s) => s.session)
  const router = useRouter()
  useRealtimeSubscription(activeProjectId)
  useAutomationRunner(activeProjectId)

  // Redirect to login when session is cleared (e.g. sign out)
  useEffect(() => {
    if (!session) {
      router.navigate({ to: "/login", replace: true })
    }
  }, [session, router])

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

      {/* AI Assistant floating panel */}
      <AIAssistant />
    </div>
  )
}
