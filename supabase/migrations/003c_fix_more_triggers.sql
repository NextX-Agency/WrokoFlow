-- Fix remaining trigger functions that still reference old activity_log columns

CREATE OR REPLACE FUNCTION log_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_member members%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = NEW.task_id;
  SELECT * INTO v_member FROM members WHERE id = NEW.member_id;

  INSERT INTO activity_log (project_id, entity_type, entity_id, user_id, action, description, details)
  VALUES (
    v_task.project_id,
    'task',
    NEW.task_id,
    auth.uid(),
    'assigned',
    'Assigned ' || v_member.name || ' to: ' || v_task.title,
    jsonb_build_object('task_title', v_task.title, 'member_name', v_member.name)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_comment_created()
RETURNS TRIGGER AS $$
DECLARE
  v_task tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = NEW.task_id;

  INSERT INTO activity_log (project_id, entity_type, entity_id, user_id, action, description, details)
  VALUES (
    v_task.project_id,
    'task',
    NEW.task_id,
    NEW.author_id,
    'commented',
    'Comment on: ' || v_task.title,
    jsonb_build_object('task_title', v_task.title, 'preview', left(NEW.body, 100))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
