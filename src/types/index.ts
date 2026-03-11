export interface Project {
  id: string
  name: string
  description: string | null
  color: string
  owner_id: string
  created_at: string
}

export interface Member {
  id: string
  project_id: string
  user_id: string
  name: string
  email: string | null
  avatar_url: string | null
  role: "owner" | "editor" | "viewer"
  created_at: string
}

export interface List {
  id: string
  project_id: string
  name: string
  color: string
  position: number
}

export interface Task {
  id: string
  project_id: string
  list_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  start_date: string | null
  position: number
  created_by: string
  created_at: string
  updated_at: string
  // Aggregated counts (from DB views or computed)
  comment_count?: number
  attachment_count?: number
  // Joined fields
  assignments?: TaskAssignment[]
  labels?: TaskLabelJoined[]
  comments?: Comment[]
  attachments?: Attachment[]
}

export type TaskStatus = "To Do" | "In Progress" | "Done" | "Blocked"
export type TaskPriority = "High" | "Medium" | "Low"
export type AttendanceStatus = "P" | "A" | "L"
export type MemberRole = "owner" | "editor" | "viewer"

export interface TaskAssignment {
  id: string
  task_id: string
  member_id: string
  member?: Member
  /** Alias used when Supabase returns the joined member via `members(*)` */
  members?: Member
}

export interface Label {
  id: string
  project_id: string
  name: string
  color: string
}

export interface TaskLabel {
  task_id: string
  label_id: string
}

/** TaskLabel with the joined label data */
export interface TaskLabelJoined extends TaskLabel {
  labels?: Label
}

export interface Comment {
  id: string
  task_id: string
  author_id: string
  body: string
  created_at: string
  author?: { email: string; raw_user_meta_data: Record<string, unknown> }
}

export interface Attachment {
  id: string
  task_id: string
  file_name: string
  file_url: string
  file_size: number
  uploaded_by: string
  created_at: string
}

export interface Training {
  id: string
  project_id: string
  title: string
  description: string | null
  scheduled_at: string | null
  duration_minutes: number
  platform: string | null
  meeting_url: string | null
  trainer_id: string | null
  google_calendar_event_id: string | null
  created_at: string
}

export interface TaskTraining {
  task_id: string
  training_id: string
}

export interface Attendance {
  id: string
  member_id: string
  training_id: string
  status: AttendanceStatus
}

export interface ActivityLog {
  id: string
  project_id: string
  entity_type: string
  entity_id: string | null
  user_id: string
  action: "created" | "updated" | "deleted" | "moved" | "assigned" | "commented"
  description: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// Form types
export interface CreateProjectInput {
  name: string
  description?: string
  color?: string
}

export interface CreateTaskInput {
  project_id: string
  list_id?: string
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string
  start_date?: string
  position?: number
}

export interface UpdateTaskInput {
  id: string
  title?: string
  description?: string | null
  status?: TaskStatus | string
  priority?: TaskPriority | string
  due_date?: string | null
  start_date?: string | null
  list_id?: string | null
  position?: number
  /** Used for cache invalidation, not sent to DB */
  projectId?: string
}

export interface CreateListInput {
  project_id: string
  name: string
  color?: string
  position?: number
}

export interface CreateTrainingInput {
  project_id: string
  title: string
  description?: string | null
  scheduled_at?: string | null
  duration_minutes?: number
  platform?: string
  meeting_url?: string | null
  trainer_id?: string | null
}

export interface UpdateTrainingInput extends Partial<CreateTrainingInput> {
  id: string
}

export interface CreateCommentInput {
  task_id: string
  author_id: string
  body: string
}

export interface CreateLabelInput {
  project_id: string
  name: string
  color?: string
}

// Status & priority color mappings
export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
  "To Do": { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
  "In Progress": { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  "Done": { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  "Blocked": { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
}

export const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  "High": { bg: "bg-red-100", text: "text-red-700" },
  "Medium": { bg: "bg-amber-100", text: "text-amber-700" },
  "Low": { bg: "bg-green-100", text: "text-green-700" },
}

export const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  "P": "bg-green-500",
  "A": "bg-red-500",
  "L": "bg-amber-500",
}

// Automation types
export type AutomationTrigger =
  | "status_change"
  | "due_date_passed"
  | "task_created"
  | "all_subtasks_done"
  | "assignment_change"

export type AutomationAction =
  | "set_status"
  | "assign_member"
  | "move_list"
  | "send_notification"
  | "set_priority"

export interface AutomationRule {
  id: string
  project_id: string
  name: string
  description: string | null
  trigger_type: AutomationTrigger
  trigger_config: Record<string, unknown>
  action_type: AutomationAction
  action_config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface AutomationLog {
  id: string
  rule_id: string | null
  project_id: string
  task_id: string | null
  action_taken: string
  details: Record<string, unknown> | null
  executed_at: string
}

export interface ProjectSettings {
  id: string
  project_id: string
  auto_detect_overdue: boolean
  overdue_action: "set_priority_high" | "set_status_blocked" | "notify_only"
  auto_move_done_to_list: string | null
  default_task_priority: string
  default_task_status: string
  enable_confetti: boolean
  enable_notifications: boolean
  theme: "light" | "dark" | "system"
  created_at: string
}

export interface CreateAutomationRuleInput {
  project_id: string
  name: string
  description?: string | null
  trigger_type: AutomationTrigger
  trigger_config?: Record<string, unknown>
  action_type: AutomationAction
  action_config?: Record<string, unknown>
  is_active?: boolean
}

export interface UpdateProjectSettingsInput {
  project_id: string
  auto_detect_overdue?: boolean
  overdue_action?: "set_priority_high" | "set_status_blocked" | "notify_only"
  auto_move_done_to_list?: string | null
  default_task_priority?: string
  default_task_status?: string
  enable_confetti?: boolean
  enable_notifications?: boolean
  theme?: "light" | "dark" | "system"
}

// ─── Invite Types ─────────────────────────────────────────────────────────────

export interface InviteLink {
  id: string
  project_id: string
  code: string
  email: string | null
  role: MemberRole
  invited_by: string
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  revoked_at: string | null
  created_at: string
}

export interface CreateInviteInput {
  project_id: string
  email?: string
  role: MemberRole
}

export interface NotificationPreferences {
  id: string
  user_id: string
  project_id: string
  email_task_assigned: boolean
  email_task_updated: boolean
  email_comment_added: boolean
  email_invite_accepted: boolean
  email_digest: boolean
  created_at: string
}
