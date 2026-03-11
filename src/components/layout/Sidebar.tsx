import { useNavigate, useLocation } from "@tanstack/react-router"
import { useUIStore } from "@/stores/useUIStore"
import { useProjects } from "@/hooks/useProjects"
import { useAuthStore } from "@/stores/useAuthStore"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Kanban,
  List,
  Calendar,
  GitBranch,
  GraduationCap,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Zap,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { WrokoFlowLogo } from "@/components/shared/WrokoFlowLogo"

const mainNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Board", icon: Kanban, path: "/board" },
  { label: "List View", icon: List, path: "/list" },
  { label: "Calendar", icon: Calendar, path: "/calendar" },
  { label: "Timeline", icon: GitBranch, path: "/timeline" },
]

const internalNav = [
  { label: "Training Schedule", icon: GraduationCap, path: "/training" },
  { label: "Attendance", icon: Users, path: "/attendance" },
  { label: "Automations", icon: Zap, path: "/automations" },
  { label: "Settings", icon: Settings, path: "/settings" },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, signOut } = useAuthStore()
  const { data: projects } = useProjects()

  const activeProject = projects?.[0]

  const isActive = (path: string) => location.pathname === path

  const NavItem = ({
    label,
    icon: Icon,
    path,
  }: {
    label: string
    icon: React.ComponentType<{ className?: string }>
    path: string
  }) => (
    <button
      onClick={() => navigate({ to: path })}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
        isActive(path)
          ? "bg-[#B07C4F]/10 text-[#B07C4F]"
          : "text-[#7A7267] hover:bg-[#F0EBE3] hover:text-[#4A4540]"
      )}
    >
      <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive(path) ? "text-[#B07C4F]" : "text-[#A09890]")} />
      {sidebarOpen && <span className="truncate">{label}</span>}
    </button>
  )

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <WrokoFlowLogo size={32} className="flex-shrink-0" />
        {sidebarOpen && (
          <div className="min-w-0">
            <h1 className="font-bold text-[#2D2A26] text-base leading-tight">WrokoFlow</h1>
            {activeProject && (
              <p className="text-xs text-[#7A7267] truncate">{activeProject.name}</p>
            )}
          </div>
        )}
      </div>

      <Separator className="bg-[#E4DDD2]" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-0.5">
          {mainNav.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>

        {sidebarOpen && (
          <p className="text-[10px] font-semibold text-[#A09890] uppercase tracking-wider px-3 mt-6 mb-2">
            Internal
          </p>
        )}
        {!sidebarOpen && <Separator className="my-4 bg-[#E4DDD2]" />}
        <nav className="flex flex-col gap-0.5">
          {internalNav.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>
      </ScrollArea>

      <Separator className="bg-[#E4DDD2]" />

      {/* User info + collapse */}
      <div className="p-3">
        <div className={cn("flex items-center gap-3", sidebarOpen ? "" : "justify-center")}>
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-[#E8DCC8] text-[#B07C4F] text-xs font-semibold">
              {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#2D2A26] truncate">
                {user?.user_metadata?.full_name || user?.email || "User"}
              </p>
              <p className="text-xs text-[#A09890] truncate">{user?.email}</p>
            </div>
          )}
          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#A09890] hover:text-[#C44B3F] hover:bg-[#C44B3F]/10"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-8 mt-2 text-[#A09890] hover:text-[#7A7267] hover:bg-[#F0EBE3]"
          onClick={toggleSidebar}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
