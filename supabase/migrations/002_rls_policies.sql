-- RLS Policies for WrokoFlow
-- Users can only access data for projects they are members of

-- Helper function: check if user is a member of a project
CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE project_id = p_project_id
    AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Projects: users see projects they own or are members of
CREATE POLICY "Users can view their projects"
  ON projects FOR SELECT
  USING (owner_id = auth.uid() OR id IN (
    SELECT project_id FROM members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their projects"
  ON projects FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their projects"
  ON projects FOR DELETE
  USING (owner_id = auth.uid());

-- Members
CREATE POLICY "Members can view project members"
  ON members FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Admins can add members"
  ON members FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Admins can update members"
  ON members FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY "Admins can remove members"
  ON members FOR DELETE
  USING (is_project_member(project_id));

-- Lists
CREATE POLICY "Members can view lists"
  ON lists FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Members can create lists"
  ON lists FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Members can update lists"
  ON lists FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY "Members can delete lists"
  ON lists FOR DELETE
  USING (is_project_member(project_id));

-- Tasks
CREATE POLICY "Members can view tasks"
  ON tasks FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Members can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Members can update tasks"
  ON tasks FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY "Members can delete tasks"
  ON tasks FOR DELETE
  USING (is_project_member(project_id));

-- Task assignments
CREATE POLICY "Members can view assignments"
  ON task_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

CREATE POLICY "Members can create assignments"
  ON task_assignments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

CREATE POLICY "Members can delete assignments"
  ON task_assignments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

-- Labels
CREATE POLICY "Members can view labels"
  ON labels FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Members can create labels"
  ON labels FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Members can update labels"
  ON labels FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY "Members can delete labels"
  ON labels FOR DELETE
  USING (is_project_member(project_id));

-- Task labels
CREATE POLICY "Members can view task labels"
  ON task_labels FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

CREATE POLICY "Members can add task labels"
  ON task_labels FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

CREATE POLICY "Members can remove task labels"
  ON task_labels FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

-- Comments
CREATE POLICY "Members can view comments"
  ON comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

CREATE POLICY "Members can add comments"
  ON comments FOR INSERT
  WITH CHECK (author_id = auth.uid() AND EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

CREATE POLICY "Authors can update comments"
  ON comments FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Authors can delete comments"
  ON comments FOR DELETE
  USING (author_id = auth.uid());

-- Attachments
CREATE POLICY "Members can view attachments"
  ON attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

CREATE POLICY "Members can add attachments"
  ON attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

CREATE POLICY "Members can delete attachments"
  ON attachments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

-- Trainings
CREATE POLICY "Members can view trainings"
  ON trainings FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Members can create trainings"
  ON trainings FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Members can update trainings"
  ON trainings FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY "Members can delete trainings"
  ON trainings FOR DELETE
  USING (is_project_member(project_id));

-- Task trainings
CREATE POLICY "Members can view task trainings"
  ON task_trainings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

CREATE POLICY "Members can add task trainings"
  ON task_trainings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

CREATE POLICY "Members can remove task trainings"
  ON task_trainings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id)
  ));

-- Attendance
CREATE POLICY "Members can view attendance"
  ON attendance FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM members m WHERE m.id = member_id AND is_project_member(m.project_id)
  ));

CREATE POLICY "Members can upsert attendance"
  ON attendance FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM members m WHERE m.id = member_id AND is_project_member(m.project_id)
  ));

CREATE POLICY "Members can update attendance"
  ON attendance FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM members m WHERE m.id = member_id AND is_project_member(m.project_id)
  ));

CREATE POLICY "Members can delete attendance"
  ON attendance FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM members m WHERE m.id = member_id AND is_project_member(m.project_id)
  ));

-- Activity log
CREATE POLICY "Members can view activity"
  ON activity_log FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Members can log activity"
  ON activity_log FOR INSERT
  WITH CHECK (is_project_member(project_id));
