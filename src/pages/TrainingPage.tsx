import { useState } from "react"
import {
  useTrainings,
  useCreateTraining,
  useUpdateTraining,
  useDeleteTraining,
} from "@/hooks/useTrainings"
import { useMembers } from "@/hooks/useMembers"
import { useProjects } from "@/hooks/useProjects"
import { useUIStore } from "@/stores/useUIStore"

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"

import { Plus, Pencil, Trash2, GraduationCap, Calendar, Download } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { GoogleCalendarSync } from "@/components/shared/GoogleCalendarSync"
import { exportTrainingsToCSV } from "@/lib/export"

const PLATFORMS = ["Zoom", "Google Meet", "Microsoft Teams", "In-Person", "Recorded"]

export default function TrainingPage() {
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const { data: trainings, isLoading } = useTrainings(activeProjectId || "")
  const { data: members } = useMembers(activeProjectId || "")
  const { data: projects } = useProjects()
  const activeProject = projects?.find((p) => p.id === activeProjectId)
  const createTraining = useCreateTraining()
  const updateTraining = useUpdateTraining()
  const deleteTraining = useDeleteTraining()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [durationMin, setDurationMin] = useState("60")
  const [platform, setPlatform] = useState("Zoom")
  const [meetingUrl, setMeetingUrl] = useState("")
  const [trainerId, setTrainerId] = useState("")

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setScheduledAt("")
    setDurationMin("60")
    setPlatform("Zoom")
    setMeetingUrl("")
    setTrainerId("")
    setEditId(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (t: any) => {
    setEditId(t.id)
    setTitle(t.title)
    setDescription(t.description || "")
    setScheduledAt(t.scheduled_at ? t.scheduled_at.slice(0, 16) : "")
    setDurationMin(String(t.duration_minutes || 60))
    setPlatform(t.platform || "Zoom")
    setMeetingUrl(t.meeting_url || "")
    setTrainerId(t.trainer_id || "")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!title.trim() || !activeProjectId) return

    const payload = {
      project_id: activeProjectId,
      title: title.trim(),
      description: description.trim() || null,
      scheduled_at: scheduledAt || null,
      duration_minutes: parseInt(durationMin) || 60,
      platform,
      meeting_url: meetingUrl.trim() || null,
      trainer_id: trainerId || null,
    }

    if (editId) {
      await updateTraining.mutateAsync({ id: editId, ...payload })
    } else {
      await createTraining.mutateAsync(payload)
    }

    setDialogOpen(false)
    resetForm()
  }

  const handleDelete = async () => {
    if (!deleteId || !activeProjectId) return
    await deleteTraining.mutateAsync({ id: deleteId, projectId: activeProjectId })
    setDeleteId(null)
  }

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No project selected"
        description="Select a project to manage training schedule"
      />
    )
  }

  if (isLoading) return <LoadingSkeleton variant="table" />

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Training Schedule</h1>
          <p className="text-sm text-gray-500">
            {trainings?.length || 0} sessions scheduled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => trainings && members && exportTrainingsToCSV(trainings, members, activeProject?.name || "Project")}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Training
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
        {!trainings || trainings.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No training sessions"
            description="Schedule your first training session to get started"
            action={{ label: "Add Training", onClick: openCreate }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Calendar</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainings.map((t) => {
                const trainerName = members?.find((m) => m.id === t.trainer_id)?.name
                const isPast = t.scheduled_at && new Date(t.scheduled_at) < new Date()

                return (
                  <TableRow key={t.id} className={cn(isPast && "opacity-60")}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{t.title}</p>
                        {t.description && (
                          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                            {t.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {t.scheduled_at ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {format(new Date(t.scheduled_at), "MMM d, yyyy h:mm a")}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {t.duration_minutes} min
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t.platform || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {trainerName || "—"}
                    </TableCell>
                    <TableCell>
                      <GoogleCalendarSync
                        training={t}
                        projectId={activeProjectId!}
                        projectName={activeProject?.name || "Project"}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {t.meeting_url && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={t.meeting_url} target="_blank" rel="noopener noreferrer">
                              🔗
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600"
                          onClick={() => setDeleteId(t.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Training" : "New Training"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Date & Time</label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Duration (min)</label>
                <Input
                  type="number"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Platform</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Trainer</label>
                <Select value={trainerId} onValueChange={setTrainerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Meeting URL</label>
              <Input
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete training session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
