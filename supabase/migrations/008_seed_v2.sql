-- Updated seed data with new role system (owner | editor | viewer)
-- This migration updates existing seed data to use new roles and adds demo invite data

-- Update existing members to use new role values (if not already done by 007)
UPDATE members SET role = 'owner' WHERE role = 'admin' AND id = 'c0000000-0000-0000-0000-000000000002';

-- Add project_settings for the demo project
INSERT INTO project_settings (project_id, auto_detect_overdue, overdue_action, default_task_priority, default_task_status, enable_confetti, enable_notifications, theme)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  true,
  'set_priority_high',
  'Medium',
  'To Do',
  true,
  true,
  'light'
)
ON CONFLICT (project_id) DO NOTHING;

-- Add a second demo project
INSERT INTO projects (id, name, description, color, owner_id)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'WrokoFlow Launch',
  'Planning and launching the WrokoFlow project management tool',
  '#7B9F6F',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Lists for second project
INSERT INTO lists (id, project_id, name, color, position) VALUES
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'Backlog', '#9CA3AF', 0),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 'In Development', '#B07C4F', 1),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 'QA / Review', '#C97C5C', 2),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 'Done', '#7B9F6F', 3)
ON CONFLICT (id) DO NOTHING;

-- Members for second project
INSERT INTO members (id, project_id, user_id, name, email, role) VALUES
  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', NULL, 'Leonardo Ranoesendjojo', NULL, 'owner'),
  ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', NULL, 'Design Lead', NULL, 'editor'),
  ('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', NULL, 'QA Reviewer', NULL, 'viewer')
ON CONFLICT (id) DO NOTHING;

-- Labels for second project
INSERT INTO labels (id, project_id, name, color) VALUES
  ('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'UI/UX', '#B07C4F'),
  ('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 'Backend', '#7B9F6F'),
  ('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 'DevOps', '#C97C5C'),
  ('e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 'Bug', '#C44B3F')
ON CONFLICT (id) DO NOTHING;

-- Tasks for second project
INSERT INTO tasks (id, project_id, list_id, title, description, status, priority, due_date, position, created_by) VALUES
  ('f0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000011', 'Implement invite system', 'Build the email + code invite system for team collaboration', 'In Progress', 'High', '2025-07-15', 0, NULL),
  ('f0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000011', 'Role-based permissions', 'Implement Owner/Editor/Viewer role system with RLS', 'In Progress', 'High', '2025-07-20', 1, NULL),
  ('f0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000013', 'Earth-tone UI redesign', 'Complete redesign with Surinamese-inspired earth tones', 'Done', 'Medium', NULL, 0, NULL),
  ('f0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000010', 'Email notification preferences', 'Allow users to configure email notification preferences per project', 'To Do', 'Low', '2025-08-01', 0, NULL),
  ('f0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000010', 'Mobile responsive polish', 'Ensure all pages work well on mobile devices', 'To Do', 'Medium', '2025-08-10', 1, NULL),
  ('f0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000012', 'Test invite accept flow', 'End-to-end test the invite creation, email, and acceptance flow', 'To Do', 'High', '2025-07-25', 0, NULL)
ON CONFLICT (id) DO NOTHING;

-- Task label assignments for second project
INSERT INTO task_labels (task_id, label_id) VALUES
  ('f0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000011'),
  ('f0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000011'),
  ('f0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000010'),
  ('f0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000011'),
  ('f0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;

-- Project settings for second project
INSERT INTO project_settings (project_id, auto_detect_overdue, overdue_action, default_task_priority, default_task_status, enable_confetti, enable_notifications, theme)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  true,
  'set_priority_high',
  'Medium',
  'To Do',
  true,
  true,
  'light'
)
ON CONFLICT (project_id) DO NOTHING;
