import { useState } from "react"
import { useUIStore } from "@/stores/useUIStore"
import {
  useAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
  useAutomationLogs,
} from "@/hooks/useAutomation"
import { useLists } from "@/hooks/useLists"
import { useMembers } from "@/hooks/useMembers"
import type { AutomationTrigger, AutomationAction } from "@/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Zap, Plus, Trash2, Clock, ArrowRight } from "lucide-react"
import { format } from "date-fns"

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  status_change: "Status Change",
  due_date_passed: "Due Date Passed",
  task_created: "Task Created",
  all_subtasks_done: "All Subtasks Done",
  assignment_change: "Assignment Change",
}

const ACTION_LABELS: Record<AutomationAction, string> = {
  set_status: "Set Status",
  assign_member: "Assign Member",
  move_list: "Move to List",
  send_notification: "Send Notification",
  set_priority: "Set Priority",
}

export default function AutomationPage() {
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const { data: rules, isLoading } = useAutomationRules(activeProjectId)
  const { data: logs } = useAutomationLogs(activeProjectId, 20)
  const createRule = useCreateAutomationRule()
  const updateRule = useUpdateAutomationRule()
  const deleteRule = useDeleteAutomationRule()
  const { data: lists } = useLists(activeProjectId)
  const { data: members } = useMembers(activeProjectId)
  const [dialogOpen, setDialogOpen] = useState(false)

  // New rule form state
  const [newRule, setNewRule] = useState({
    name: "",
    trigger_type: "status_change" as AutomationTrigger,
    action_type: "set_status" as AutomationAction,
    trigger_config: {} as Record<string, unknown>,
    action_config: {} as Record<string, unknown>,
  })

  const handleCreate = () => {
    if (!activeProjectId || !newRule.name.trim()) return
    createRule.mutate(
      {
        project_id: activeProjectId,
        name: newRule.name,
        trigger_type: newRule.trigger_type,
        action_type: newRule.action_type,
        trigger_config: newRule.trigger_config,
        action_config: newRule.action_config,
      },
      {
        onSuccess: () => {
          setDialogOpen(false)
          setNewRule({
            name: "",
            trigger_type: "status_change",
            action_type: "set_status",
            trigger_config: {},
            action_config: {},
          })
        },
      }
    )
  }

  if (isLoading) return <LoadingSkeleton variant="board" />

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create rules to automate repetitive actions
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Rule Name</Label>
                <Input
                  value={newRule.name}
                  onChange={(e) => setNewRule((r) => ({ ...r, name: e.target.value }))}
                  placeholder="e.g., Auto-close done tasks"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>When (Trigger)</Label>
                <Select
                  value={newRule.trigger_type}
                  onValueChange={(v) =>
                    setNewRule((r) => ({
                      ...r,
                      trigger_type: v as AutomationTrigger,
                      trigger_config: {},
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Trigger config */}
              {newRule.trigger_type === "status_change" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">From Status</Label>
                    <Select
                      value={(newRule.trigger_config.from_status as string) || "any"}
                      onValueChange={(v) =>
                        setNewRule((r) => ({
                          ...r,
                          trigger_config: {
                            ...r.trigger_config,
                            from_status: v === "any" ? undefined : v,
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="To Do">To Do</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">To Status</Label>
                    <Select
                      value={(newRule.trigger_config.to_status as string) || "any"}
                      onValueChange={(v) =>
                        setNewRule((r) => ({
                          ...r,
                          trigger_config: {
                            ...r.trigger_config,
                            to_status: v === "any" ? undefined : v,
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="To Do">To Do</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div>
                <Label>Then (Action)</Label>
                <Select
                  value={newRule.action_type}
                  onValueChange={(v) =>
                    setNewRule((r) => ({
                      ...r,
                      action_type: v as AutomationAction,
                      action_config: {},
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action config */}
              {newRule.action_type === "set_status" && (
                <div>
                  <Label className="text-xs">New Status</Label>
                  <Select
                    value={(newRule.action_config.status as string) || ""}
                    onValueChange={(v) =>
                      setNewRule((r) => ({
                        ...r,
                        action_config: { ...r.action_config, status: v },
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newRule.action_type === "set_priority" && (
                <div>
                  <Label className="text-xs">New Priority</Label>
                  <Select
                    value={(newRule.action_config.priority as string) || ""}
                    onValueChange={(v) =>
                      setNewRule((r) => ({
                        ...r,
                        action_config: { ...r.action_config, priority: v },
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newRule.action_type === "move_list" && (
                <div>
                  <Label className="text-xs">Target List</Label>
                  <Select
                    value={(newRule.action_config.list_id as string) || ""}
                    onValueChange={(v) =>
                      setNewRule((r) => ({
                        ...r,
                        action_config: { ...r.action_config, list_id: v },
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select list" />
                    </SelectTrigger>
                    <SelectContent>
                      {lists?.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newRule.action_type === "assign_member" && (
                <div>
                  <Label className="text-xs">Assign To</Label>
                  <Select
                    value={(newRule.action_config.member_id as string) || ""}
                    onValueChange={(v) =>
                      setNewRule((r) => ({
                        ...r,
                        action_config: { ...r.action_config, member_id: v },
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newRule.action_type === "send_notification" && (
                <div>
                  <Label className="text-xs">Notification Message</Label>
                  <Input
                    value={(newRule.action_config.message as string) || ""}
                    onChange={(e) =>
                      setNewRule((r) => ({
                        ...r,
                        action_config: { ...r.action_config, message: e.target.value },
                      }))
                    }
                    placeholder="Custom notification message"
                    className="mt-1"
                  />
                </div>
              )}

              <Button
                onClick={handleCreate}
                disabled={!newRule.name.trim() || createRule.isPending}
                className="w-full"
              >
                {createRule.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules list */}
      {(!rules || rules.length === 0) ? (
        <EmptyState
          icon={Zap}
          title="No automation rules"
          description="Create your first rule to automate repetitive actions"
        />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{rule.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {TRIGGER_LABELS[rule.trigger_type]}
                      </Badge>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <Badge variant="outline" className="text-xs">
                        {ACTION_LABELS[rule.action_type]}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(active) =>
                      updateRule.mutate({ id: rule.id, is_active: active })
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{rule.name}". This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            deleteRule.mutate({ id: rule.id, projectId: rule.project_id })
                          }
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Recent automation activity */}
      {logs && logs.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Automation Activity</h2>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">{log.action_taken}</p>
                      {log.details && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {(log.details as Record<string, string>).task_title || ""}
                          {(log.details as Record<string, string>).rule_name
                            ? ` — Rule: ${(log.details as Record<string, string>).rule_name}`
                            : ""}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {format(new Date(log.executed_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      <div className="h-20 md:h-0" />
    </div>
  )
}
