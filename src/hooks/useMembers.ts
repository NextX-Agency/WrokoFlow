import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Member } from "@/types"
import { toast } from "sonner"

export function useMembers(projectId: string | null) {
  return useQuery({
    queryKey: ["members", projectId],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("project_id", projectId)
        .order("name", { ascending: true })
      if (error) throw error
      return data as Member[]
    },
    enabled: !!projectId,
  })
}

export function useCreateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { project_id: string; name: string; email?: string; role?: string }) => {
      const { data, error } = await supabase
        .from("members")
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Member
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members", data.project_id] })
      toast.success("Member added")
    },
    onError: (error) => {
      toast.error(`Failed to add member: ${error.message}`)
    },
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Member> & { id: string }) => {
      const { data, error } = await supabase
        .from("members")
        .update(input)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as Member
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members", data.project_id] })
      queryClient.invalidateQueries({ queryKey: ["user-role", data.project_id] })
      toast.success("Member updated")
    },
    onError: (error) => {
      toast.error(`Failed to update member: ${error.message}`)
    },
  })
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, role, projectId: _pid }: { id: string; role: string; projectId: string }) => {
      const { data, error } = await supabase
        .from("members")
        .update({ role })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as Member
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members", data.project_id] })
      queryClient.invalidateQueries({ queryKey: ["user-role", data.project_id] })
      toast.success("Member role updated")
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`)
    },
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("members").delete().eq("id", id)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["members", projectId] })
      toast.success("Member removed")
    },
    onError: (error) => {
      toast.error(`Failed to remove member: ${error.message}`)
    },
  })
}

export function useTaskAssignments() {
  const queryClient = useQueryClient()

  const assign = useMutation({
    mutationFn: async ({ taskId, memberId, projectId: _pid }: { taskId: string; memberId: string; projectId?: string }) => {
      const { error } = await supabase
        .from("task_assignments")
        .insert({ task_id: taskId, member_id: memberId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["task"] })
    },
  })

  const unassign = useMutation({
    mutationFn: async ({ taskId, memberId, projectId: _pid }: { taskId: string; memberId: string; projectId?: string }) => {
      const { error } = await supabase
        .from("task_assignments")
        .delete()
        .eq("task_id", taskId)
        .eq("member_id", memberId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["task"] })
    },
  })

  return { assign, unassign }
}
