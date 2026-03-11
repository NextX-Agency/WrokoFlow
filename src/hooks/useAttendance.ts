import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Attendance, AttendanceStatus } from "@/types"
import { toast } from "sonner"

export function useAttendance(projectId: string | null) {
  return useQuery({
    queryKey: ["attendance", projectId],
    queryFn: async () => {
      if (!projectId) return []
      // Get all attendance records for trainings in this project
      const { data: trainings } = await supabase
        .from("trainings")
        .select("id")
        .eq("project_id", projectId)
      if (!trainings) return []

      const trainingIds = trainings.map((t) => t.id)
      if (trainingIds.length === 0) return []

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .in("training_id", trainingIds)
      if (error) throw error
      return data as Attendance[]
    },
    enabled: !!projectId,
  })
}

export function useUpsertAttendance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      memberId,
      trainingId,
      status,
      projectId,
    }: {
      memberId: string
      trainingId: string
      status: AttendanceStatus | null
      projectId: string
    }) => {
      if (status === null) {
        // Delete the record
        const { error } = await supabase
          .from("attendance")
          .delete()
          .eq("member_id", memberId)
          .eq("training_id", trainingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("attendance")
          .upsert(
            { member_id: memberId, training_id: trainingId, status },
            { onConflict: "member_id,training_id" }
          )
        if (error) throw error
      }
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["attendance", projectId] })
    },
    onError: (error) => {
      toast.error(`Failed to update attendance: ${error.message}`)
    },
  })
}

export function useClearAttendance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      trainingId,
      projectId,
    }: {
      trainingId: string
      projectId: string
    }) => {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("training_id", trainingId)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["attendance", projectId] })
      toast.success("Attendance cleared")
    },
    onError: (error) => {
      toast.error(`Failed to clear attendance: ${error.message}`)
    },
  })
}
