import { useMemo } from "react"
import { useMembers } from "@/hooks/useMembers"
import { useTrainings } from "@/hooks/useTrainings"
import { useAttendance, useUpsertAttendance } from "@/hooks/useAttendance"
import { useUIStore } from "@/stores/useUIStore"

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { ScrollArea } from "@/components/ui/scroll-area"

import { UserCheck } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const statusCycle = ["P", "A", "L", null] as const
type AttStatus = "P" | "A" | "L" | null

const statusLabel: Record<string, string> = {
  P: "Present",
  A: "Absent",
  L: "Late",
}

const statusStyle: Record<string, string> = {
  P: "bg-green-100 text-green-700 hover:bg-green-200",
  A: "bg-red-100 text-red-700 hover:bg-red-200",
  L: "bg-amber-100 text-amber-700 hover:bg-amber-200",
}

export default function AttendancePage() {
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const { data: members, isLoading: loadingMembers } = useMembers(activeProjectId || "")
  const { data: trainings, isLoading: loadingTrainings } = useTrainings(activeProjectId || "")
  const { data: attendance, isLoading: loadingAttendance } = useAttendance(activeProjectId || "")
  const upsertAttendance = useUpsertAttendance()

  // Build lookup: `${memberId}-${trainingId}` -> status
  const attendanceMap = useMemo(() => {
    const map: Record<string, string> = {}
    attendance?.forEach((a) => {
      map[`${a.member_id}-${a.training_id}`] = a.status
    })
    return map
  }, [attendance])

  const handleCellClick = (memberId: string, trainingId: string) => {
    if (!activeProjectId) return
    const key = `${memberId}-${trainingId}`
    const current = attendanceMap[key] as AttStatus | undefined
    const currentIdx = statusCycle.indexOf(current ?? null)
    const next = statusCycle[(currentIdx + 1) % statusCycle.length]

    if (next === null) {
      upsertAttendance.mutate({ memberId, trainingId, status: null, projectId: activeProjectId })
    } else {
      upsertAttendance.mutate({
        memberId,
        trainingId,
        status: next,
        projectId: activeProjectId,
      })
    }
  }

  // Stats per member
  const memberStats = useMemo(() => {
    if (!members || !trainings) return {}
    const stats: Record<string, { P: number; A: number; L: number; total: number }> = {}
    members.forEach((m) => {
      stats[m.id] = { P: 0, A: 0, L: 0, total: trainings.length }
      trainings.forEach((t) => {
        const s = attendanceMap[`${m.id}-${t.id}`]
        if (s === "P") stats[m.id].P++
        if (s === "A") stats[m.id].A++
        if (s === "L") stats[m.id].L++
      })
    })
    return stats
  }, [members, trainings, attendanceMap])

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={UserCheck}
        title="No project selected"
        description="Select a project to manage attendance"
      />
    )
  }

  if (loadingMembers || loadingTrainings || loadingAttendance) {
    return <LoadingSkeleton variant="table" />
  }

  if (!trainings?.length || !members?.length) {
    return (
      <EmptyState
        icon={UserCheck}
        title="No data to display"
        description="Add team members and training sessions first"
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500">
            Click cells to cycle: Present → Absent → Late → Clear
          </p>
        </div>
        <div className="flex items-center gap-3">
          {Object.entries(statusStyle).map(([key, style]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold", style)}>
                {key}
              </span>
              {statusLabel[key]}
            </div>
          ))}
        </div>
      </div>

      {/* Attendance Grid */}
      <ScrollArea className="flex-1">
        <div className="px-4 sm:px-6 py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-white z-10 min-w-[160px]">
                  Member
                </TableHead>
                {trainings.map((t) => (
                  <TableHead key={t.id} className="text-center min-w-[80px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <p className="text-xs font-medium truncate max-w-[80px]">
                            {t.title}
                          </p>
                          {t.scheduled_at && (
                            <p className="text-[10px] text-gray-400">
                              {format(new Date(t.scheduled_at), "MMM d")}
                            </p>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{t.title}</p>
                        {t.scheduled_at && (
                          <p className="text-xs">
                            {format(new Date(t.scheduled_at), "MMM d, yyyy h:mm a")}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[60px]">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const stats = memberStats[m.id]
                const attendanceRate =
                  stats && stats.total > 0
                    ? Math.round(((stats.P + stats.L) / stats.total) * 100)
                    : 0

                return (
                  <TableRow key={m.id}>
                    <TableCell className="sticky left-0 bg-white z-10 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                          {m.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <span className="text-sm">{m.name}</span>
                      </div>
                    </TableCell>
                    {trainings.map((t) => {
                      const key = `${m.id}-${t.id}`
                      const status = attendanceMap[key]
                      return (
                        <TableCell key={t.id} className="text-center p-1">
                          <button
                            onClick={() => handleCellClick(m.id, t.id)}
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-colors cursor-pointer",
                              status && statusStyle[status],
                              !status && "bg-gray-50 text-gray-300 hover:bg-gray-100"
                            )}
                          >
                            {status || "—"}
                          </button>
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          attendanceRate >= 80 && "bg-green-50 text-green-700",
                          attendanceRate >= 50 && attendanceRate < 80 && "bg-amber-50 text-amber-700",
                          attendanceRate < 50 && "bg-red-50 text-red-700"
                        )}
                      >
                        {attendanceRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  )
}
