import { useState } from "react"
import { useUIStore } from "@/stores/useUIStore"
import { useProjectSettings, useUpdateProjectSettings } from "@/hooks/useProjectSettings"
import { useLists } from "@/hooks/useLists"
import { useUserRole } from "@/hooks/useUserRole"
import { useProject } from "@/hooks/useProjects"
import { canManageMembers, canManageSettings } from "@/lib/permissions"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { MembersPanel } from "@/components/shared/MembersPanel"
import { InviteMembersDialog } from "@/components/shared/InviteMembersDialog"
import { AISettings } from "@/components/ai/AISettings"
import { Settings, Zap, Bell, Shield, Users, UserPlus } from "lucide-react"

export default function SettingsPage() {
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const { data: settings, isLoading } = useProjectSettings(activeProjectId)
  const { data: lists } = useLists(activeProjectId)
  const { data: project } = useProject(activeProjectId)
  const { data: currentRole } = useUserRole(activeProjectId)
  const updateSettings = useUpdateProjectSettings()
  const isOwner = canManageMembers(currentRole)
  // canManageSettings reserved for future field-level gating
  void canManageSettings(currentRole)
  const [inviteOpen, setInviteOpen] = useState(false)

  // Local state mirrors DB settings
  const [form, setForm] = useState({
    auto_detect_overdue: settings?.auto_detect_overdue ?? true,
    overdue_action: settings?.overdue_action ?? "set_priority_high",
    auto_move_done_to_list: settings?.auto_move_done_to_list ?? null,
    default_task_priority: settings?.default_task_priority ?? "Medium",
    default_task_status: settings?.default_task_status ?? "To Do",
    enable_confetti: settings?.enable_confetti ?? true,
    enable_notifications: settings?.enable_notifications ?? true,
    theme: settings?.theme ?? "light",
  })

  // Sync form when settings load
  const [synced, setSynced] = useState(false)
  if (settings && !synced) {
    setForm({
      auto_detect_overdue: settings.auto_detect_overdue,
      overdue_action: settings.overdue_action,
      auto_move_done_to_list: settings.auto_move_done_to_list,
      default_task_priority: settings.default_task_priority,
      default_task_status: settings.default_task_status,
      enable_confetti: settings.enable_confetti,
      enable_notifications: settings.enable_notifications,
      theme: settings.theme,
    })
    setSynced(true)
  }

  const handleSave = () => {
    if (!activeProjectId) return
    updateSettings.mutate({
      project_id: activeProjectId,
      ...form,
    })
  }

  if (isLoading) return <LoadingSkeleton variant="board" />

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2D2A26]">Settings</h1>
          <p className="text-sm text-[#7A7267] mt-1">Configure project preferences and automations</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Automation Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-[#B07C4F]/10 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#B07C4F]" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Automation</h2>
            <p className="text-sm text-gray-500">Auto-detect overdue tasks and apply actions</p>
          </div>
        </div>
        <Separator className="mb-4" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="overdue-detect" className="flex flex-col gap-1">
              <span className="font-medium">Overdue Detection</span>
              <span className="text-xs text-gray-400">Automatically detect tasks past their due date</span>
            </Label>
            <Switch
              id="overdue-detect"
              checked={form.auto_detect_overdue}
              onCheckedChange={(v) => setForm((f) => ({ ...f, auto_detect_overdue: v }))}
            />
          </div>

          {form.auto_detect_overdue && (
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1">
                <span className="font-medium">Overdue Action</span>
                <span className="text-xs text-gray-400">What to do when a task is overdue</span>
              </Label>
              <Select
                value={form.overdue_action}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    overdue_action: v as typeof form.overdue_action,
                  }))
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set_priority_high">Set Priority → High</SelectItem>
                  <SelectItem value="set_status_blocked">Set Status → Blocked</SelectItem>
                  <SelectItem value="notify_only">Notify Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label className="flex flex-col gap-1">
              <span className="font-medium">Auto-move completed tasks</span>
              <span className="text-xs text-gray-400">Move tasks to a specific list when done</span>
            </Label>
            <Select
              value={form.auto_move_done_to_list ?? "none"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, auto_move_done_to_list: v === "none" ? null : v }))
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {lists?.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Defaults */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-[#8B7EC8]/10 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#8B7EC8]" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Defaults</h2>
            <p className="text-sm text-gray-500">Default values for new tasks</p>
          </div>
        </div>
        <Separator className="mb-4" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Default Task Status</Label>
            <Select
              value={form.default_task_status}
              onValueChange={(v) => setForm((f) => ({ ...f, default_task_status: v }))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="To Do">To Do</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label className="font-medium">Default Task Priority</Label>
            <Select
              value={form.default_task_priority}
              onValueChange={(v) => setForm((f) => ({ ...f, default_task_priority: v }))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Notifications & UI */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Notifications & UI</h2>
            <p className="text-sm text-gray-500">Customize the look and feel</p>
          </div>
        </div>
        <Separator className="mb-4" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="confetti" className="flex flex-col gap-1">
              <span className="font-medium">Confetti on completion</span>
              <span className="text-xs text-gray-400">Show confetti when tasks are marked done</span>
            </Label>
            <Switch
              id="confetti"
              checked={form.enable_confetti}
              onCheckedChange={(v) => setForm((f) => ({ ...f, enable_confetti: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="flex flex-col gap-1">
              <span className="font-medium">Toast Notifications</span>
              <span className="text-xs text-gray-400">Show toast notifications for automation actions</span>
            </Label>
            <Switch
              id="notifications"
              checked={form.enable_notifications}
              onCheckedChange={(v) => setForm((f) => ({ ...f, enable_notifications: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex flex-col gap-1">
              <span className="font-medium">Theme</span>
              <span className="text-xs text-gray-400">Appearance preference</span>
            </Label>
            <Select
              value={form.theme}
              onValueChange={(v) => setForm((f) => ({ ...f, theme: v as typeof form.theme }))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* AI Assistant Settings */}
      <AISettings />

      {/* Members */}
      {activeProjectId && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#7B9F6F]/10 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-[#7B9F6F]" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Members</h2>
                <p className="text-sm text-gray-500">People who have access to this project</p>
              </div>
            </div>
            {isOwner && (
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="size-4 mr-1.5" />
                Invite
              </Button>
            )}
          </div>
          <Separator className="mb-4" />
          <MembersPanel projectId={activeProjectId} />
        </Card>
      )}

      {/* General project info */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">About</h2>
            <p className="text-sm text-gray-500">WrokoFlow project info</p>
          </div>
        </div>
        <Separator className="mb-4" />
        <div className="text-sm text-gray-500 space-y-1">
          <p>Version: 2.0.0</p>
          <p>AI-native project management — built with React, Supabase, TanStack Router, Tailwind CSS</p>
          <p className="text-xs text-gray-400 mt-2">
            Built by Leonardo Ranoesendjojo · NextX Agencies. Smarter than Asana, more fun than Trello.
          </p>
        </div>
      </Card>

      {/* Spacer for mobile bottom nav */}
      <div className="h-20 md:h-0" />

      {/* Invite Dialog */}
      {activeProjectId && project && (
        <InviteMembersDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          projectId={activeProjectId}
          projectName={project.name}
        />
      )}
    </div>
  )
}
