import { useState } from "react"
import { useUIStore } from "@/stores/useUIStore"
import { useProjects } from "@/hooks/useProjects"
import { useAuthStore } from "@/stores/useAuthStore"
import { useActivityLog } from "@/hooks/useActivityLog"
import { ProjectSwitcher } from "@/components/projects/ProjectSwitcher"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Bell, Search, Menu, Settings, LogOut, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export function TopBar() {
  const { toggleSidebar, activeProjectId } = useUIStore()
  const { user, signOut } = useAuthStore()
  const { data: projects } = useProjects()
  const { data: activityLog } = useActivityLog(activeProjectId, 10)
  const [bellOpen, setBellOpen] = useState(false)

  return (
    <header className="flex items-center gap-4 px-4 md:px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-[#E4DDD2]">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-9 w-9 text-[#7A7267] hover:text-[#4A4540] hover:bg-[#F0EBE3]"
        onClick={toggleSidebar}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Project Switcher */}
      <ProjectSwitcher projects={projects || []} />

      {/* Search bar */}
      <div className="flex-1 max-w-md mx-auto hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A09890]" />
          <Input
            placeholder="Search tasks, teams..."
            className="pl-10 bg-[#F5F3F0] border-[#E4DDD2] h-9 text-sm rounded-xl placeholder:text-[#A09890] focus-visible:ring-[#B07C4F]/30"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Notification Bell */}
        <Popover open={bellOpen} onOpenChange={setBellOpen}>
          <PopoverTrigger asChild>
            <Button data-cy="bell-btn" variant="ghost" size="icon" className="h-9 w-9 relative text-[#7A7267] hover:text-[#4A4540] hover:bg-[#F0EBE3]">
              <Bell className="w-5 h-5" />
              {activityLog && activityLog.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#C97C5C] rounded-full" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[340px] p-0" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm text-[#2D2A26]">Recent Activity</h3>
              {activityLog && activityLog.length > 0 && (
                <span className="text-xs text-[#A09890]">{activityLog.length} events</span>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {!activeProjectId ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <Clock className="w-8 h-8 text-[#C8BFB5] mb-2" />
                  <p className="text-sm text-[#7A7267]">Select a project to view activity</p>
                </div>
              ) : !activityLog || activityLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <Clock className="w-8 h-8 text-[#C8BFB5] mb-2" />
                  <p className="text-sm text-[#7A7267]">No recent activity</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F0EBE3]">
                  {activityLog.map((log) => (
                    <div key={log.id} className="px-4 py-3 hover:bg-[#FAF8F5] transition-colors">
                      <p className="text-sm text-[#4A4540] leading-snug">{log.description}</p>
                      <p className="text-xs text-[#A09890] mt-1">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar data-cy="profile-btn" className="w-8 h-8 cursor-pointer ring-2 ring-[#E4DDD2] ring-offset-1 hover:ring-[#B07C4F] transition-all">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-[#E8DCC8] text-[#B07C4F] text-xs font-semibold">
                {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-[#2D2A26] truncate">
                  {user?.user_metadata?.full_name || "User"}
                </p>
                <p className="text-xs text-[#A09890] truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-cy="profile-settings"
              className="gap-2 cursor-pointer"
              onClick={() => window.location.href = "/settings"}
            >
              <Settings className="w-4 h-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-cy="profile-signout"
              className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={async () => {
                await signOut()
                window.location.href = "/login"
              }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
