import { useEffect, useRef, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTasks } from "@/hooks/useTasks"
import { useAutomationRules } from "@/hooks/useAutomation"
import { useProjectSettings } from "@/hooks/useProjectSettings"
import { runOverdueDetection } from "@/lib/automationEngine"

const OVERDUE_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Hook that runs automation checks periodically.
 * Mount once in the app layout.
 */
export function useAutomationRunner(projectId: string | null) {
  const queryClient = useQueryClient()
  const { data: tasks } = useTasks(projectId)
  const { data: rules } = useAutomationRules(projectId)
  const { data: settings } = useProjectSettings(projectId)
  const lastRunRef = useRef(0)

  const runChecks = useCallback(async () => {
    if (!projectId || !tasks || !rules) return

    const now = Date.now()
    if (now - lastRunRef.current < 30_000) return // debounce 30s
    lastRunRef.current = now

    const applied = await runOverdueDetection({
      projectId,
      tasks,
      rules,
      settings: settings ?? null,
    })

    if (applied > 0) {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    }
  }, [projectId, tasks, rules, settings, queryClient])

  // Run on mount and on interval
  useEffect(() => {
    if (!projectId) return

    // Initial run after a short delay
    const initTimer = setTimeout(runChecks, 3000)

    // Periodic overdue checks
    const interval = setInterval(runChecks, OVERDUE_CHECK_INTERVAL)

    return () => {
      clearTimeout(initTimer)
      clearInterval(interval)
    }
  }, [projectId, runChecks])
}
