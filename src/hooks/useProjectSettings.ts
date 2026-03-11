import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { ProjectSettings, UpdateProjectSettingsInput } from "@/types"
import { toast } from "sonner"

export function useProjectSettings(projectId: string | null) {
  return useQuery({
    queryKey: ["project_settings", projectId],
    queryFn: async () => {
      if (!projectId) return null
      const { data, error } = await supabase
        .from("project_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle()
      if (error) throw error
      return data as ProjectSettings | null
    },
    enabled: !!projectId,
  })
}

export function useUpdateProjectSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateProjectSettingsInput) => {
      const { project_id, ...updates } = input

      // Upsert: create if not exists, update if exists
      const { data, error } = await supabase
        .from("project_settings")
        .upsert(
          { project_id, ...updates },
          { onConflict: "project_id" }
        )
        .select()
        .single()
      if (error) throw error
      return data as ProjectSettings
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project_settings", data.project_id] })
      toast.success("Settings saved")
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`)
    },
  })
}
