/**
 * Drizzle ORM schema — mirrors the Supabase SQL migrations exactly.
 * Used for type inference and Drizzle Studio.
 * Runtime DB access is handled by the Supabase client (src/lib/supabase.ts).
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core"

// ─── Projects ───────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3B82F6"),
  owner_id: uuid("owner_id"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// ─── Members ─────────────────────────────────────────────────────────────────

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  user_id: uuid("user_id"),
  name: text("name").notNull(),
  email: text("email"),
  avatar_url: text("avatar_url"),
  role: text("role").default("member"), // owner | admin | member
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// ─── Lists ───────────────────────────────────────────────────────────────────

export const lists = pgTable("lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#6B7280"),
  position: integer("position").default(0),
})

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  list_id: uuid("list_id").references(() => lists.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("To Do"), // To Do | In Progress | Done | Blocked
  priority: text("priority").default("Medium"), // High | Medium | Low
  due_date: date("due_date"),
  start_date: date("start_date"),
  position: integer("position").default(0),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

// ─── Task Assignments ─────────────────────────────────────────────────────────

export const task_assignments = pgTable(
  "task_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    task_id: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    member_id: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.task_id, t.member_id)]
)

// ─── Labels ──────────────────────────────────────────────────────────────────

export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#6B7280"),
})

export const task_labels = pgTable(
  "task_labels",
  {
    task_id: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    label_id: uuid("label_id").references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.task_id, t.label_id] })]
)

// ─── Comments ────────────────────────────────────────────────────────────────

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  task_id: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  author_id: uuid("author_id"),
  body: text("body").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// ─── Attachments ─────────────────────────────────────────────────────────────

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  task_id: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  file_name: text("file_name").notNull(),
  file_url: text("file_url").notNull(),
  file_size: integer("file_size").default(0),
  uploaded_by: uuid("uploaded_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// ─── Trainings ───────────────────────────────────────────────────────────────

export const trainings = pgTable("trainings", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  scheduled_at: timestamp("scheduled_at", { withTimezone: true }),
  duration_minutes: integer("duration_minutes").default(60),
  platform: text("platform"),
  meeting_url: text("meeting_url"),
  trainer_id: uuid("trainer_id").references(() => members.id, { onDelete: "set null" }),
  google_calendar_event_id: text("google_calendar_event_id"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const task_trainings = pgTable(
  "task_trainings",
  {
    task_id: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    training_id: uuid("training_id").references(() => trainings.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.task_id, t.training_id] })]
)

// ─── Attendance ──────────────────────────────────────────────────────────────

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    member_id: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
    training_id: uuid("training_id").references(() => trainings.id, { onDelete: "cascade" }),
    status: text("status").default("P"), // P | A | L
  },
  (t) => [unique().on(t.member_id, t.training_id)]
)

// ─── Activity Log ────────────────────────────────────────────────────────────

export const activity_log = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  entity_type: text("entity_type").notNull().default("task"), // task | training | project | list
  entity_id: uuid("entity_id"),
  user_id: uuid("user_id"),
  action: text("action").notNull(), // created | updated | deleted | moved | assigned | commented
  description: text("description"),
  details: jsonb("details"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// ─── Automation Rules ────────────────────────────────────────────────────────

export const automation_rules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  trigger_type: text("trigger_type").notNull(), // status_change | due_date_passed | task_created | all_subtasks_done | assignment_change
  trigger_config: jsonb("trigger_config").default({}),
  action_type: text("action_type").notNull(), // set_status | assign_member | move_list | send_notification | set_priority
  action_config: jsonb("action_config").default({}),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// ─── Automation Log ──────────────────────────────────────────────────────────

export const automation_log = pgTable("automation_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  rule_id: uuid("rule_id").references(() => automation_rules.id, { onDelete: "set null" }),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  task_id: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  action_taken: text("action_taken").notNull(),
  details: jsonb("details"),
  executed_at: timestamp("executed_at", { withTimezone: true }).defaultNow(),
})

// ─── Invite Links ────────────────────────────────────────────────────────────

export const invite_links = pgTable("invite_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  code: text("code").notNull().unique(),
  email: text("email"),
  role: text("role").notNull().default("viewer"),
  invited_by: uuid("invited_by"),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  accepted_at: timestamp("accepted_at", { withTimezone: true }),
  accepted_by: uuid("accepted_by"),
  revoked_at: timestamp("revoked_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// ─── Notification Preferences ────────────────────────────────────────────────

export const notification_preferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  email_task_assigned: boolean("email_task_assigned").default(true),
  email_task_updated: boolean("email_task_updated").default(true),
  email_comment_added: boolean("email_comment_added").default(true),
  email_invite_accepted: boolean("email_invite_accepted").default(true),
  email_digest: boolean("email_digest").default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// ─── Project Settings ────────────────────────────────────────────────────────

export const project_settings = pgTable("project_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  project_id: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .unique(),
  auto_detect_overdue: boolean("auto_detect_overdue").default(true),
  overdue_action: text("overdue_action").default("set_priority_high"),
  auto_move_done_to_list: uuid("auto_move_done_to_list").references(() => lists.id, {
    onDelete: "set null",
  }),
  default_task_priority: text("default_task_priority").default("Medium"),
  default_task_status: text("default_task_status").default("To Do"),
  enable_confetti: boolean("enable_confetti").default(true),
  enable_notifications: boolean("enable_notifications").default(true),
  theme: text("theme").default("light"), // light | dark | system
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type Project = typeof projects.$inferSelect
export type Member = typeof members.$inferSelect
export type List = typeof lists.$inferSelect
export type Task = typeof tasks.$inferSelect
export type Comment = typeof comments.$inferSelect
export type Attachment = typeof attachments.$inferSelect
export type Training = typeof trainings.$inferSelect
export type AttendanceRecord = typeof attendance.$inferSelect
export type ActivityLog = typeof activity_log.$inferSelect
export type AutomationRule = typeof automation_rules.$inferSelect
export type ProjectSettings = typeof project_settings.$inferSelect
