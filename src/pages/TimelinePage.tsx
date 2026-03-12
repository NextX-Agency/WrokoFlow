import { useMemo, useState, useCallback } from "react"
import { type Task as GanttTask, ViewMode, Gantt } from "gantt-task-react"
import "gantt-task-react/dist/index.css"
import { useTasks, useUpdateTask } from "@/hooks/useTasks"
import { useLists } from "@/hooks/useLists"
import { useUIStore } from "@/stores/useUIStore"
import { TaskDetailPanel } from "@/components/board/TaskDetailPanel"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GanttChart } from "lucide-react"
import { addDays } from "date-fns"

const statusGanttColor: Record<string, string> = {
  "To Do": "#9ca3af",
  "In Progress": "#3b82f6",
  Done: "#22c55e",
  Blocked: "#ef4444",
}

export default function TimelinePage() {
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const openTaskId = useUIStore((s) => s.openTaskId)
  const setOpenTaskId = useUIStore((s) => s.setOpenTaskId)

  const { data: tasks, isLoading } = useTasks(activeProjectId || "")
  const { data: lists } = useLists(activeProjectId || "")
  const updateTask = useUpdateTask()

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week)

  const ganttTasks: GanttTask[] = useMemo(() => {
    if (!tasks || !lists) return []

    const listNames: Record<string, string> = {}
    lists.forEach((l) => (listNames[l.id] = l.name))

    return tasks
      .filter((t) => t.due_date)
      .map((t) => {
        const end = new Date(t.due_date!)
        const start = t.start_date ? new Date(t.start_date) : addDays(end, -3)
        return {
          id: t.id,
          name: t.title,
          start: start > end ? addDays(end, -1) : start,
          end,
          progress: t.status === "Done" ? 100 : t.status === "In Progress" ? 50 : 0,
          type: "task" as const,
          project: listNames[t.list_id || ""] || "Unassigned",
          styles: {
            backgroundColor: statusGanttColor[t.status] || "#3b82f6",
            backgroundSelectedColor: statusGanttColor[t.status] || "#2563eb",
            progressColor: "#22c55e",
            progressSelectedColor: "#16a34a",
          },
        }
      })
  }, [tasks, lists])

  const handleTaskChange = useCallback(
    (task: GanttTask) => {
      if (!activeProjectId) return
      updateTask.mutate({
        id: task.id,
        due_date: task.end.toISOString().split("T")[0],
        projectId: activeProjectId,
      })
    },
    [activeProjectId, updateTask]
  )

  const handleTaskClick = useCallback(
    (task: GanttTask) => {
      setOpenTaskId(task.id)
    },
    [setOpenTaskId]
  )

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={GanttChart}
        title="No project selected"
        description="Select a project to view the timeline"
      />
    )
  }

  if (isLoading) return <LoadingSkeleton variant="board" />

  if (ganttTasks.length === 0) {
    return (
      <EmptyState
        icon={GanttChart}
        title="No timeline data"
        description="Tasks need due dates to appear on the timeline"
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Timeline</h1>
          <p className="text-sm text-gray-500">
            {ganttTasks.length} tasks on timeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <SelectTrigger className="w-28 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ViewMode.Day}>Day</SelectItem>
              <SelectItem value={ViewMode.Week}>Week</SelectItem>
              <SelectItem value={ViewMode.Month}>Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={handleTaskChange}
          onClick={handleTaskClick}
          listCellWidth=""
          columnWidth={viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 150 : 60}
          barCornerRadius={6}
          fontSize="12"
          rowHeight={42}
          headerHeight={50}
        />
      </div>

      <TaskDetailPanel
        taskId={openTaskId}
        projectId={activeProjectId}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  )
}
