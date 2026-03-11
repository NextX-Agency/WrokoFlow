import { supabase } from "@/lib/supabase"
import type { Task, AutomationRule, ProjectSettings } from "@/types"
import { isPast, parseISO } from "date-fns"
import { toast } from "sonner"

/**
 * Client-side automation engine that evaluates rules and applies actions.
 * Called after task mutations or on a polling interval.
 */

interface AutomationContext {
  projectId: string
  tasks: Task[]
  rules: AutomationRule[]
  settings: ProjectSettings | null
}

/** Detect overdue tasks and apply configured action */
export async function runOverdueDetection(ctx: AutomationContext): Promise<number> {
  if (!ctx.settings?.auto_detect_overdue) return 0

  const overdueTasks = ctx.tasks.filter(
    (t) =>
      t.due_date &&
      isPast(parseISO(t.due_date)) &&
      t.status !== "Done" &&
      t.status !== "Blocked"
  )

  if (overdueTasks.length === 0) return 0

  let applied = 0

  for (const task of overdueTasks) {
    const action = ctx.settings.overdue_action

    if (action === "set_priority_high" && task.priority !== "High") {
      const { error } = await supabase
        .from("tasks")
        .update({ priority: "High" })
        .eq("id", task.id)

      if (!error) {
        applied++
        await logAutomation(ctx.projectId, null, task.id, "set_priority_high", {
          reason: "Task is overdue",
          task_title: task.title,
        })
      }
    } else if (action === "set_status_blocked" && task.status !== "Blocked") {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "Blocked" })
        .eq("id", task.id)

      if (!error) {
        applied++
        await logAutomation(ctx.projectId, null, task.id, "set_status_blocked", {
          reason: "Task is overdue",
          task_title: task.title,
        })
      }
    } else if (action === "notify_only") {
      applied++
    }
  }

  if (applied > 0 && ctx.settings.overdue_action !== "notify_only") {
    toast.info(`Automation: ${applied} overdue task(s) updated`)
  }

  return applied
}

/** Evaluate custom automation rules against a task event */
export async function evaluateRules(
  rules: AutomationRule[],
  trigger: string,
  task: Task,
  previousStatus?: string
): Promise<void> {
  const activeRules = rules.filter((r) => r.is_active && r.trigger_type === trigger)

  for (const rule of activeRules) {
    const shouldFire = checkTriggerConditions(rule, task, previousStatus)
    if (!shouldFire) continue

    await executeAction(rule, task)
  }
}

function checkTriggerConditions(
  rule: AutomationRule,
  task: Task,
  previousStatus?: string
): boolean {
  const config = rule.trigger_config

  switch (rule.trigger_type) {
    case "status_change": {
      const fromStatus = config.from_status as string | undefined
      const toStatus = config.to_status as string | undefined
      if (fromStatus && previousStatus !== fromStatus) return false
      if (toStatus && task.status !== toStatus) return false
      return true
    }
    case "task_created":
      return true
    case "due_date_passed":
      return !!task.due_date && isPast(parseISO(task.due_date)) && task.status !== "Done"
    case "assignment_change":
      return true
    default:
      return false
  }
}

async function executeAction(rule: AutomationRule, task: Task): Promise<void> {
  const config = rule.action_config

  switch (rule.action_type) {
    case "set_status": {
      const newStatus = config.status as string
      if (newStatus && task.status !== newStatus) {
        const { error } = await supabase
          .from("tasks")
          .update({ status: newStatus })
          .eq("id", task.id)
        if (!error) {
          toast.info(`Automation "${rule.name}": Status → ${newStatus}`)
          await logAutomation(task.project_id, rule.id, task.id, `set_status:${newStatus}`, {
            rule_name: rule.name,
            task_title: task.title,
          })
        }
      }
      break
    }
    case "set_priority": {
      const newPriority = config.priority as string
      if (newPriority && task.priority !== newPriority) {
        const { error } = await supabase
          .from("tasks")
          .update({ priority: newPriority })
          .eq("id", task.id)
        if (!error) {
          toast.info(`Automation "${rule.name}": Priority → ${newPriority}`)
          await logAutomation(task.project_id, rule.id, task.id, `set_priority:${newPriority}`, {
            rule_name: rule.name,
            task_title: task.title,
          })
        }
      }
      break
    }
    case "move_list": {
      const targetListId = config.list_id as string
      if (targetListId && task.list_id !== targetListId) {
        const { error } = await supabase
          .from("tasks")
          .update({ list_id: targetListId })
          .eq("id", task.id)
        if (!error) {
          toast.info(`Automation "${rule.name}": Moved to list`)
          await logAutomation(task.project_id, rule.id, task.id, "move_list", {
            rule_name: rule.name,
            task_title: task.title,
            target_list: targetListId,
          })
        }
      }
      break
    }
    case "assign_member": {
      const memberId = config.member_id as string
      if (memberId) {
        const { error } = await supabase
          .from("task_assignments")
          .upsert(
            { task_id: task.id, member_id: memberId },
            { onConflict: "task_id,member_id" }
          )
        if (!error) {
          toast.info(`Automation "${rule.name}": Member assigned`)
          await logAutomation(task.project_id, rule.id, task.id, "assign_member", {
            rule_name: rule.name,
            task_title: task.title,
            member_id: memberId,
          })
        }
      }
      break
    }
    case "send_notification": {
      const message = (config.message as string) || `Automation "${rule.name}" triggered`
      toast.info(message)
      await logAutomation(task.project_id, rule.id, task.id, "send_notification", {
        rule_name: rule.name,
        task_title: task.title,
        message,
      })
      break
    }
  }
}

async function logAutomation(
  projectId: string,
  ruleId: string | null,
  taskId: string,
  actionTaken: string,
  details: Record<string, unknown>
): Promise<void> {
  await supabase.from("automation_log").insert({
    rule_id: ruleId,
    project_id: projectId,
    task_id: taskId,
    action_taken: actionTaken,
    details,
  })
}

/** Smart assignment suggestion: find the member with fewest active tasks */
export function suggestAssignment(
  tasks: Task[],
  memberIds: string[]
): string | null {
  if (memberIds.length === 0) return null

  const taskCounts = new Map<string, number>()
  for (const mid of memberIds) {
    taskCounts.set(mid, 0)
  }

  for (const task of tasks) {
    if (task.status === "Done") continue
    for (const a of task.assignments || []) {
      const mid = a.member_id
      if (taskCounts.has(mid)) {
        taskCounts.set(mid, (taskCounts.get(mid) || 0) + 1)
      }
    }
  }

  let bestMemberId: string | null = null
  let minTasks = Infinity
  for (const [mid, count] of taskCounts) {
    if (count < minTasks) {
      minTasks = count
      bestMemberId = mid
    }
  }

  return bestMemberId
}
