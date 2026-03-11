-- WrokoFlow Database Schema
-- Run this in your Supabase SQL Editor

-- Projects (makes app reusable across any project)
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Members
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  email text,
  avatar_url text,
  role text DEFAULT 'member', -- owner | admin | member
  created_at timestamptz DEFAULT now()
);

-- Lists (columns on the board)
CREATE TABLE lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6B7280',
  position int DEFAULT 0
);

-- Tasks
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  list_id uuid REFERENCES lists(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'To Do', -- To Do | In Progress | Done | Blocked
  priority text DEFAULT 'Medium', -- High | Medium | Low
  due_date date,
  start_date date,
  position int DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task assignments (multiple people per task)
CREATE TABLE task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE(task_id, member_id)
);

-- Task labels/tags
CREATE TABLE labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6B7280'
);

CREATE TABLE task_labels (
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  label_id uuid REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

-- Comments
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Attachments
CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size int DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Trainings / Events (linked to tasks, synced to Google Calendar)
CREATE TABLE trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scheduled_at timestamptz,
  duration_minutes int DEFAULT 60,
  platform text,
  meeting_url text,
  trainer_id uuid REFERENCES members(id) ON DELETE SET NULL,
  google_calendar_event_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE task_trainings (
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  training_id uuid REFERENCES trainings(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, training_id)
);

-- Attendance
CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  training_id uuid REFERENCES trainings(id) ON DELETE CASCADE,
  status text DEFAULT 'P', -- P | A | L
  UNIQUE(member_id, training_id)
);

-- Activity log (auto-track all changes)
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  entity_type text NOT NULL DEFAULT 'task', -- task | training | project | list
  entity_id uuid,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL, -- created | updated | deleted | moved | assigned | commented
  description text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
