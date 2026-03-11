import { useState, memo } from "react"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import type { List, Task } from "@/types"
import { TaskCard } from "./TaskCard"
import { useCreateTask } from "@/hooks/useTasks"
import { useUpdateList, useDeleteList } from "@/hooks/useLists"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react"

interface BoardColumnProps {
  list: List
  tasks: Task[]
  projectId: string
  editable?: boolean
}

export const BoardColumn = memo(function BoardColumn({ list, tasks, projectId, editable = true }: BoardColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(list.name)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const createTask = useCreateTask()
  const updateList = useUpdateList()
  const deleteList = useDeleteList()

  const { setNodeRef } = useDroppable({ id: list.id })

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
  } = useSortable({ id: list.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return
    await createTask.mutateAsync({
      project_id: projectId,
      list_id: list.id,
      title: newTaskTitle.trim(),
      position: tasks.length,
    })
    setNewTaskTitle("")
    setIsAddingTask(false)
  }

  const handleRename = async () => {
    if (editName.trim() && editName !== list.name) {
      await updateList.mutateAsync({ id: list.id, name: editName.trim() })
    }
    setIsEditingName(false)
  }

  const handleDelete = async () => {
    await deleteList.mutateAsync({ id: list.id, projectId })
    setDeleteOpen(false)
  }

  // Determine status colors for counter
  const statusCounts: Record<string, number> = {}
  tasks.forEach((t) => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
  })

  return (
    <div
      ref={setSortableRef}
      style={style}
      className="w-[300px] flex-shrink-0 flex flex-col max-h-full"
    >
      {/* Column Header */}
      <div
        className="flex items-center justify-between px-2 py-3 mb-2"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="h-7 text-sm font-semibold w-32"
              autoFocus
            />
          ) : (
            <h3 className="text-sm font-semibold text-gray-900">{list.name}</h3>
          )}
          <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-500">
            {tasks.length}
          </Badge>
        </div>

        {editable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditingName(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Task cards */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={setNodeRef} className="space-y-2.5 px-1 pb-2 min-h-[60px]">
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>

      {/* Add task */}
      {editable && (isAddingTask ? (
        <div className="mt-2 px-1">
          <Input
            data-cy="new-task-input"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTask()
              if (e.key === "Escape") setIsAddingTask(false)
            }}
            placeholder="Task title..."
            className="text-sm"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleAddTask} disabled={createTask.isPending}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAddingTask(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          data-cy="add-task-btn"
          data-list-id={list.id}
          onClick={() => setIsAddingTask(true)}
          className="flex items-center gap-2 w-full mt-2 px-3 py-2.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-dashed border-gray-200"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      ))}

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{list.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the list. Tasks in this list will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})
