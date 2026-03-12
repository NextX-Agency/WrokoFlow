import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/useAuthStore"
import {
  callAI,
  testAIConnection,
  DEFAULT_MODELS,
  PROVIDER_LABELS,
  type AISettings,
  type AIMessage,
  type AITool,
  type AIToolCall,
  type AIProvider,
  type AIResponse,
} from "@/lib/ai"
import { toast } from "sonner"
import type {
  Task,
  List,
  Member,
  CreateTaskInput,
  CreateListInput,
  CreateAutomationRuleInput,
  AutomationTrigger,
  AutomationAction,
  TaskStatus,
  TaskPriority,
} from "@/types"

// ─── AI Settings CRUD ─────────────────────────────────────────────────────

export interface UserAISettings {
  id: string
  user_id: string
  provider: AIProvider
  model: string
  created_at: string
  updated_at: string
}

export function useAISettings() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ["ai-settings", user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data, error } = await supabase
        .from("user_ai_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
      if (error) throw error
      return data as UserAISettings | null
    },
    enabled: !!user,
  })
}

export function useSaveAISettings() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (input: { provider: AIProvider; model: string }) => {
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase
        .from("user_ai_settings")
        .upsert(
          {
            user_id: user.id,
            provider: input.provider,
            model: input.model,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] })
      toast.success("AI settings saved")
    },
    onError: (err) => toast.error(`Failed to save: ${err.message}`),
  })
}

export function useTestAIConnection() {
  return useMutation({
    mutationFn: async (settings: AISettings) => {
      const ok = await testAIConnection(settings)
      if (!ok) throw new Error("Connection test failed")
      return true
    },
    onSuccess: () => toast.success("AI connection works!"),
    onError: () => toast.error("Connection failed — check if the provider is configured."),
  })
}

// ─── Tool Definitions ─────────────────────────────────────────────────────

export function getAITools(): AITool[] {
  return [
    {
      name: "create_task",
      description: "Create a new task in the project",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description (optional)" },
          status: { type: "string", enum: ["To Do", "In Progress", "Done", "Blocked"], description: "Task status" },
          priority: { type: "string", enum: ["High", "Medium", "Low"], description: "Task priority" },
          due_date: { type: "string", description: "Due date in YYYY-MM-DD format (optional)" },
          list_id: { type: "string", description: "List ID to add the task to (optional)" },
        },
        required: ["title"],
      },
    },
    {
      name: "update_task",
      description: "Update an existing task by ID",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task ID" },
          title: { type: "string", description: "New title (optional)" },
          status: { type: "string", enum: ["To Do", "In Progress", "Done", "Blocked"] },
          priority: { type: "string", enum: ["High", "Medium", "Low"] },
          due_date: { type: "string", description: "Due date in YYYY-MM-DD format" },
          description: { type: "string", description: "New description" },
          list_id: { type: "string", description: "Move to list ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "delete_task",
      description: "Delete a task by ID",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task ID to delete" },
        },
        required: ["id"],
      },
    },
    {
      name: "bulk_create_tasks",
      description: "Create multiple tasks at once. Use this when the user wants to add many tasks or does a data dump.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            description: "Array of tasks to create",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                status: { type: "string", enum: ["To Do", "In Progress", "Done", "Blocked"] },
                priority: { type: "string", enum: ["High", "Medium", "Low"] },
                due_date: { type: "string" },
                list_id: { type: "string" },
              },
            } as any,
          },
        },
        required: ["tasks"],
      },
    },
    {
      name: "create_list",
      description: "Create a new list/column in the project",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "List name" },
          color: { type: "string", description: "Hex color code (optional)" },
        },
        required: ["name"],
      },
    },
    {
      name: "create_automation_rule",
      description: "Create an automation rule for the project",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Rule name" },
          description: { type: "string", description: "What the rule does" },
          trigger_type: { type: "string", enum: ["status_change", "due_date_passed", "task_created", "all_subtasks_done", "assignment_change"] },
          trigger_config: { type: "object", description: "Trigger configuration" },
          action_type: { type: "string", enum: ["set_status", "assign_member", "move_list", "send_notification", "set_priority"] },
          action_config: { type: "object", description: "Action configuration" },
        },
        required: ["name", "trigger_type", "action_type"],
      },
    },
    {
      name: "set_task_due_dates",
      description: "Set due dates for multiple tasks at once (scheduling)",
      parameters: {
        type: "object",
        properties: {
          assignments: {
            type: "array",
            description: "Array of {task_id, due_date} pairs",
            items: {
              type: "object",
              properties: {
                task_id: { type: "string" },
                due_date: { type: "string", description: "YYYY-MM-DD" },
              },
            } as any,
          },
        },
        required: ["assignments"],
      },
    },
    {
      name: "get_project_summary",
      description: "Get a summary of the project's current state — tasks, lists, members, status. Use this to understand the project before taking action.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  ]
}

