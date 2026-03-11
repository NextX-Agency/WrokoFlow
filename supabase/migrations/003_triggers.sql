-- Triggers for WrokoFlow

-- Auto-update updated_at on tasks
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-log task creation to activity_log
CREATE OR REPLACE FUNCTION log_task_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (project_id, task_id, user_id, action, details)
  VALUES (
    NEW.project_id,
    NEW.id,
    NEW.created_by,
    'created',
    jsonb_build_object('title', NEW.title, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_created_log
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_created();

-- Auto-log task updates to activity_log
CREATE OR REPLACE FUNCTION log_task_updated()
RETURNS TRIGGER AS $$
DECLARE
  changes jsonb := '{}';
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    changes := changes || jsonb_build_object('status', jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    changes := changes || jsonb_build_object('priority', jsonb_build_object('from', OLD.priority, 'to', NEW.priority));
  END IF;
  IF OLD.list_id IS DISTINCT FROM NEW.list_id THEN
    changes := changes || jsonb_build_object('moved', true, 'old_list', OLD.list_id, 'new_list', NEW.list_id);
  END IF;
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    changes := changes || jsonb_build_object('title', jsonb_build_object('from', OLD.title, 'to', NEW.title));
  END IF;

  -- Only log if there were meaningful changes
  IF changes != '{}' THEN
    INSERT INTO activity_log (project_id, task_id, user_id, action, details)
    VALUES (
      NEW.project_id,
      NEW.id,
      auth.uid(),
      CASE
        WHEN OLD.list_id IS DISTINCT FROM NEW.list_id THEN 'moved'
        ELSE 'updated'
      END,
      changes || jsonb_build_object('task_title', NEW.title)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_updated_log
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_updated();

-- Auto-log task deletion
CREATE OR REPLACE FUNCTION log_task_deleted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (project_id, task_id, user_id, action, details)
  VALUES (
    OLD.project_id,
    NULL,
    auth.uid(),
    'deleted',
    jsonb_build_object('title', OLD.title)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_deleted_log
  AFTER DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_deleted();

-- Auto-log task assignment
CREATE OR REPLACE FUNCTION log_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_member members%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = NEW.task_id;
  SELECT * INTO v_member FROM members WHERE id = NEW.member_id;

  INSERT INTO activity_log (project_id, task_id, user_id, action, details)
  VALUES (
    v_task.project_id,
    NEW.task_id,
    auth.uid(),
    'assigned',
    jsonb_build_object('task_title', v_task.title, 'member_name', v_member.name)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_assigned_log
  AFTER INSERT ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION log_task_assigned();

-- Auto-log comments
CREATE OR REPLACE FUNCTION log_comment_created()
RETURNS TRIGGER AS $$
DECLARE
  v_task tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = NEW.task_id;

  INSERT INTO activity_log (project_id, task_id, user_id, action, details)
  VALUES (
    v_task.project_id,
    NEW.task_id,
    NEW.author_id,
    'commented',
    jsonb_build_object('task_title', v_task.title, 'content', left(NEW.content, 100))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_created_log
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION log_comment_created();
