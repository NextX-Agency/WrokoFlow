-- Migration 007: Invite system & role-based permissions
-- Adds invite_links, notification_preferences, and updates member roles

-- ─── Invite Links ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL UNIQUE,
  email text, -- optional: if set, only this email can accept
  role text NOT NULL DEFAULT 'viewer', -- owner | editor | viewer
  invited_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_invite_links_code ON invite_links(code);
CREATE INDEX IF NOT EXISTS idx_invite_links_project ON invite_links(project_id);
CREATE INDEX IF NOT EXISTS idx_invite_links_email ON invite_links(email);

-- ─── Notification Preferences ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  email_task_assigned boolean DEFAULT true,
  email_task_updated boolean DEFAULT true,
  email_comment_added boolean DEFAULT true,
  email_invite_accepted boolean DEFAULT true,
  email_digest boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- ─── Update member roles ─────────────────────────────────────────────────────
-- Migrate existing roles to new format (owner stays owner, admin→editor, member→viewer)
UPDATE members SET role = 'editor' WHERE role = 'admin';
UPDATE members SET role = 'viewer' WHERE role = 'member';

-- Add check constraint for valid roles
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;
ALTER TABLE members ADD CONSTRAINT members_role_check 
  CHECK (role IN ('owner', 'editor', 'viewer'));

-- ─── RLS for invite_links ────────────────────────────────────────────────────
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Project members can view invite links for their projects
CREATE POLICY "Members can view project invites"
  ON invite_links FOR SELECT
  USING (is_project_member(project_id));

-- Only project owners can create invite links
CREATE POLICY "Owners can create invite links"
  ON invite_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Only project owners can update invite links (revoke)
CREATE POLICY "Owners can update invite links"
  ON invite_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Anyone can read an invite by code (for acceptance)
CREATE POLICY "Anyone can read active invite by code"
  ON invite_links FOR SELECT
  USING (
    accepted_at IS NULL 
    AND revoked_at IS NULL 
    AND expires_at > now()
  );

-- Notification preferences: users manage their own
CREATE POLICY "Users manage own notification prefs"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Updated RLS policies for role-based access ─────────────────────────────

-- Helper: check if user is owner of project
CREATE OR REPLACE FUNCTION is_project_owner(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: check if user can edit (owner or editor)
CREATE OR REPLACE FUNCTION can_edit_project(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM members
    WHERE project_id = p_project_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old permissive task policies and recreate with role checks
DROP POLICY IF EXISTS "Members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Members can delete tasks" ON tasks;

CREATE POLICY "Editors can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (can_edit_project(project_id));

CREATE POLICY "Editors can update tasks"
  ON tasks FOR UPDATE
  USING (can_edit_project(project_id));

CREATE POLICY "Owners can delete tasks"
  ON tasks FOR DELETE
  USING (is_project_owner(project_id) OR can_edit_project(project_id));

-- Update list policies
DROP POLICY IF EXISTS "Members can create lists" ON lists;
DROP POLICY IF EXISTS "Members can update lists" ON lists;
DROP POLICY IF EXISTS "Members can delete lists" ON lists;

CREATE POLICY "Editors can create lists"
  ON lists FOR INSERT
  WITH CHECK (can_edit_project(project_id));

CREATE POLICY "Editors can update lists"
  ON lists FOR UPDATE
  USING (can_edit_project(project_id));

CREATE POLICY "Editors can delete lists"
  ON lists FOR DELETE
  USING (can_edit_project(project_id));

-- Update member management policies (owners only)
DROP POLICY IF EXISTS "Admins can add members" ON members;
DROP POLICY IF EXISTS "Admins can update members" ON members;
DROP POLICY IF EXISTS "Admins can remove members" ON members;

CREATE POLICY "Owners can add members"
  ON members FOR INSERT
  WITH CHECK (is_project_owner(project_id));

CREATE POLICY "Owners can update members"
  ON members FOR UPDATE
  USING (is_project_owner(project_id));

CREATE POLICY "Owners can remove members"
  ON members FOR DELETE
  USING (is_project_owner(project_id));

-- Update project policies  
DROP POLICY IF EXISTS "Owners can update their projects" ON projects;
CREATE POLICY "Owners can update their projects"
  ON projects FOR UPDATE
  USING (owner_id = auth.uid());

-- ─── Function to accept invite ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION accept_invite(invite_code text)
RETURNS jsonb AS $$
DECLARE
  v_invite invite_links;
  v_user_id uuid;
  v_user_email text;
  v_user_name text;
  v_user_avatar text;
  v_existing_member uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Get user info
  SELECT email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
  INTO v_user_email, v_user_name, v_user_avatar
  FROM auth.users WHERE id = v_user_id;

  -- Find valid invite
  SELECT * INTO v_invite
  FROM invite_links
  WHERE code = invite_code
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now();

  IF v_invite.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired invite');
  END IF;

  -- If invite is email-specific, check it matches
  IF v_invite.email IS NOT NULL AND v_invite.email != v_user_email THEN
    RETURN jsonb_build_object('error', 'This invite was sent to a different email');
  END IF;

  -- Check if already a member
  SELECT id INTO v_existing_member
  FROM members
  WHERE project_id = v_invite.project_id AND user_id = v_user_id;

  IF v_existing_member IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already a member of this project');
  END IF;

  -- Add as member
  INSERT INTO members (project_id, user_id, name, email, avatar_url, role)
  VALUES (
    v_invite.project_id,
    v_user_id,
    COALESCE(v_user_name, v_user_email, 'User'),
    v_user_email,
    v_user_avatar,
    v_invite.role
  );

  -- Mark invite as accepted
  UPDATE invite_links 
  SET accepted_at = now(), accepted_by = v_user_id
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true, 
    'project_id', v_invite.project_id,
    'role', v_invite.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
