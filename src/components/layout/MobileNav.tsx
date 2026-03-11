import { useNavigate, useLocation } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Kanban, Calendar, CheckSquare, Settings } from "lucide-react"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Board", icon: Kanban, path: "/board" },
  { label: "Tasks", icon: CheckSquare, path: "/list" },
  { label: "Calendar", icon: Calendar, path: "/calendar" },
  { label: "Settings", icon: Settings, path: "/settings" },
]

export function MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[#E4DDD2] z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate({ to: item.path })}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-2 min-h-[48px] min-w-[48px] rounded-lg transition-all",
                active
                  ? "text-[#B07C4F]"
                  : "text-[#A09890] active:bg-[#F0EBE3]"
              )}
            >
              <item.icon className={cn("w-5 h-5", active && "scale-110 transition-transform")} />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
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
