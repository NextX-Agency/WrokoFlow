import { useNavigate, useLocation } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/useUIStore"
import { LayoutDashboard, Kanban, Calendar, CheckSquare, Sparkles } from "lucide-react"

const navItems = [
  { label: "Home", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Board", icon: Kanban, path: "/board" },
  { label: "Tasks", icon: CheckSquare, path: "/list" },
  { label: "Calendar", icon: Calendar, path: "/calendar" },
  { label: "AI", icon: Sparkles, path: "__ai__" },
]

export function MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const toggleAIPanel = useUIStore((s) => s.toggleAIPanel)
  const aiPanelOpen = useUIStore((s) => s.aiPanelOpen)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[#E4DDD2] z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2">
        {navItems.map((item) => {
          const isAI = item.path === "__ai__"
          const active = isAI ? aiPanelOpen : location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => isAI ? toggleAIPanel() : navigate({ to: item.path })}
              className={cn(
                "flex flex-col items-center gap-1 py-3 px-3 rounded-lg transition-all",
                active
                  ? "text-[#B07C4F]"
                  : "text-[#A09890] active:bg-[#F0EBE3]"
              )}
            >
              <item.icon className={cn("w-5 h-5", active && "scale-110 transition-transform")} />
              <span className="text-xs font-medium leading-tight">{item.label}</span>
              {active && (
                <div className="w-1 h-1 bg-[#B07C4F] rounded-full mt-0.5" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
