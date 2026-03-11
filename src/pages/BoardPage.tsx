import { useState, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useUIStore } from "@/stores/useUIStore"
import { useTasks, useMoveTask } from "@/hooks/useTasks"
import { useLists } from "@/hooks/useLists"
import { useUserRole } from "@/hooks/useUserRole"
import { canEdit } from "@/lib/permissions"
import { BoardColumn } from "@/components/board/BoardColumn"
import { TaskCard } from "@/components/board/TaskCard"
import { TaskDetailPanel } from "@/components/board/TaskDetailPanel"
import { AddListButton } from "@/components/board/AddListButton"
import { BoardSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Kanban } from "lucide-react"
import type { Task } from "@/types"

export default function BoardPage() {
  const { activeProjectId, openTaskId, setOpenTaskId, activeListFilter, setActiveListFilter } = useUIStore()
  const { data: tasks, isLoading: tasksLoading } = useTasks(activeProjectId)
  const { data: lists, isLoading: listsLoading } = useLists(activeProjectId)
  const moveTask = useMoveTask()
  const { data: userRole } = useUserRole(activeProjectId)
  const userCanEdit = canEdit(userRole)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const filteredLists = useMemo(() => {
    if (!lists) return []
    if (!activeListFilter) return lists
    return lists.filter((l) => l.id === activeListFilter)
  }, [lists, activeListFilter])

  const tasksByList = useMemo(() => {
    const map: Record<string, Task[]> = {}
    if (!tasks || !lists) return map
    for (const list of lists) {
      map[list.id] = tasks
        .filter((t) => t.list_id === list.id)
        .sort((a, b) => a.position - b.position)
    }
    return map
  }, [tasks, lists])

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks?.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    if (!userCanEdit) return
    const { active, over } = event
    if (!over || !activeProjectId) return

    const taskId = active.id as string
    const task = tasks?.find((t) => t.id === taskId)
    if (!task) return

    // Determine target list
    let targetListId = over.id as string
    // If dropped on a task, find that task's list
    const overTask = tasks?.find((t) => t.id === over.id)
    if (overTask) {
      targetListId = overTask.list_id || targetListId
    }

    // Check if target is a list
    const targetList = lists?.find((l) => l.id === targetListId)
    if (!targetList) return

    const targetTasks = tasksByList[targetListId] || []
    const newPosition = overTask
      ? overTask.position
      : targetTasks.length

    // Map list name to default status
    const statusMap: Record<string, string> = {
      "Info": "To Do",
      "Planning": "To Do",
      "Mentor Team": "To Do",
      "Training Schedule": "In Progress",
      "Tasks": "In Progress",
    }
    const newStatus = task.list_id !== targetListId
      ? statusMap[targetList.name] || task.status
      : undefined

    moveTask.mutate({
      taskId,
      listId: targetListId,
      position: newPosition,
      projectId: activeProjectId,
      status: newStatus,
    })
  }

  if (tasksLoading || listsLoading) return <BoardSkeleton />

  if (!lists || lists.length === 0) {
    return (
      <EmptyState
        icon={Kanban}
        title="No lists yet"
        description="Create your first list to start organizing tasks on the board."
        action={<AddListButton projectId={activeProjectId!} />}
      />
    )
  }

  return (
    <div className="h-full">
      {/* List filter tabs - matching the screenshot */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
        <Button
          variant="ghost"
          size="sm"
          className={`text-sm ${!activeListFilter ? 'text-blue-600 border-b-2 border-blue-600 rounded-none' : 'text-gray-500'}`}
          onClick={() => setActiveListFilter(null)}
        >
          All
        </Button>
        {lists.map((list) => (
          <Button
            key={list.id}
            variant="ghost"
            size="sm"
            className={`text-sm ${activeListFilter === list.id ? 'text-blue-600 border-b-2 border-blue-600 rounded-none' : 'text-gray-500'}`}
            onClick={() => setActiveListFilter(list.id)}
          >
            {list.name}
          </Button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100%-48px)]">
          <SortableContext
            items={filteredLists.map((l) => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            {filteredLists.map((list) => (
              <BoardColumn
                key={list.id}
                list={list}
                tasks={tasksByList[list.id] || []}
                projectId={activeProjectId!}
                editable={userCanEdit}
              />
            ))}
          </SortableContext>

          {!activeListFilter && userCanEdit && (
            <div className="flex-shrink-0 w-[300px]">
              <AddListButton projectId={activeProjectId!} />
            </div>
          )}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 opacity-90">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task detail side panel */}
      <TaskDetailPanel
        taskId={openTaskId}
        projectId={activeProjectId!}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  )
}
