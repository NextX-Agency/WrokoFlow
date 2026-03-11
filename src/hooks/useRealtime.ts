import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { queryClient } from "@/lib/queryClient"

export function useRealtimeSubscription(projectId: string | null) {
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lists", filter: `project_id=eq.${projectId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["lists", projectId] })
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["comments"] })
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_log", filter: `project_id=eq.${projectId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activity_log", projectId] })
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["attendance", projectId] })
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trainings", filter: `project_id=eq.${projectId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["trainings", projectId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])
}
