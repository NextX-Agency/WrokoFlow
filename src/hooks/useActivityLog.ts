import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { ActivityLog } from "@/types"

export function useActivityLog(projectId: string | null, limit = 50) {
  return useQuery({
    queryKey: ["activity_log", projectId, limit],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as ActivityLog[]
    },
    enabled: !!projectId,
  })
}
