-- Automation rules table
CREATE TABLE automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL, -- 'status_change' | 'due_date_passed' | 'task_created' | 'all_subtasks_done' | 'assignment_change'
  trigger_config jsonb DEFAULT '{}',
  action_type text NOT NULL, -- 'set_status' | 'assign_member' | 'move_list' | 'send_notification' | 'set_priority'
  action_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS: project members can manage automation rules
CREATE POLICY "Members can view automation rules"
  ON automation_rules FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage automation rules"
  ON automation_rules FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Automation execution log
CREATE TABLE automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES automation_rules(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  action_taken text NOT NULL,
  details jsonb,
  executed_at timestamptz DEFAULT now()
);

ALTER TABLE automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view automation logs"
  ON automation_log FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Settings table for project-level preferences
CREATE TABLE project_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  auto_detect_overdue boolean DEFAULT true,
  overdue_action text DEFAULT 'set_priority_high', -- 'set_priority_high' | 'set_status_blocked' | 'notify_only'
  auto_move_done_to_list uuid REFERENCES lists(id) ON DELETE SET NULL,
  default_task_priority text DEFAULT 'Medium',
  default_task_status text DEFAULT 'To Do',
  enable_confetti boolean DEFAULT true,
  enable_notifications boolean DEFAULT true,
  theme text DEFAULT 'light', -- 'light' | 'dark' | 'system'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project settings"
  ON project_settings FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage project settings"
  ON project_settings FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
