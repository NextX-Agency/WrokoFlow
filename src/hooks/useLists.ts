import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { List, CreateListInput } from "@/types"
import { toast } from "sonner"

export function useLists(projectId: string | null) {
  return useQuery({
    queryKey: ["lists", projectId],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from("lists")
        .select("*")
        .eq("project_id", projectId)
        .order("position", { ascending: true })
      if (error) throw error
      return data as List[]
    },
    enabled: !!projectId,
  })
}

export function useCreateList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateListInput) => {
      const { data, error } = await supabase
        .from("lists")
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as List
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lists", data.project_id] })
      toast.success("List created")
    },
    onError: (error) => {
      toast.error(`Failed to create list: ${error.message}`)
    },
  })
}

export function useUpdateList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<List> & { id: string }) => {
      const { data, error } = await supabase
        .from("lists")
        .update(input)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as List
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lists", data.project_id] })
    },
    onError: (error) => {
      toast.error(`Failed to update list: ${error.message}`)
    },
  })
}

export function useDeleteList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("lists").delete().eq("id", id)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["lists", projectId] })
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
      toast.success("List deleted")
    },
    onError: (error) => {
      toast.error(`Failed to delete list: ${error.message}`)
    },
  })
}

export function useReorderLists() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lists: Array<{ id: string; position: number; project_id: string }>) => {
      const updates = lists.map((l) =>
        supabase.from("lists").update({ position: l.position }).eq("id", l.id)
      )
      await Promise.all(updates)
      return lists[0]?.project_id
    },
    onSuccess: (projectId) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["lists", projectId] })
      }
    },
  })
}
