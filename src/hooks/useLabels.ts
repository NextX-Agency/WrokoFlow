import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Label, CreateLabelInput } from "@/types"
import { toast } from "sonner"

export function useLabels(projectId: string | null) {
  return useQuery({
    queryKey: ["labels", projectId],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from("labels")
        .select("*")
        .eq("project_id", projectId)
        .order("name", { ascending: true })
      if (error) throw error
      return data as Label[]
    },
    enabled: !!projectId,
  })
}

export function useCreateLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateLabelInput) => {
      const { data, error } = await supabase
        .from("labels")
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Label
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["labels", data.project_id] })
      toast.success("Label created")
    },
    onError: (error) => {
      toast.error(`Failed to create label: ${error.message}`)
    },
  })
}

export function useUpdateLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Label> & { id: string }) => {
      const { data, error } = await supabase
        .from("labels")
        .update(input)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as Label
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["labels", data.project_id] })
    },
  })
}

export function useDeleteLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("labels").delete().eq("id", id)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["labels", projectId] })
      toast.success("Label deleted")
    },
  })
}

export function useTaskLabels() {
  const queryClient = useQueryClient()

  const addLabel = useMutation({
    mutationFn: async ({ taskId, labelId, projectId: _pid }: { taskId: string; labelId: string; projectId?: string }) => {
      const { error } = await supabase
        .from("task_labels")
        .insert({ task_id: taskId, label_id: labelId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["task"] })
    },
  })

  const removeLabel = useMutation({
    mutationFn: async ({ taskId, labelId, projectId: _pid }: { taskId: string; labelId: string; projectId?: string }) => {
      const { error } = await supabase
        .from("task_labels")
        .delete()
        .eq("task_id", taskId)
        .eq("label_id", labelId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["task"] })
    },
  })

  return { addLabel, removeLabel }
}
