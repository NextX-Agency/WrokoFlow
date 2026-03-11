import { useState } from "react"
import { useUIStore } from "@/stores/useUIStore"
import type { Project } from "@/types"
import { Button } from "@/components/ui/button"
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
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { CreateProjectDialog } from "./CreateProjectDialog"
import { useDeleteProject } from "@/hooks/useProjects"
import { useAuthStore } from "@/stores/useAuthStore"

interface ProjectSwitcherProps {
  projects: Project[]
}

export function ProjectSwitcher({ projects }: ProjectSwitcherProps) {
  const { activeProjectId, setActiveProjectId } = useUIStore()
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)
  const deleteProject = useDeleteProject()
  const currentUserId = useAuthStore((s) => s.user?.id)

  const activeProject = projects.find((p) => p.id === activeProjectId)

  // Auto-select first project if none active
  if (!activeProjectId && projects.length > 0) {
    setActiveProjectId(projects[0].id)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            data-cy="project-switcher-trigger"
            variant="outline"
            className="h-8 gap-2 px-3 border-[#E4DDD2] bg-white hover:bg-[#F5F3F0] rounded-xl"
          >
            {activeProject && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: activeProject.color }}
              />
            )}
            <span className="text-sm font-medium text-[#4A4540] truncate max-w-[160px]">
              {activeProject?.name || "Select Project"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#A09890] flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-2" align="start">
          <div className="space-y-1">
            {projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "group flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm transition-all",
                  project.id === activeProjectId
                    ? "bg-[#B07C4F]/10 text-[#B07C4F]"
                    : "text-[#4A4540] hover:bg-[#F0EBE3]"
                )}
              >
                <button
                  data-cy="project-item"
                  data-project-id={project.id}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  onClick={() => {
                    setActiveProjectId(project.id)
                    setOpen(false)
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate flex-1">{project.name}</span>
                  {project.id === activeProjectId && (
                    <Check className="w-4 h-4 text-[#B07C4F] flex-shrink-0" />
                  )}
                </button>
                {project.owner_id === currentUserId && (
                  <button
                    data-cy="delete-project-btn"
                    data-project-id={project.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpen(false)
                      setDeleteItem({ id: project.id, name: project.name })
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 hover:text-red-600 text-[#A09890] transition-all flex-shrink-0"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-[#E4DDD2] mt-2 pt-2">
            <button
              data-cy="new-project-btn"
              onClick={() => {
                setOpen(false)
                setCreateOpen(true)
              }}
              className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-[#7A7267] hover:bg-[#F0EBE3] hover:text-[#4A4540] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteItem?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its tasks, lists, and members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-cy="confirm-delete-project"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (!deleteItem) return
                deleteProject.mutate(deleteItem.id, {
                  onSuccess: () => {
                    const { activeProjectId, setActiveProjectId } = useUIStore.getState()
                    if (activeProjectId === deleteItem.id) setActiveProjectId(null)
                    setDeleteItem(null)
                  },
                })
              }}
            >
              {deleteProject.isPending ? "Deleting…" : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
