-- Migration 009: Safe trigger functions
-- Wraps activity_log INSERTs in exception handlers so that cascade project
-- deletions don't cause FK violations (the project may be mid-cascade when
-- task triggers fire).

CREATE OR REPLACE FUNCTION log_task_created()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO activity_log (project_id, entity_type, entity_id, user_id, action, description, details)
    VALUES (
      NEW.project_id,
      'task',
      NEW.id,
      NEW.created_by,
      'created',
      'Task created: ' || NEW.title,
      jsonb_build_object('title', NEW.title, 'status', NEW.status, 'priority', NEW.priority)
    );
  EXCEPTION WHEN foreign_key_violation OR not_null_violation THEN
    -- Project is being deleted; skip activity logging
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_task_updated()
RETURNS TRIGGER AS $$
DECLARE
  changes jsonb := '{}';
  action_name text := 'updated';
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    changes := changes || jsonb_build_object('status', jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    changes := changes || jsonb_build_object('priority', jsonb_build_object('from', OLD.priority, 'to', NEW.priority));
  END IF;
  IF OLD.list_id IS DISTINCT FROM NEW.list_id THEN
    changes := changes || jsonb_build_object('moved', true, 'old_list', OLD.list_id, 'new_list', NEW.list_id);
    action_name := 'moved';
  END IF;
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    changes := changes || jsonb_build_object('title', jsonb_build_object('from', OLD.title, 'to', NEW.title));
  END IF;

  IF changes != '{}' THEN
    BEGIN
      INSERT INTO activity_log (project_id, entity_type, entity_id, user_id, action, description, details)
      VALUES (
        NEW.project_id,
        'task',
        NEW.id,
        auth.uid(),
        action_name,
        'Task ' || action_name || ': ' || NEW.title,
        changes || jsonb_build_object('task_title', NEW.title)
      );
    EXCEPTION WHEN foreign_key_violation OR not_null_violation THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_task_deleted()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO activity_log (project_id, entity_type, entity_id, user_id, action, description, details)
    VALUES (
      OLD.project_id,
      'task',
      OLD.id,
      auth.uid(),
      'deleted',
      'Task deleted: ' || OLD.title,
      jsonb_build_object('title', OLD.title)
    );
  EXCEPTION WHEN foreign_key_violation OR not_null_violation THEN
    -- Project is being cascade-deleted; skip activity logging
    NULL;
  END;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
