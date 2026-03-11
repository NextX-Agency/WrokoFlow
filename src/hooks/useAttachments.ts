import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Attachment } from "@/types"
import { useAuthStore } from "@/stores/useAuthStore"
import { toast } from "sonner"

export function useAttachments(taskId: string | null) {
  return useQuery({
    queryKey: ["attachments", taskId],
    queryFn: async () => {
      if (!taskId) return []
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as Attachment[]
    },
    enabled: !!taskId,
  })
}

export function useUploadAttachment() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      task_id,
      uploaded_by,
      file,
      projectId: _pid,
    }: {
      task_id: string
      uploaded_by: string
      file: File
      projectId?: string
    }) => {
      const filePath = `attachments/${task_id}/${Date.now()}_${file.name}`

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(filePath)

      const { data, error } = await supabase
        .from("attachments")
        .insert({
          task_id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          uploaded_by: uploaded_by || user?.id,
        })
        .select()
        .single()
      if (error) throw error
      return data as Attachment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", data.task_id] })
      queryClient.invalidateQueries({ queryKey: ["task", data.task_id] })
      toast.success("File uploaded")
    },
    onError: (error) => {
      toast.error(`Failed to upload file: ${error.message}`)
    },
  })
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, taskId, file_url: _url }: { id: string; taskId: string; file_url?: string }) => {
      const { error } = await supabase.from("attachments").delete().eq("id", id)
      if (error) throw error
      return taskId
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] })
      queryClient.invalidateQueries({ queryKey: ["task", taskId] })
      toast.success("Attachment deleted")
    },
  })
}
