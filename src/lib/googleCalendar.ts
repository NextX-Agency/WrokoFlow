import type { Training, Member } from "@/types"

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"

interface CalendarEventBody {
  summary: string
  location?: string
  description?: string
  start: { date: string }
  end: { date: string }
  attendees?: Array<{ email: string }>
}

export async function createCalendarEvent(
  accessToken: string,
  training: Training,
  projectName: string,
  members: Member[],
  taskTitles: string[] = []
): Promise<string> {
  const startDate = training.scheduled_at
    ? training.scheduled_at.split("T")[0]
    : new Date().toISOString().split("T")[0]

  const body: CalendarEventBody = {
    summary: `${training.title} — ${projectName}`,
    description: [
      taskTitles.length > 0 ? `Tasks: ${taskTitles.join(", ")}` : "",
      members.length > 0 ? `Attendees: ${members.map((m) => m.name).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    start: { date: startDate },
    end: { date: startDate },
    attendees: members
      .filter((m) => m.email)
      .map((m) => ({ email: m.email! })),
  }

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to create calendar event: ${response.statusText}`)
  }

  const data = await response.json()
  return data.id as string
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  training: Training,
  projectName: string,
  members: Member[],
  taskTitles: string[] = []
): Promise<void> {
  const startDate = training.scheduled_at
    ? training.scheduled_at.split("T")[0]
    : new Date().toISOString().split("T")[0]

  const body: CalendarEventBody = {
    summary: `${training.title} — ${projectName}`,
    description: [
      taskTitles.length > 0 ? `Tasks: ${taskTitles.join(", ")}` : "",
      members.length > 0 ? `Attendees: ${members.map((m) => m.name).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    start: { date: startDate },
    end: { date: startDate },
    attendees: members
      .filter((m) => m.email)
      .map((m) => ({ email: m.email! })),
  }

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to update calendar event: ${response.statusText}`)
  }
}

export async function createTaskCalendarEvent(
  accessToken: string,
  taskTitle: string,
  dueDate: string,
  projectName: string
): Promise<string> {
  const body: CalendarEventBody = {
    summary: `${taskTitle} — ${projectName}`,
    start: { date: dueDate },
    end: { date: dueDate },
  }

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to create task calendar event: ${response.statusText}`)
  }

  const data = await response.json()
  return data.id as string
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete calendar event: ${response.statusText}`)
  }
}