// ─── AI Chat Hook ─────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  toolResults?: { name: string; result: string }[]
  timestamp: Date
}

interface ProjectContext {
  projectId: string
  projectName: string
  tasks: Task[]
  lists: List[]
  members: Member[]
}

export function useAIChat(context: ProjectContext | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { data: aiSettings } = useAISettings()

  const isConfigured = !!aiSettings

  const buildSystemPrompt = useCallback((): string => {
    if (!context) return "You are WrokoFlow AI assistant."

    const taskSummary = context.tasks.slice(0, 200).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      list_id: t.list_id,
    }))

    const listSummary = context.lists.map((l) => ({
      id: l.id,
      name: l.name,
    }))

    const memberSummary = context.members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
    }))

    return `You are WrokoFlow AI — a smart, fun, and efficient project management assistant built by Leonardo Ranoesendjojo at NextX Agencies.

You help users manage their projects using natural language. You can create tasks, update them, schedule due dates, create lists, set up automation rules, and more.

Be friendly, concise, and action-oriented. When the user asks you to do something, use the available tools to do it — don't just describe what you would do. After performing actions, confirm what you did in a brief, clear summary.

For data dumps (when user pastes raw text, CSV, bullet lists), parse them intelligently and use bulk_create_tasks to create all tasks at once.

For scheduling, consider existing due dates, priorities, and workload when suggesting dates.

Current date: ${new Date().toISOString().split("T")[0]}

PROJECT CONTEXT:
- Project: "${context.projectName}" (ID: ${context.projectId})
- Tasks (${context.tasks.length} total): ${JSON.stringify(taskSummary)}
- Lists: ${JSON.stringify(listSummary)}
- Members: ${JSON.stringify(memberSummary)}`
  }, [context])

  // Execute a tool call against Supabase
  const executeTool = useCallback(
    async (toolCall: AIToolCall): Promise<string> => {
      if (!context) return "No project context available"
      const args = toolCall.arguments
      const projectId = context.projectId

      switch (toolCall.name) {
        case "create_task": {
          const input: CreateTaskInput = {
            project_id: projectId,
            title: args.title as string,
            description: (args.description as string) || undefined,
            status: (((args.status as string) || "To Do") as TaskStatus),
            priority: (((args.priority as string) || "Medium") as TaskPriority),
            due_date: (args.due_date as string) || undefined,
            list_id: (args.list_id as string) || context.lists[0]?.id || undefined,
          }
          const { data, error } = await supabase.from("tasks").insert(input).select().single()
          if (error) return `Error: ${error.message}`
          return `Created task "${data.title}" (ID: ${data.id})`
        }

        case "update_task": {
          const { id, ...fields } = args as Record<string, unknown>
          const { error } = await supabase
            .from("tasks")
            .update(fields)
            .eq("id", id)
          if (error) return `Error: ${error.message}`
          return `Updated task ${id}`
        }

        case "delete_task": {
          const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("id", args.id as string)
          if (error) return `Error: ${error.message}`
          return `Deleted task ${args.id}`
        }

        case "bulk_create_tasks": {
          const taskList = args.tasks as Array<Record<string, unknown>>
          const inserts = taskList.map((t) => ({
            project_id: projectId,
            title: t.title as string,
            description: (t.description as string) || null,
            status: (t.status as string) || "To Do",
            priority: (t.priority as string) || "Medium",
            due_date: (t.due_date as string) || null,
            list_id: (t.list_id as string) || context.lists[0]?.id || null,
          }))
          const { data, error } = await supabase.from("tasks").insert(inserts).select()
          if (error) return `Error: ${error.message}`
          return `Created ${data.length} tasks`
        }

        case "create_list": {
          const input: CreateListInput = {
            project_id: projectId,
            name: args.name as string,
            color: (args.color as string) || undefined,
            position: context.lists.length,
          }
          const { data, error } = await supabase.from("lists").insert(input).select().single()
          if (error) return `Error: ${error.message}`
          return `Created list "${data.name}" (ID: ${data.id})`
        }

        case "create_automation_rule": {
          const input: CreateAutomationRuleInput = {
            project_id: projectId,
            name: args.name as string,
            description: (args.description as string) || null,
            trigger_type: args.trigger_type as AutomationTrigger,
            trigger_config: (args.trigger_config as Record<string, unknown>) || {},
            action_type: args.action_type as AutomationAction,
            action_config: (args.action_config as Record<string, unknown>) || {},
            is_active: true,
          }
          const { data, error } = await supabase.from("automation_rules").insert(input).select().single()
          if (error) return `Error: ${error.message}`
          return `Created automation rule "${data.name}"`
        }

        case "set_task_due_dates": {
          const assignments = args.assignments as Array<{ task_id: string; due_date: string }>
          let updated = 0
          for (const a of assignments) {
            const { error } = await supabase
              .from("tasks")
              .update({ due_date: a.due_date })
              .eq("id", a.task_id)
            if (!error) updated++
          }
          return `Updated due dates for ${updated}/${assignments.length} tasks`
        }

        case "get_project_summary": {
          const byStatus: Record<string, number> = {}
          context.tasks.forEach((t) => {
            byStatus[t.status] = (byStatus[t.status] || 0) + 1
          })
          const overdue = context.tasks.filter(
            (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "Done"
          ).length
          return JSON.stringify({
            project: context.projectName,
            total_tasks: context.tasks.length,
            by_status: byStatus,
            overdue,
            lists: context.lists.map((l) => l.name),
            members: context.members.map((m) => `${m.name} (${m.role})`),
          })
        }

        default:
          return `Unknown tool: ${toolCall.name}`
      }
    },
    [context]
  )

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!aiSettings || !context) {
        toast.error("Please configure your AI settings first (Settings → AI)")
        return
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      try {
        const primaryProvider = aiSettings.provider as AIProvider
        const tools = getAITools()
        const systemPrompt = buildSystemPrompt()

        // Build conversation history for AI
        const aiMessages: AIMessage[] = [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user" as const, content: userMessage },
        ]

        // Try primary provider, fall back to others on rate limit
        const providerOrder: AIProvider[] = [
          primaryProvider,
          ...((["gemini", "groq", "openrouter"] as AIProvider[]).filter((p) => p !== primaryProvider)),
        ]

        let response: AIResponse | null = null
        let lastErr: Error | null = null
        let activeProvider: AIProvider = primaryProvider
        let activeModel: string = aiSettings.model

        for (const provider of providerOrder) {
          try {
            const model = provider === primaryProvider ? aiSettings.model : DEFAULT_MODELS[provider]
            const settings: AISettings = { provider, model }
            response = await callAI(aiMessages, tools, settings)
            activeProvider = provider
            activeModel = model
            if (provider !== primaryProvider) {
              toast.info(
                `Auto-switched to ${PROVIDER_LABELS[provider]} (${PROVIDER_LABELS[primaryProvider]} was rate limited)`,
                { duration: 5000 },
              )
            }
            break
          } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err))
            const isRateLimit =
              lastErr.message.includes("RATE_LIMIT") ||
              lastErr.message.includes("rate limit") ||
              lastErr.message.includes("429")
            if (!isRateLimit) throw lastErr
            // rate limited — continue to next provider
          }
        }

        if (!response) throw (lastErr ?? new Error("All providers failed"))

        const allToolResults: { name: string; result: string }[] = []
        // Use the provider/model that succeeded for all follow-up tool-result calls
        const activeSettings: AISettings = { provider: activeProvider, model: activeModel }

        // Tool execution loop (max 5 rounds to prevent infinite loops)
        let rounds = 0
        while (response.toolCalls.length > 0 && rounds < 5) {
          rounds++
          for (const tc of response.toolCalls) {
            const result = await executeTool(tc)
            allToolResults.push({ name: tc.name, result })

            // Add tool result back to conversation
            aiMessages.push({
              role: "assistant",
              content: `Calling ${tc.name}...`,
            })
            aiMessages.push({
              role: "tool",
              content: result,
              tool_call_id: tc.id,
            })
          }

          // Call AI again with tool results for summary
          response = await callAI(aiMessages, tools, activeSettings)
        }

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.content || "Done! I've completed the requested actions.",
          toolResults: allToolResults.length > 0 ? allToolResults : undefined,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMsg])
      } catch (err) {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Sorry, something went wrong: ${err instanceof Error ? err.message : "Unknown error"}. Please check your AI settings.`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMsg])
      } finally {
        setIsLoading(false)
      }
    },
    [aiSettings, context, messages, buildSystemPrompt, executeTool]
  )

  const clearMessages = useCallback(() => setMessages([]), [])

  return {
    messages,
    isLoading,
    isConfigured,
    sendMessage,
    clearMessages,
  }
}
