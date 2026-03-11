import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { AutomationRule, AutomationLog, CreateAutomationRuleInput } from "@/types"
import { toast } from "sonner"

export function useAutomationRules(projectId: string | null) {
  return useQuery({
    queryKey: ["automation_rules", projectId],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as AutomationRule[]
    },
    enabled: !!projectId,
  })
}

export function useAutomationLogs(projectId: string | null, limit = 50) {
  return useQuery({
    queryKey: ["automation_logs", projectId, limit],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from("automation_log")
        .select("*")
        .eq("project_id", projectId)
        .order("executed_at", { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as AutomationLog[]
    },
    enabled: !!projectId,
  })
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAutomationRuleInput) => {
      const { data, error } = await supabase
        .from("automation_rules")
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as AutomationRule
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules", data.project_id] })
      toast.success("Automation rule created")
    },
    onError: (error) => {
      toast.error(`Failed to create rule: ${error.message}`)
    },
  })
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AutomationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from("automation_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as AutomationRule
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules", data.project_id] })
      toast.success("Automation rule updated")
    },
    onError: (error) => {
      toast.error(`Failed to update rule: ${error.message}`)
    },
  })
}

export function useDeleteAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("automation_rules").delete().eq("id", id)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules", projectId] })
      toast.success("Automation rule deleted")
    },
  })
}
