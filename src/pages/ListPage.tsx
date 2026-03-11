import { useState, useMemo } from "react"
import { useTasks, useBulkUpdateTasks, useBulkDeleteTasks } from "@/hooks/useTasks"
import { useLists } from "@/hooks/useLists"
import { useProjects } from "@/hooks/useProjects"
import { useUIStore } from "@/stores/useUIStore"
import type { TaskStatus } from "@/types"
import { TaskDetailPanel } from "@/components/board/TaskDetailPanel"
import { exportTasksToCSV, exportTasksToPrint } from "@/lib/export"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"

import {
  ArrowUpDown, Search, Trash2, CheckCircle2, MoreHorizontal,
  ListTodo, Download, Printer,
} from "lucide-react"
import { format, isPast } from "date-fns"
import { cn } from "@/lib/utils"

type SortKey = "title" | "status" | "priority" | "due_date" | "created_at"
type SortDir = "asc" | "desc"

export default function ListPage() {
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const activeListFilter = useUIStore((s) => s.activeListFilter)
  const setActiveListFilter = useUIStore((s) => s.setActiveListFilter)
  const openTaskId = useUIStore((s) => s.openTaskId)
  const setOpenTaskId = useUIStore((s) => s.setOpenTaskId)
  const selectedTaskIds = useUIStore((s) => s.selectedTaskIds)
  const toggleTaskId = useUIStore((s) => s.toggleTaskId)
  const clearSelection = useUIStore((s) => s.clearSelection)

  const { data: tasks, isLoading: loadingTasks } = useTasks(activeProjectId || "")
  const { data: lists } = useLists(activeProjectId || "")
  const { data: projects } = useProjects()
  const activeProject = projects?.find((p) => p.id === activeProjectId)

  const bulkUpdate = useBulkUpdateTasks()
  const bulkDelete = useBulkDeleteTasks()

  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  // Filter & sort
  const filteredTasks = useMemo(() => {
    if (!tasks) return []
    let filtered = [...tasks]

    // List filter
    if (activeListFilter) {
      filtered = filtered.filter((t) => t.list_id === activeListFilter)
    }

    // Search
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((t) => t.priority === priorityFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      const av = a[sortKey] ?? ""
      const bv = b[sortKey] ?? ""
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })

    return filtered
  }, [tasks, activeListFilter, search, statusFilter, priorityFilter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const allSelected = filteredTasks.length > 0 && filteredTasks.every((t) => selectedTaskIds.includes(t.id))

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection()
    } else {
      filteredTasks.forEach((t) => {
        if (!selectedTaskIds.includes(t.id)) toggleTaskId(t.id)
      })
    }
  }

  const handleBulkStatus = (status: string) => {
    if (!activeProjectId) return
    bulkUpdate.mutate({ taskIds: selectedTaskIds, updates: { status: status as TaskStatus }, projectId: activeProjectId })
    clearSelection()
  }

  const handleBulkDelete = () => {
    if (!activeProjectId) return
    bulkDelete.mutate({ taskIds: selectedTaskIds, projectId: activeProjectId })
    clearSelection()
  }

  const listMap = useMemo(() => {
    const map: Record<string, string> = {}
    lists?.forEach((l) => (map[l.id] = l.name))
    return map
  }, [lists])

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={ListTodo}
        title="No project selected"
        description="Select or create a project to view tasks"
      />
    )
  }

  if (loadingTasks) return <LoadingSkeleton variant="table" />

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">List View</h1>
          <p className="text-sm text-gray-500">{filteredTasks.length} tasks</p>
        </div>
      </div>

      {/* List tabs */}
      {lists && lists.length > 0 && (
        <div className="px-6 pt-3">
          <Tabs
            value={activeListFilter || "all"}
            onValueChange={(v) => setActiveListFilter(v === "all" ? null : v)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              {lists.map((l) => (
                <TabsTrigger key={l.id} value={l.id}>
                  {l.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="pl-9 h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["To Do", "In Progress", "Done", "Blocked"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {["High", "Medium", "Low"].map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => filteredTasks && exportTasksToCSV(filteredTasks, activeProject?.name || "Project")}
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => filteredTasks && exportTasksToPrint(filteredTasks, activeProject?.name || "Project")}
            title="Print Report"
          >
            <Printer className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedTaskIds.length > 0 && (
        <div className="flex items-center gap-3 px-6 py-2 bg-blue-50 border-b border-blue-100">
          <span className="text-sm text-blue-700 font-medium">
            {selectedTaskIds.length} selected
          </span>
          <Button size="sm" variant="outline" onClick={() => handleBulkStatus("Done")}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Done
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkStatus("In Progress")}>
            Mark In Progress
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={handleBulkDelete}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-6">
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="No tasks found"
            description={search ? "Try a different search term" : "Create a task to get started"}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("title")}
                >
                  <div className="flex items-center gap-1">
                    Title
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("priority")}
                >
                  <div className="flex items-center gap-1">
                    Priority
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </TableHead>
                <TableHead>List</TableHead>
                <TableHead>Assignees</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("due_date")}
                >
                  <div className="flex items-center gap-1">
                    Due Date
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const isOverdue =
                  task.due_date &&
                  isPast(new Date(task.due_date)) &&
                  task.status !== "Done"

                return (
                  <TableRow
                    key={task.id}
                    className={cn(
                      "cursor-pointer hover:bg-gray-50",
                      selectedTaskIds.includes(task.id) && "bg-blue-50"
                    )}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedTaskIds.includes(task.id)}
                        onCheckedChange={() => toggleTaskId(task.id)}
                      />
                    </TableCell>
                    <TableCell
                      className="font-medium"
                      onClick={() => setOpenTaskId(task.id)}
                    >
                      <span className="line-clamp-1">{task.title}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          task.status === "Done" && "bg-green-50 text-green-700 border-green-200",
                          task.status === "In Progress" && "bg-amber-50 text-amber-700 border-amber-200",
                          task.status === "Blocked" && "bg-red-50 text-red-700 border-red-200",
                          task.status === "To Do" && "bg-gray-50 text-gray-600 border-gray-200"
                        )}
                      >
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          task.priority === "High" && "bg-red-50 text-red-700 border-red-200",
                          task.priority === "Medium" && "bg-amber-50 text-amber-700 border-amber-200",
                          task.priority === "Low" && "bg-green-50 text-green-700 border-green-200"
                        )}
                      >
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {listMap[task.list_id || ""] || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-1">
                        {task.assignments?.slice(0, 3).map((a) => (
                          <Avatar key={a.member_id} className="w-6 h-6 border-2 border-white">
                            <AvatarFallback className="text-[9px]">
                              {a.members?.name
                                ?.split(" ")
                                .map((n: string) => n[0])
                                .join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.due_date ? (
                        <span
                          className={cn(
                            "text-sm",
                            isOverdue ? "text-red-500 font-medium" : "text-gray-500"
                          )}
                        >
                          {format(new Date(task.due_date), "MMM d")}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setOpenTaskId(task.id)}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Task Detail Panel */}
      <TaskDetailPanel
        taskId={openTaskId}
        projectId={activeProjectId}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  )
}
