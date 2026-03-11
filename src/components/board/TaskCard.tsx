import { memo } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Task } from "@/types"
import { STATUS_COLORS } from "@/types"
import { useUIStore } from "@/stores/useUIStore"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Calendar, MessageSquare, Paperclip, Flag } from "lucide-react"
import { format, isPast, isToday } from "date-fns"
import { cn } from "@/lib/utils"

interface TaskCardProps {
  task: Task
}

export const TaskCard = memo(function TaskCard({ task }: TaskCardProps) {
  const setOpenTaskId = useUIStore((s) => s.setOpenTaskId)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue =
    task.due_date && isPast(new Date(task.due_date)) && task.status !== "Done"
  const isDueToday = task.due_date && isToday(new Date(task.due_date))

  const priorityConfig: Record<string, { icon: string; color: string }> = {
    High: { icon: "↑", color: "text-red-500" },
    Medium: { icon: "→", color: "text-amber-500" },
    Low: { icon: "↓", color: "text-green-500" },
  }

  const p = priorityConfig[task.priority]

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-cy="task-card"
      data-task-id={task.id}
      onClick={() => setOpenTaskId(task.id)}
      className={cn(
        "group bg-white rounded-xl border border-[#E4DDD2] p-3 cursor-pointer",
        "hover:border-[#B07C4F]/40 hover:shadow-sm transition-all",
        isDragging && "opacity-50 shadow-lg ring-2 ring-[#B07C4F]/40"
      )}
    >
      {/* Labels row */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 4).map((tl) => (
            <span
              key={tl.label_id}
              className="inline-block h-1.5 w-8 rounded-full"
              style={{ backgroundColor: tl.labels?.color || "#94a3b8" }}
            />
          ))}
          {task.labels.length > 4 && (
            <span className="text-[10px] text-gray-400">
              +{task.labels.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-[#2D2A26] leading-snug mb-1.5 line-clamp-2">
        {task.title}
      </p>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-[#A09890] line-clamp-1 mb-2">
          {task.description}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          {/* Priority */}
          {p && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn("text-xs font-bold", p.color)}>
                  <Flag className="w-3 h-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent>{task.priority} priority</TooltipContent>
            </Tooltip>
          )}

          {/* Due date */}
          {task.due_date && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  data-cy="due-date-badge"
                  data-overdue={isOverdue ? "true" : "false"}
                  className={cn(
                    "flex items-center gap-1 text-[11px]",
                    isOverdue
                      ? "text-red-500 font-medium"
                      : isDueToday
                      ? "text-amber-500 font-medium"
                      : "text-gray-400"
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  {format(new Date(task.due_date), "MMM d")}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {isOverdue
                  ? "Overdue"
                  : isDueToday
                  ? "Due today"
                  : `Due ${format(new Date(task.due_date), "MMM d, yyyy")}`}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Comment count */}
          {task.comment_count && task.comment_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <MessageSquare className="w-3 h-3" />
              {task.comment_count}
            </span>
          )}

          {/* Attachment count */}
          {task.attachment_count && task.attachment_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Paperclip className="w-3 h-3" />
              {task.attachment_count}
            </span>
          )}
        </div>

        {/* Assignees */}
        {task.assignments && task.assignments.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignments.slice(0, 3).map((a) => (
              <Tooltip key={a.member_id}>
                <TooltipTrigger asChild>
                  <Avatar className="w-6 h-6 border-2 border-white">
                    <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                      {a.members?.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{a.members?.name}</TooltipContent>
              </Tooltip>
            ))}
            {task.assignments.length > 3 && (
              <Avatar className="w-6 h-6 border-2 border-white">
                <AvatarFallback className="text-[10px] bg-gray-100 text-gray-500">
                  +{task.assignments.length - 3}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
      </div>

      {/* Status badge at bottom */}
      <div className="mt-2">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0",
            STATUS_COLORS[task.status]?.text
          )}
        >
          <span
            className={cn("w-1.5 h-1.5 rounded-full mr-1 inline-block", STATUS_COLORS[task.status]?.dot)}
          />
          {task.status}
        </Badge>
      </div>
    </div>
  )
})
