import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Comment, CreateCommentInput } from "@/types"
import { toast } from "sonner"

export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: ["comments", taskId],
    queryFn: async () => {
      if (!taskId) return []
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true })
      if (error) throw error
      return data as Comment[]
    },
    enabled: !!taskId,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      const { data, error } = await supabase
        .from("comments")
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Comment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["comments", data.task_id] })
      queryClient.invalidateQueries({ queryKey: ["task", data.task_id] })
      toast.success("Comment added")
    },
    onError: (error) => {
      toast.error(`Failed to add comment: ${error.message}`)
    },
  })
}

export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, body, taskId }: { id: string; body: string; taskId: string }) => {
      const { error } = await supabase
        .from("comments")
        .update({ body })
        .eq("id", id)
      if (error) throw error
      return taskId
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase.from("comments").delete().eq("id", id)
      if (error) throw error
      return taskId
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] })
      toast.success("Comment deleted")
    },
  })
}
