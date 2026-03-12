import { useMemo, useCallback, useState } from "react"
import { Calendar as BigCalendar, dateFnsLocalizer, type Event, type View } from "react-big-calendar"
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns"
import { enUS } from "date-fns/locale/en-US"
import { useTasks } from "@/hooks/useTasks"
import { useUIStore } from "@/stores/useUIStore"
import { TaskDetailPanel } from "@/components/board/TaskDetailPanel"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import "react-big-calendar/lib/css/react-big-calendar.css"

const locales = { "en-US": enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface TaskEvent extends Event {
  taskId: string
  status: string
  priority: string
}

const statusColor: Record<string, string> = {
  "To Do": "#9ca3af",
  "In Progress": "#f59e0b",
  Done: "#22c55e",
  Blocked: "#ef4444",
}

export default function CalendarPage() {
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const openTaskId = useUIStore((s) => s.openTaskId)
  const setOpenTaskId = useUIStore((s) => s.setOpenTaskId)

  const { data: tasks, isLoading } = useTasks(activeProjectId || "")

  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<View>("month")

  const events: TaskEvent[] = useMemo(() => {
    if (!tasks) return []
    return tasks
      .filter((t) => t.due_date)
      .map((t) => ({
        taskId: t.id,
        title: t.title,
        start: new Date(t.due_date!),
        end: new Date(t.due_date!),
        allDay: true,
        status: t.status,
        priority: t.priority,
      }))
  }, [tasks])

  const handleSelectEvent = useCallback(
    (event: TaskEvent) => {
      setOpenTaskId(event.taskId)
    },
    [setOpenTaskId]
  )

  const handleNavigate = useCallback(
    (direction: "TODAY" | "PREV" | "NEXT") => {
      if (direction === "TODAY") {
        setCurrentDate(new Date())
        return
      }
      setCurrentDate((prev) => {
        if (currentView === "month") {
          return direction === "NEXT" ? addMonths(prev, 1) : subMonths(prev, 1)
        } else if (currentView === "week") {
          return direction === "NEXT" ? addWeeks(prev, 1) : subWeeks(prev, 1)
        } else {
          return direction === "NEXT" ? addDays(prev, 1) : subDays(prev, 1)
        }
      })
    },
    [currentView]
  )

  const dateLabel = useMemo(() => {
    if (currentView === "month") return format(currentDate, "MMMM yyyy")
    if (currentView === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 })
      const end = addDays(start, 6)
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`
    }
    return format(currentDate, "EEEE, MMMM d, yyyy")
  }, [currentDate, currentView])

  const eventStyleGetter = useCallback((event: TaskEvent) => {
    const bg = statusColor[event.status] || "#3b82f6"
    return {
      style: {
        backgroundColor: bg,
        borderRadius: "6px",
        opacity: 0.9,
        color: "white",
        border: "none",
        padding: "2px 6px",
        fontSize: "12px",
      },
    }
  }, [])

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No project selected"
        description="Select a project to view the calendar"
      />
    )
  }

  if (isLoading) return <LoadingSkeleton variant="board" />

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500">
            {events.length} tasks with due dates
          </p>
        </div>
        <div className="flex items-center gap-3">
          {Object.entries(statusColor).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {status}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b bg-[#FAF8F5]">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            data-cy="calendar-today-btn"
            variant="outline"
            size="sm"
            onClick={() => handleNavigate("TODAY")}
            className="h-8 px-3 text-xs font-medium border-[#E4DDD2] text-[#4A4540] hover:bg-[#F0EBE3]"
          >
            Today
          </Button>
          <Button
            data-cy="calendar-prev-btn"
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate("PREV")}
            className="h-8 w-8 text-[#7A7267] hover:bg-[#F0EBE3]"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            data-cy="calendar-next-btn"
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate("NEXT")}
            className="h-8 w-8 text-[#7A7267] hover:bg-[#F0EBE3]"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-[#2D2A26] min-w-[180px]">{dateLabel}</span>
        </div>

        {/* View switcher */}
        <div className="flex items-center bg-[#F0EBE3] rounded-lg p-1 gap-0.5">
          {(["month", "week", "day"] as View[]).map((v) => (
            <button
              key={v}
              data-cy={`calendar-view-${v}`}
              onClick={() => setCurrentView(v)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-all",
                currentView === v
                  ? "bg-white text-[#B07C4F] shadow-sm"
                  : "text-[#7A7267] hover:text-[#4A4540]"
              )}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4 min-h-0 overflow-hidden">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          date={currentDate}
          view={currentView}
          onNavigate={setCurrentDate}
          onView={setCurrentView}
          views={["month", "week", "day"]}
          toolbar={false}
          style={{ height: "100%" }}
          popup
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
