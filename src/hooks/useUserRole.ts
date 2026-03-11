import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/useAuthStore"
import type { MemberRole } from "@/types"

export function useUserRole(projectId: string | null) {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ["user-role", projectId, user?.id],
    queryFn: async (): Promise<MemberRole | null> => {
      if (!projectId || !user) return null

      const { data, error } = await supabase
        .from("members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .maybeSingle()

      if (error) throw error
      return (data?.role as MemberRole) ?? null
    },
    enabled: !!projectId && !!user,
  })
}
