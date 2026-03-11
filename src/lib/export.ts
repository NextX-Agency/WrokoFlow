import type { Task, Member, Training, Attendance } from "@/types"
import { format } from "date-fns"

/**
 * Export data to CSV and trigger browser download.
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: string[][]
): void {
  const escapeCsv = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n")

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Export tasks to CSV.
 */
export function exportTasksToCSV(tasks: Task[], projectName: string): void {
  const headers = [
    "Title",
    "Status",
    "Priority",
    "Due Date",
    "Start Date",
    "Assignees",
    "Labels",
    "Created At",
  ]

  const rows = tasks.map((task) => [
    task.title,
    task.status,
    task.priority,
    task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : "",
    task.start_date ? format(new Date(task.start_date), "yyyy-MM-dd") : "",
    task.assignments?.map((a) => a.members?.name || a.member?.name || "").filter(Boolean).join("; ") || "",
    task.labels?.map((l) => l.labels?.name || "").filter(Boolean).join("; ") || "",
    format(new Date(task.created_at), "yyyy-MM-dd HH:mm"),
  ])

  exportToCSV(`${projectName}-tasks-${format(new Date(), "yyyy-MM-dd")}`, headers, rows)
}

/**
 * Export trainings to CSV.
 */
export function exportTrainingsToCSV(
  trainings: Training[],
  members: Member[],
  projectName: string
): void {
  const headers = [
    "Title",
    "Description",
    "Scheduled At",
    "Duration (min)",
    "Platform",
    "Trainer",
    "Meeting URL",
    "Synced to Calendar",
  ]

  const rows = trainings.map((t) => [
    t.title,
    t.description || "",
    t.scheduled_at ? format(new Date(t.scheduled_at), "yyyy-MM-dd HH:mm") : "",
    String(t.duration_minutes),
    t.platform || "",
    members.find((m) => m.id === t.trainer_id)?.name || "",
    t.meeting_url || "",
    t.google_calendar_event_id ? "Yes" : "No",
  ])

  exportToCSV(`${projectName}-trainings-${format(new Date(), "yyyy-MM-dd")}`, headers, rows)
}

/**
 * Export attendance to CSV.
 */
export function exportAttendanceToCSV(
  attendance: Attendance[],
  members: Member[],
  trainings: Training[],
  projectName: string
): void {
  const headers = ["Member", "Training", "Status"]

  const rows = attendance.map((a) => [
    members.find((m) => m.id === a.member_id)?.name || a.member_id,
    trainings.find((t) => t.id === a.training_id)?.title || a.training_id,
    a.status === "P" ? "Present" : a.status === "A" ? "Absent" : "Late",
  ])

  exportToCSV(`${projectName}-attendance-${format(new Date(), "yyyy-MM-dd")}`, headers, rows)
}

/**
 * Generate a simple PDF-like printable HTML report and open print dialog.
 */
export function exportTasksToPrint(tasks: Task[], projectName: string): void {
  const completedCount = tasks.filter((t) => t.status === "Done").length
  const overdueCount = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "Done"
  ).length

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${projectName} - Task Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 40px; color: #1a1a1a; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
        .kpis { display: flex; gap: 16px; margin-bottom: 24px; }
        .kpi { background: #f8f9fa; border-radius: 8px; padding: 16px; flex: 1; text-align: center; }
        .kpi-value { font-size: 28px; font-weight: bold; }
        .kpi-label { font-size: 12px; color: #666; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th { text-align: left; padding: 8px 12px; background: #f1f5f9; border-bottom: 2px solid #e2e8f0; font-weight: 600; }
        td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .status-done { background: #dcfce7; color: #166534; }
        .status-progress { background: #fef3c7; color: #92400e; }
        .status-todo { background: #f1f5f9; color: #475569; }
        .status-blocked { background: #fee2e2; color: #991b1b; }
        .priority-high { color: #dc2626; font-weight: 600; }
        .priority-medium { color: #d97706; }
        .priority-low { color: #16a34a; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>${projectName}</h1>
      <p class="subtitle">Task Report — ${format(new Date(), "MMMM d, yyyy")}</p>
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-value">${tasks.length}</div>
          <div class="kpi-label">Total Tasks</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">${completedCount}</div>
          <div class="kpi-label">Completed</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">${overdueCount}</div>
          <div class="kpi-label">Overdue</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">${tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%</div>
          <div class="kpi-label">Completion Rate</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due Date</th>
            <th>Assignees</th>
          </tr>
        </thead>
        <tbody>
          ${tasks
            .map(
              (t) => `
            <tr>
              <td>${t.title}</td>
              <td><span class="badge ${getStatusClass(t.status)}">${t.status}</span></td>
              <td class="${getPriorityClass(t.priority)}">${t.priority}</td>
              <td>${t.due_date ? format(new Date(t.due_date), "MMM d, yyyy") : "—"}</td>
              <td>${t.assignments?.map((a) => a.members?.name || a.member?.name || "").filter(Boolean).join(", ") || "—"}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `

  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case "Done": return "status-done"
    case "In Progress": return "status-progress"
    case "Blocked": return "status-blocked"
    default: return "status-todo"
  }
}

function getPriorityClass(priority: string): string {
  switch (priority) {
    case "High": return "priority-high"
    case "Medium": return "priority-medium"
    case "Low": return "priority-low"
    default: return ""
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
