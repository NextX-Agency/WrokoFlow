import { useMemo } from "react"
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  AreaChart, Area,
} from "recharts"
import { useTasks } from "@/hooks/useTasks"
import { useLists } from "@/hooks/useLists"
import { useMembers } from "@/hooks/useMembers"
import { useActivityLog } from "@/hooks/useActivityLog"
import { useUIStore } from "@/stores/useUIStore"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard, CheckCircle2, Clock, AlertTriangle,
  ListTodo, Activity, Download, Printer,
} from "lucide-react"
import { format, subDays, isPast, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { useProjects } from "@/hooks/useProjects"
import { exportTasksToCSV, exportTasksToPrint } from "@/lib/export"
import { Button } from "@/components/ui/button"

const STATUS_COLORS_HEX: Record<string, string> = {
  "To Do": "#A09890",
  "In Progress": "#D4A04A",
  Done: "#7B9F6F",
  Blocked: "#C44B3F",
}

const PRIORITY_COLORS_HEX: Record<string, string> = {
  High: "#C44B3F",
  Medium: "#D4A04A",
  Low: "#7B9F6F",
}

export default function DashboardPage() {
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const { data: tasks, isLoading: loadingTasks } = useTasks(activeProjectId || "")
  const { data: lists } = useLists(activeProjectId || "")
  const { data: members } = useMembers(activeProjectId || "")
  const { data: activities } = useActivityLog(activeProjectId || "", 30)
  const { data: projects } = useProjects()
  const activeProject = projects?.find((p) => p.id === activeProjectId)

  // KPI calculations
  const kpis = useMemo(() => {
    if (!tasks) return { total: 0, done: 0, inProgress: 0, overdue: 0, blocked: 0 }
    const total = tasks.length
    const done = tasks.filter((t) => t.status === "Done").length
    const inProgress = tasks.filter((t) => t.status === "In Progress").length
    const blocked = tasks.filter((t) => t.status === "Blocked").length
    const overdue = tasks.filter(
      (t) => t.due_date && isPast(new Date(t.due_date)) && t.status !== "Done"
    ).length
    return { total, done, inProgress, overdue, blocked }
  }, [tasks])

  const completionRate = kpis.total > 0 ? Math.round((kpis.done / kpis.total) * 100) : 0

  // Donut chart - status distribution
  const statusData = useMemo(() => {
    if (!tasks) return []
    const counts: Record<string, number> = {}
    tasks.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: STATUS_COLORS_HEX[name] || "#6b7280",
    }))
  }, [tasks])

  // Bar chart - tasks per list
  const tasksPerList = useMemo(() => {
    if (!tasks || !lists) return []
    const listNames: Record<string, string> = {}
    lists.forEach((l) => (listNames[l.id] = l.name))
    const counts: Record<string, number> = {}
    tasks.forEach((t) => {
      const name = listNames[t.list_id || ""] || "Unassigned"
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [tasks, lists])

  // Line chart - completion trend (last 14 days)
  const completionTrend = useMemo(() => {
    if (!tasks) return []
    const days: { date: string; completed: number; created: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i))
      const dayStr = format(day, "yyyy-MM-dd")
      const completed = tasks.filter(
        (t) =>
          t.status === "Done" &&
          t.updated_at &&
          format(new Date(t.updated_at), "yyyy-MM-dd") === dayStr
      ).length
      const created = tasks.filter(
        (t) => format(new Date(t.created_at), "yyyy-MM-dd") === dayStr
      ).length
      days.push({ date: format(day, "MMM d"), completed, created })
    }
    return days
  }, [tasks])

  // Priority distribution
  const priorityData = useMemo(() => {
    if (!tasks) return []
    const counts: Record<string, number> = {}
    tasks.forEach((t) => {
      counts[t.priority] = (counts[t.priority] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: PRIORITY_COLORS_HEX[name] || "#6b7280",
    }))
  }, [tasks])

  // Member workload
  const memberWorkload = useMemo(() => {
    if (!tasks || !members) return []
    const workload: Record<string, { name: string; total: number; done: number }> = {}
    members.forEach((m) => (workload[m.id] = { name: m.name, total: 0, done: 0 }))
    tasks.forEach((t) => {
      t.assignments?.forEach((a) => {
        if (workload[a.member_id]) {
          workload[a.member_id].total++
          if (t.status === "Done") workload[a.member_id].done++
        }
      })
    })
    return Object.values(workload).filter((w) => w.total > 0).sort((a, b) => b.total - a.total)
  }, [tasks, members])

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="No project selected"
        description="Select or create a project to view the dashboard"
      />
    )
  }

  if (loadingTasks) return <LoadingSkeleton variant="dashboard" />

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#2D2A26]">Dashboard</h1>
            <p className="text-sm text-[#7A7267]">Project overview and analytics</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => tasks && exportTasksToCSV(tasks, activeProject?.name || "Project")}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => tasks && exportTasksToPrint(tasks, activeProject?.name || "Project")}
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Total Tasks"
            value={kpis.total}
            icon={ListTodo}
            color="blue"
          />
          <KPICard
            label="Completed"
            value={kpis.done}
            icon={CheckCircle2}
            color="green"
            subtext={`${completionRate}% completion`}
          />
          <KPICard
            label="In Progress"
            value={kpis.inProgress}
            icon={Clock}
            color="amber"
          />
          <KPICard
            label="Overdue"
            value={kpis.overdue}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status Donut */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#4A4540] mb-4">Task Status</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs text-[#7A7267]">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          </Card>

          {/* Tasks per List Bar */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#4A4540] mb-4">Tasks per List</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksPerList}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RTooltip />
                  <Bar dataKey="count" fill="#B07C4F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Priority Distribution */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#4A4540] mb-4">Priority Distribution</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {priorityData.map((p) => (
                <div key={p.name} className="flex items-center gap-1.5 text-xs text-[#7A7267]">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name} ({p.value})
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Completion Trend */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#4A4540] mb-4">
              Activity Trend (14 days)
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={completionTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RTooltip />
                  <Area
                    type="monotone"
                    dataKey="created"
                    stroke="#B07C4F"
                    fill="#B07C4F20"
                    strokeWidth={2}
                    name="Created"
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#7B9F6F"
                    fill="#7B9F6F20"
                    strokeWidth={2}
                    name="Completed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Member Workload */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#4A4540] mb-4">Team Workload</h3>
            <div className="space-y-3 max-h-[220px] overflow-auto">
              {memberWorkload.map((m) => (
                <div key={m.name} className="flex items-center gap-3">
                  <Avatar className="w-7 h-7 flex-shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {m.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {m.name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {m.done}/{m.total}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F0EBE3] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#B07C4F] rounded-full transition-all"
                        style={{
                          width: `${m.total > 0 ? (m.done / m.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {memberWorkload.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No task assignments yet</p>
              )}
            </div>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-[#4A4540] mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent Activity
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-auto">
            {activities?.slice(0, 20).map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 py-2 border-b border-[#F0EBE3] last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-[#B07C4F] mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600">{a.description}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {format(new Date(a.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
            {(!activities || activities.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
            )}
          </div>
        </Card>
      </div>
    </ScrollArea>
  )
}

// KPI Card component
function KPICard({
  label,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: "blue" | "green" | "amber" | "red"
  subtext?: string
}) {
  const colorMap = {
    blue: "bg-[#B07C4F]/10 text-[#B07C4F]",
    green: "bg-[#7B9F6F]/10 text-[#7B9F6F]",
    amber: "bg-[#D4A04A]/10 text-[#D4A04A]",
    red: "bg-[#C44B3F]/10 text-[#C44B3F]",
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[#7A7267] uppercase tracking-wide">
          {label}
        </span>
        <div className={cn("p-2 rounded-lg", colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#2D2A26]">{value}</p>
      {subtext && (
        <p className="text-xs text-[#A09890] mt-1">{subtext}</p>
      )}
    </Card>
  )
}
