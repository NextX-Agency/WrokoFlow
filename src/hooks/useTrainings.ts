import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Training, CreateTrainingInput } from "@/types"
import { toast } from "sonner"

export function useTrainings(projectId: string | null) {
  return useQuery({
    queryKey: ["trainings", projectId],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from("trainings")
        .select("*")
        .eq("project_id", projectId)
        .order("scheduled_at", { ascending: true })
      if (error) throw error
      return data as Training[]
    },
    enabled: !!projectId,
  })
}

export function useCreateTraining() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTrainingInput) => {
      const { data, error } = await supabase
        .from("trainings")
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Training
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trainings", data.project_id] })
      toast.success("Training created")
    },
    onError: (error) => {
      toast.error(`Failed to create training: ${error.message}`)
    },
  })
}

export function useUpdateTraining() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Training> & { id: string }) => {
      const { data, error } = await supabase
        .from("trainings")
        .update(input)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as Training
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trainings", data.project_id] })
    },
    onError: (error) => {
      toast.error(`Failed to update training: ${error.message}`)
    },
  })
}

export function useDeleteTraining() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("trainings").delete().eq("id", id)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["trainings", projectId] })
      toast.success("Training deleted")
    },
  })
}

export function useTaskTrainings() {
  const queryClient = useQueryClient()

  const link = useMutation({
    mutationFn: async ({ taskId, trainingId }: { taskId: string; trainingId: string }) => {
      const { error } = await supabase
        .from("task_trainings")
        .insert({ task_id: taskId, training_id: trainingId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["trainings"] })
    },
  })

  const unlink = useMutation({
    mutationFn: async ({ taskId, trainingId }: { taskId: string; trainingId: string }) => {
      const { error } = await supabase
        .from("task_trainings")
        .delete()
        .eq("task_id", taskId)
        .eq("training_id", trainingId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["trainings"] })
    },
  })

  return { link, unlink }
}
