-- Migration 011: Fix invite RLS
-- Problem 1: "Admins can add members" requires you to ALREADY be a member,
--            so a brand-new invitee gets "new row violates RLS for table members".
-- Problem 2: No policy lets the invitee update invite_links.accepted_at,
--            so the invite is never marked used and the join silently appears
--            incomplete in the invites UI.

-- ── Fix 1: Let a user insert THEMSELVES into members via a valid invite ──────
DROP POLICY IF EXISTS "Users can join via invite" ON members;
CREATE POLICY "Users can join via invite"
  ON members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM invite_links il
      WHERE il.project_id = members.project_id
        AND il.accepted_at IS NULL
        AND il.revoked_at IS NULL
        AND il.expires_at > now()
        AND (il.email IS NULL OR il.email = auth.email())
    )
  );

-- ── Fix 2: Let the invitee mark the invite as accepted ───────────────────────
DROP POLICY IF EXISTS "Invitee can accept invite" ON invite_links;
CREATE POLICY "Invitee can accept invite"
  ON invite_links FOR UPDATE
  USING (
    accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
    AND (email IS NULL OR email = auth.email())
  )
  WITH CHECK (
    accepted_by = auth.uid()
  );
