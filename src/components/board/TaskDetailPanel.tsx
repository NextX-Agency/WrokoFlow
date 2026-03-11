import { useState, useRef } from "react"
import { useTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks"
import { useMembers, useTaskAssignments } from "@/hooks/useMembers"
import { useLabels, useTaskLabels } from "@/hooks/useLabels"
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/useComments"
import { useAttachments, useUploadAttachment, useDeleteAttachment } from "@/hooks/useAttachments"
import { useActivityLog } from "@/hooks/useActivityLog"
import { useLists } from "@/hooks/useLists"
import { useAuthStore } from "@/stores/useAuthStore"
import { useUserRole } from "@/hooks/useUserRole"
import { canEdit as canEditFn, canComment as canCommentFn } from "@/lib/permissions"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { Calendar } from "@/components/ui/calendar"

import {
  Trash2, Calendar as CalendarIcon, User, Tag, Paperclip,
  MessageSquare, Clock, Send, Download,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface TaskDetailPanelProps {
  taskId: string | null
  projectId: string
  onClose: () => void
}

export function TaskDetailPanel({ taskId, projectId, onClose }: TaskDetailPanelProps) {
  const { data: task } = useTask(taskId || "")
  const { data: members } = useMembers(projectId)
  const { data: labels } = useLabels(projectId)
  const { data: lists } = useLists(projectId)
  const { data: comments } = useComments(taskId || "")
  const { data: attachments } = useAttachments(taskId || "")
  const { data: activities } = useActivityLog(projectId, 20)

  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { assign, unassign } = useTaskAssignments()
  const { addLabel, removeLabel } = useTaskLabels()
  const createComment = useCreateComment()
  const deleteComment = useDeleteComment()
  const uploadAttachment = useUploadAttachment()
  const deleteAttachment = useDeleteAttachment()

  const user = useAuthStore((s) => s.user)
  const { data: userRole } = useUserRole(projectId)
  const editable = canEditFn(userRole)
  const commentable = canCommentFn(userRole)

  const [editTitle, setEditTitle] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [editDesc, setEditDesc] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Sync state when task loads
  const prevId = useRef<string | null>(null)
  if (task && task.id !== prevId.current) {
    prevId.current = task.id
    setTitle(task.title)
    setDescription(task.description || "")
  }

  if (!taskId) return null

  const handleTitleSave = () => {
    if (title.trim() && title !== task?.title) {
      updateTask.mutate({ id: taskId, title: title.trim(), projectId })
    }
    setEditTitle(false)
  }

  const handleDescSave = () => {
    if (description !== (task?.description || "")) {
      updateTask.mutate({ id: taskId, description, projectId })
    }
    setEditDesc(false)
  }

  const handleStatusChange = (status: string) => {
    updateTask.mutate({ id: taskId, status, projectId })
  }

  const handlePriorityChange = (priority: string) => {
    updateTask.mutate({ id: taskId, priority, projectId })
  }

  const handleListChange = (list_id: string) => {
    updateTask.mutate({ id: taskId, list_id, projectId })
  }

  const handleDueDateChange = (date: Date | undefined) => {
    updateTask.mutate({
      id: taskId,
      due_date: date ? date.toISOString().split("T")[0] : null,
      projectId,
    })
  }

  const handleToggleAssignee = (memberId: string) => {
    const isAssigned = task?.assignments?.some((a) => a.member_id === memberId)
    if (isAssigned) {
      unassign.mutate({ taskId, memberId, projectId })
    } else {
      assign.mutate({ taskId, memberId, projectId })
    }
  }

  const handleToggleLabel = (labelId: string) => {
    const hasLabel = task?.labels?.some((l) => l.label_id === labelId)
    if (hasLabel) {
      removeLabel.mutate({ taskId, labelId, projectId })
    } else {
      addLabel.mutate({ taskId, labelId, projectId })
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || !user) return
    await createComment.mutateAsync({
      task_id: taskId,
      author_id: user.id,
      body: commentText.trim(),
    })
    setCommentText("")
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    try {
      await uploadAttachment.mutateAsync({
        task_id: taskId,
        uploaded_by: user.id,
        file,
        projectId,
      })
      toast.success("File uploaded")
    } catch {
      toast.error("Upload failed")
    }
  }

  const handleDelete = async () => {
    await deleteTask.mutateAsync({ id: taskId, projectId })
    setDeleteOpen(false)
    onClose()
    toast.success("Task deleted")
  }

  const taskActivities = activities?.filter(
    (a) => a.entity_type === "task" && a.entity_id === taskId
  )

  return (
    <Sheet open={!!taskId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-[540px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            {editTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
                className="text-lg font-semibold"
                autoFocus
              />
            ) : (
              <SheetTitle
                className={cn(
                  "text-lg font-semibold pr-4",
                  editable && "cursor-pointer hover:text-blue-600"
                )}
                onClick={() => editable && setEditTitle(true)}
              >
                {task?.title || "Loading..."}
              </SheetTitle>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">
            {/* Detail fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Status</label>
                <Select value={task?.status || "To Do"} onValueChange={handleStatusChange} disabled={!editable}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["To Do", "In Progress", "Done", "Blocked"].map((s) => (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                s === "To Do" ? "#9ca3af" :
                                s === "In Progress" ? "#f59e0b" :
                                s === "Done" ? "#22c55e" : "#ef4444",
                            }}
                          />
                          {s}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Priority</label>
                <Select value={task?.priority || "Medium"} onValueChange={handlePriorityChange} disabled={!editable}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["High", "Medium", "Low"].map((p) => (
                      <SelectItem key={p} value={p}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                p === "High" ? "#ef4444" :
                                p === "Medium" ? "#f59e0b" : "#22c55e",
                            }}
                          />
                          {p}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* List */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">List</label>
                <Select value={task?.list_id || ""} onValueChange={handleListChange} disabled={!editable}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select list" />
                  </SelectTrigger>
                  <SelectContent>
                    {lists?.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Due Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 w-full justify-start text-left font-normal",
                        !task?.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {task?.due_date
                        ? format(new Date(task.due_date), "MMM d, yyyy")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={task?.due_date ? new Date(task.due_date) : undefined}
                      onSelect={handleDueDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Assignees */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Assignees
              </label>
              <div className="flex flex-wrap gap-2">
                {members?.map((m) => {
                  const isAssigned = task?.assignments?.some(
                    (a) => a.member_id === m.id
                  )
                  return (
                    <button
                      key={m.id}
                      onClick={() => editable && handleToggleAssignee(m.id)}
                      disabled={!editable}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors",
                        isAssigned
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                      )}
                    >
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[9px]">
                          {m.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {m.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Labels
              </label>
              <div className="flex flex-wrap gap-2">
                {labels?.map((l) => {
                  const hasLabel = task?.labels?.some((tl) => tl.label_id === l.id)
                  return (
                    <button
                      key={l.id}
                      onClick={() => editable && handleToggleLabel(l.id)}
                      disabled={!editable}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors",
                        hasLabel
                          ? "ring-2 ring-offset-1"
                          : "opacity-60 hover:opacity-100"
                      )}
                      style={{
                        backgroundColor: `${l.color}20`,
                        borderColor: l.color,
                        color: l.color,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      {l.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                Description
              </label>
              {editDesc ? (
                <div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[100px] text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={handleDescSave}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditDesc(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => editable && setEditDesc(true)}
                  className={cn(
                    "min-h-[60px] p-3 rounded-md border border-gray-200 text-sm text-gray-600",
                    editable && "cursor-text hover:border-gray-300"
                  )}
                >
                  {task?.description || (
                    <span className="text-gray-400">Click to add description...</span>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Tabs: Comments / Attachments / Activity */}
            <Tabs defaultValue="comments">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="comments" className="text-xs">
                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                  Comments {comments?.length ? `(${comments.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="attachments" className="text-xs">
                  <Paperclip className="w-3.5 h-3.5 mr-1" />
                  Files {attachments?.length ? `(${attachments.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Activity
                </TabsTrigger>
              </TabsList>

              {/* Comments tab */}
              <TabsContent value="comments" className="space-y-3 mt-3">
                {commentable && (
                  <div className="flex gap-2">
                    <Input
                      data-cy="comment-input"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                      placeholder="Write a comment..."
                      className="text-sm"
                    />
                    <Button
                      data-cy="comment-submit"
                      size="icon"
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || createComment.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {comments?.map((c) => (
                  <div key={c.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {c.author_id?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">
                          {c.author_id?.slice(0, 8)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">
                            {format(new Date(c.created_at), "MMM d, h:mm a")}
                          </span>
                          {c.author_id === user?.id && (
                            <button                              data-cy="comment-delete"                              onClick={() => deleteComment.mutate({ id: c.id, taskId })}
                              className="text-gray-300 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{c.body}</p>
                    </div>
                  </div>
                ))}
                {(!comments || comments.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
                )}
              </TabsContent>

              {/* Attachments tab */}
              <TabsContent value="attachments" className="space-y-3 mt-3">
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                {editable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadAttachment.isPending}
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    {uploadAttachment.isPending ? "Uploading..." : "Attach File"}
                  </Button>
                )}
                {attachments?.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {a.file_name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {(a.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        asChild
                      >
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600"
                        onClick={() =>
                          deleteAttachment.mutate({
                            id: a.id,
                            file_url: a.file_url,
                            taskId,
                          })
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!attachments || attachments.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No files attached</p>
                )}
              </TabsContent>

              {/* Activity tab */}
              <TabsContent value="activity" className="space-y-2 mt-3">
                {taskActivities?.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0"
                  >
                    <Clock className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-600">{a.description}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {format(new Date(a.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
                {(!taskActivities || taskActivities.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
          {editable ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <span className="text-[10px] text-gray-400">
            Created {task?.created_at ? format(new Date(task.created_at), "MMM d, yyyy") : "—"}
          </span>
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this task?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The task and all its data will be
                permanently deleted.
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
      </SheetContent>
    </Sheet>
  )
}
