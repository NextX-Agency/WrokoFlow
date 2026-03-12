import { useState } from "react"
import { toast } from "sonner"
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
import { Zap, Plus, Trash2, Clock, ArrowRight, Sparkles, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { useAISettings } from "@/hooks/useAI"
import { callAI, type AISettings as AISettingsType, type AIMessage } from "@/lib/ai"
import { useTasks } from "@/hooks/useTasks"

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
  const { data: tasks } = useTasks(activeProjectId || "")
  const { data: aiSettingsData } = useAISettings()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ name: string; trigger_type: AutomationTrigger; action_type: AutomationAction; trigger_config: Record<string, unknown>; action_config: Record<string, unknown>; description: string }>>([])

  const handleAIGenerate = async () => {
    if (!aiSettingsData || !activeProjectId) {
      toast.error("Configure your AI settings first (Settings → AI)")
      return
    }
    setAiGenerating(true)
    try {
      const settings: AISettingsType = {
        provider: aiSettingsData.provider,
        model: aiSettingsData.model,
      }
      const taskSummary = (tasks || []).slice(0, 15).map((t) => ({
        title: t.title,
        status: t.status,
      }))
      const listNames = (lists || []).map((l) => ({ id: l.id, name: l.name }))
      const memberNames = (members || []).map((m) => ({ id: m.id, name: m.name }))

      const messages: AIMessage[] = [
        {
          role: "system",
          content: `You are an automation rule generator for a project management app. Suggest exactly 3 automation rules as a compact single-line JSON array.

Rules:
- Output ONLY the JSON array — no markdown fences, no explanation text before or after.
- All string values must be on one line — no literal newlines inside strings.
- Use double-quotes only.

Available triggers: status_change, due_date_passed, task_created, all_subtasks_done, assignment_change
Available actions: set_status, assign_member, move_list, send_notification, set_priority

Trigger configs: status_change:{from_status?,to_status?} | due_date_passed:{} | task_created:{} | all_subtasks_done:{} | assignment_change:{}
Action configs: set_status:{status:"To Do"|"In Progress"|"Done"|"Blocked"} | set_priority:{priority:"High"|"Medium"|"Low"} | move_list:{list_id} | assign_member:{member_id} | send_notification:{message}

Each rule object: {"name":"...","description":"...","trigger_type":"...","trigger_config":{...},"action_type":"...","action_config":{...}}`,
        },
        {
          role: "user",
          content: `Tasks (sample): ${JSON.stringify(taskSummary)}. Lists: ${JSON.stringify(listNames)}. Members: ${JSON.stringify(memberNames)}.`,
        },
      ]

      const response = await callAI(messages, [], settings)
      if (response.content) {
        // Robust JSON extraction: find the outermost [ ... ] array in the response.
        // This handles: raw JSON, ```json blocks, JSON with surrounding explanation text.
        const raw = response.content.trim()
        let jsonStr: string | null = null

        // 1. Try to find a fenced code block first
        const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (fenceMatch) {
          jsonStr = fenceMatch[1].trim()
        } else {
          // 2. Find the outermost balanced [ ... ] — handles trailing/leading text
          const start = raw.indexOf("[")
          if (start !== -1) {
            let depth = 0
            let end = -1
            for (let i = start; i < raw.length; i++) {
              if (raw[i] === "[") depth++
              else if (raw[i] === "]") {
                depth--
                if (depth === 0) { end = i; break }
              }
            }
            if (end !== -1) jsonStr = raw.slice(start, end + 1)
          }
        }

        if (!jsonStr) throw new Error("AI did not return a JSON array. Try again.")

        const parsed = JSON.parse(jsonStr)
        if (Array.isArray(parsed)) {
          setAiSuggestions(parsed)
          toast.success(`AI suggested ${parsed.length} rules`)
        } else {
          throw new Error("Unexpected response format. Try again.")
        }
      }
    } catch (err) {
      toast.error(`AI generation failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setAiGenerating(false)
    }
  }

  const acceptSuggestion = (suggestion: typeof aiSuggestions[0]) => {
    if (!activeProjectId) return
    createRule.mutate({
      project_id: activeProjectId,
      name: suggestion.name,
      description: suggestion.description,
      trigger_type: suggestion.trigger_type,
      action_type: suggestion.action_type,
      trigger_config: suggestion.trigger_config || {},
      action_config: suggestion.action_config || {},
      is_active: true,
    })
    setAiSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name))
  }

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleAIGenerate}
            disabled={aiGenerating || !aiSettingsData}
            className="border-[#B07C4F]/30 text-[#B07C4F] hover:bg-[#B07C4F]/10"
          >
            {aiGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate with AI
          </Button>
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
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#B07C4F] flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Suggested Rules ({aiSuggestions.length})
          </h2>
          {aiSuggestions.map((suggestion, i) => (
            <Card key={i} className="p-4 border-[#B07C4F]/20 bg-[#B07C4F]/5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{suggestion.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{suggestion.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {TRIGGER_LABELS[suggestion.trigger_type] || suggestion.trigger_type}
                    </Badge>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <Badge variant="outline" className="text-xs">
                      {ACTION_LABELS[suggestion.action_type] || suggestion.action_type}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Button
                    size="sm"
                    onClick={() => acceptSuggestion(suggestion)}
                    className="bg-[#B07C4F] hover:bg-[#9A6A40] text-white"
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAiSuggestions((prev) => prev.filter((_, j) => j !== i))}
                    className="text-gray-400 hover:text-red-500"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

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
