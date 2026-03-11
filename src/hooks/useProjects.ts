import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Project, CreateProjectInput } from "@/types"
import { useAuthStore } from "@/stores/useAuthStore"
import { toast } from "sonner"

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as Project[]
    },
  })
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: async () => {
      if (!projectId) return null
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single()
      if (error) throw error
      return data as Project
    },
    enabled: !!projectId,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: input.name,
          description: input.description || null,
          color: input.color || "#3B82F6",
          owner_id: user?.id,
        })
        .select()
        .single()
      if (error) throw error

      // Auto-add owner as member
      if (user) {
        await supabase.from("members").insert({
          project_id: data.id,
          user_id: user.id,
          name: user.user_metadata?.full_name || user.email || "Owner",
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url,
          role: "owner",
        })
      }

      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      toast.success("Project created")
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`)
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(input)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as Project
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["projects", data.id] })
      toast.success("Project updated")
    },
    onError: (error) => {
      toast.error(`Failed to update project: ${error.message}`)
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      toast.success("Project deleted")
    },
    onError: (error) => {
      toast.error(`Failed to delete project: ${error.message}`)
    },
  })
}
