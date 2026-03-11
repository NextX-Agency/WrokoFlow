import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/types"
import { useAuthStore } from "@/stores/useAuthStore"
import { toast } from "sonner"
import { fireConfetti } from "@/lib/confetti"

export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assignments:task_assignments(
            id,
            task_id,
            member_id,
            members:members(id, name, email, avatar_url)
          ),
          labels:task_labels(
            task_id,
            label_id,
            labels:labels(id, name, color)
          )
        `)
        .eq("project_id", projectId)
        .order("position", { ascending: true })
      if (error) throw error

      return (data || []) as Task[]
    },
    enabled: !!projectId,
  })
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      if (!taskId) return null
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assignments:task_assignments(
            id,
            task_id,
            member_id,
            members:members(id, name, email, avatar_url)
          ),
          labels:task_labels(
            task_id,
            label_id,
            labels:labels(id, name, color)
          ),
          comments(
            id, task_id, author_id, body, created_at
          ),
          attachments(
            id, task_id, file_name, file_url, file_size, uploaded_by, created_at
          )
        `)
        .eq("id", taskId)
        .single()
      if (error) throw error

      return data as Task
    },
    enabled: !!taskId,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", data.project_id] })
      toast.success("Task created")
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`)
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const { id, projectId: _pid, ...updates } = input
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", data.project_id] })
      queryClient.invalidateQueries({ queryKey: ["task", data.id] })

      // Confetti on task completion
      if (variables.status === "Done") {
        fireConfetti("default")
        toast.success("Task completed! 🎉")
      }
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`)
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      toast.success("Task deleted")
    },
    onError: (error) => {
      toast.error(`Failed to delete task: ${error.message}`)
    },
  })
}

export function useDuplicateTask() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (task: Task) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          project_id: task.project_id,
          list_id: task.list_id,
          title: `${task.title} (copy)`,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          start_date: task.start_date,
          position: task.position + 1,
          created_by: user?.id,
        })
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", data.project_id] })
      toast.success("Task duplicated")
    },
    onError: (error) => {
      toast.error(`Failed to duplicate task: ${error.message}`)
    },
  })
}

export function useMoveTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      listId,
      position,
      projectId,
      status,
    }: {
      taskId: string
      listId: string
      position: number
      projectId: string
      status?: string
    }) => {
      const updates: Record<string, unknown> = { list_id: listId, position }
      if (status) updates.status = status

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    },
  })
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskIds,
      updates,
      projectId,
    }: {
      taskIds: string[]
      updates: Partial<Task>
      projectId: string
    }) => {
      const promises = taskIds.map((id) =>
        supabase.from("tasks").update(updates).eq("id", id)
      )
      await Promise.all(promises)
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      toast.success("Tasks updated")
    },
    onError: (error) => {
      toast.error(`Failed to update tasks: ${error.message}`)
    },
  })
}

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskIds,
      projectId,
    }: {
      taskIds: string[]
      projectId: string
    }) => {
      const { error } = await supabase       
        .from("tasks")
        .delete()
        .in("id", taskIds)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      toast.success("Tasks deleted")
    },
    onError: (error) => {
      toast.error(`Failed to delete tasks: ${error.message}`)
    },
  })
}
