import { useState } from "react"
import { useAuthStore } from "@/stores/useAuthStore"
import { useUpdateTraining } from "@/hooks/useTrainings"
import { useMembers } from "@/hooks/useMembers"
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/googleCalendar"
import type { Training } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Calendar, Check, RefreshCw, Unlink, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface GoogleCalendarSyncProps {
  training: Training
  projectId: string
  projectName: string
}

export function GoogleCalendarSync({ training, projectId, projectName }: GoogleCalendarSyncProps) {
  const { googleAccessToken, signInWithGoogle } = useAuthStore()
  const { data: members } = useMembers(projectId)
  const updateTraining = useUpdateTraining()
  const [syncing, setSyncing] = useState(false)
  const [unlinkOpen, setUnlinkOpen] = useState(false)

  const isSynced = !!training.google_calendar_event_id

  const handleSync = async () => {
    if (!googleAccessToken) {
      toast.info("Please sign in with Google to enable calendar sync")
      signInWithGoogle()
      return
    }

    setSyncing(true)
    try {
      if (isSynced) {
        // Update existing event
        await updateCalendarEvent(
          googleAccessToken,
          training.google_calendar_event_id!,
          training,
          projectName,
          members || []
        )
        toast.success("Calendar event updated")
      } else {
        // Create new event
        const eventId = await createCalendarEvent(
          googleAccessToken,
          training,
          projectName,
          members || []
        )
        // Save event ID to training
        await updateTraining.mutateAsync({
          id: training.id,
          google_calendar_event_id: eventId,
        })
        toast.success("Synced to Google Calendar")
      }
    } catch (error) {
      toast.error(
        `Failed to sync: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    } finally {
      setSyncing(false)
    }
  }

  const handleUnlink = async () => {
    if (!googleAccessToken || !training.google_calendar_event_id) return

    setSyncing(true)
    try {
      await deleteCalendarEvent(googleAccessToken, training.google_calendar_event_id)
      await updateTraining.mutateAsync({
        id: training.id,
        google_calendar_event_id: null,
      })
      toast.success("Unlinked from Google Calendar")
    } catch (error) {
      // Still unlink locally even if Calendar API fails
      await updateTraining.mutateAsync({
        id: training.id,
        google_calendar_event_id: null,
      })
      toast.info("Unlinked locally (calendar event may still exist)")
    } finally {
      setSyncing(false)
      setUnlinkOpen(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isSynced ? (
        <>
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
            <Check className="w-3 h-3" />
            Synced
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleSync}
            disabled={syncing}
            title="Update calendar event"
          >
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-red-500"
            onClick={() => setUnlinkOpen(true)}
            disabled={syncing}
            title="Unlink from calendar"
          >
            <Unlink className="w-3.5 h-3.5" />
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Calendar className="w-3 h-3" />
          )}
          Sync to Calendar
        </Button>
      )}

      {/* Unlink confirmation */}
      <Dialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Unlink Calendar Event</DialogTitle>
            <DialogDescription>
              This will remove the linked Google Calendar event for "{training.title}".
              The event will also be deleted from your Google Calendar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnlink} disabled={syncing}>
              {syncing ? "Unlinking..." : "Unlink & Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
