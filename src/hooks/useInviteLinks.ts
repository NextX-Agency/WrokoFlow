import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/useAuthStore"
import { sendEmail, buildInviteEmailHtml } from "@/lib/email"
import type { InviteLink, CreateInviteInput, MemberRole } from "@/types"
import { toast } from "sonner"

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let code = ""
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  for (let i = 0; i < 8; i++) {
    code += chars[array[i] % chars.length]
  }
  return code
}

export function useInviteLinks(projectId: string | null) {
  return useQuery({
    queryKey: ["invite-links", projectId],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from("invite_links")
        .select("*")
        .eq("project_id", projectId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as InviteLink[]
    },
    enabled: !!projectId,
  })
}

export function useCreateInviteLink() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (input: CreateInviteInput) => {
      const code = generateInviteCode()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // 30-day expiry

      const { data, error } = await supabase
        .from("invite_links")
        .insert({
          project_id: input.project_id,
          code,
          email: input.email || null,
          role: input.role,
          invited_by: user?.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      return data as InviteLink
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invite-links", data.project_id] })
      toast.success("Invite created")
    },
    onError: (error) => {
      toast.error(`Failed to create invite: ${error.message}`)
    },
  })
}

export function useSendEmailInvite() {
  const user = useAuthStore((s) => s.user)
  const createInvite = useCreateInviteLink()

  return useMutation({
    mutationFn: async ({
      projectId,
      projectName,
      email,
      role,
    }: {
      projectId: string
      projectName: string
      email: string
      role: MemberRole
    }) => {
      // Create the invite link first
      const invite = await createInvite.mutateAsync({
        project_id: projectId,
        email,
        role,
      })

      const inviteUrl = `${window.location.origin}/invite/${invite.code}`
      const inviterName =
        user?.user_metadata?.full_name || user?.email || "A team member"

      const html = buildInviteEmailHtml({
        inviterName,
        projectName,
        role,
        inviteUrl,
      })

      const result = await sendEmail({
        to: email,
        subject: `You're invited to join "${projectName}" on WrokoFlow`,
        html,
      })

      if (!result.success) {
        // Invite link was still created — user can share it manually
        toast.warning("Invite created but email failed to send. Share the link manually.")
        return invite
      }

      return invite
    },
    onSuccess: () => {
      toast.success("Invite sent successfully")
    },
    onError: (error) => {
      toast.error(`Failed to send invite: ${error.message}`)
    },
  })
}

export function useRevokeInviteLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("invite_links")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["invite-links", projectId] })
      toast.success("Invite revoked")
    },
    onError: (error) => {
      toast.error(`Failed to revoke invite: ${error.message}`)
    },
  })
}

export function useAcceptInvite() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (code: string) => {
      if (!user) throw new Error("You must be signed in to accept an invite")

      // Look up the invite by code (without time filter for better error messages)
      const { data: invite, error: lookupError } = await supabase
        .from("invite_links")
        .select("*")
        .eq("code", code)
        .single()

      if (lookupError || !invite) {
        throw new Error("Invite link not found. Please check the link and try again.")
      }

      if (invite.revoked_at) {
        throw new Error("This invite has been revoked by the project owner.")
      }

      if (invite.accepted_at) {
        throw new Error("This invite has already been used.")
      }

      // Check if expired
      if (new Date(invite.expires_at) < new Date()) {
        throw new Error("This invite has expired. Please ask the project owner for a new invite.")
      }

      // Check if email-restricted invite matches the user
      if (invite.email && invite.email !== user.email) {
        throw new Error("This invite was sent to a different email address")
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("project_id", invite.project_id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (existingMember) {
        throw new Error("You are already a member of this project")
      }

      // Add the user as a member
      const { error: memberError } = await supabase.from("members").insert({
        project_id: invite.project_id,
        user_id: user.id,
        name: user.user_metadata?.full_name || user.email || "Member",
        email: user.email,
        avatar_url: user.user_metadata?.avatar_url,
        role: invite.role,
      })
      if (memberError) throw memberError

      // Mark invite as accepted
      const { error: acceptError } = await supabase
        .from("invite_links")
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq("id", invite.id)
      if (acceptError) throw acceptError

      return invite as InviteLink
    },
    onSuccess: (invite) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["members", invite.project_id] })
      queryClient.invalidateQueries({ queryKey: ["invite-links", invite.project_id] })
      toast.success("You've joined the project!")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
