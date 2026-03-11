import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useInviteLinks,
  useCreateInviteLink,
  useSendEmailInvite,
  useRevokeInviteLink,
} from "@/hooks/useInviteLinks"
import type { MemberRole, InviteLink } from "@/types"
import { getRoleLabel } from "@/lib/permissions"
import {
  Copy,
  Mail,
  Link2,
  Clock,
  X,
  Check,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"

interface InviteMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
}

export function InviteMembersDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: InviteMembersDialogProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<MemberRole>("editor")
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const { data: invites = [] } = useInviteLinks(projectId)
  const createLink = useCreateInviteLink()
  const sendInvite = useSendEmailInvite()
  const revokeInvite = useRevokeInviteLink()

  const activeInvites = invites.filter(
    (i) => !i.accepted_at && new Date(i.expires_at) > new Date()
  )

  const handleSendEmail = async () => {
    if (!email.trim()) return
    await sendInvite.mutateAsync({
      projectId,
      projectName,
      email: email.trim(),
      role,
    })
    setEmail("")
  }

  const handleCreateLink = async () => {
    await createLink.mutateAsync({
      project_id: projectId,
      role,
    })
  }

  const handleCopyLink = (invite: InviteLink) => {
    const url = `${window.location.origin}/invite/${invite.code}`
    navigator.clipboard.writeText(url)
    setCopiedCode(invite.code)
    toast.success("Invite link copied to clipboard")
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleRevoke = (id: string) => {
    revokeInvite.mutate({ id, projectId })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-[#B07C4F]" />
            Invite Members
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="email" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="email" className="flex-1 gap-1.5">
              <Mail className="size-4" />
              Email Invite
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1 gap-1.5">
              <Link2 className="size-4" />
              Invite Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSendEmail()
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor — can edit tasks & content</SelectItem>
                  <SelectItem value="viewer">Viewer — can only view</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleSendEmail}
              disabled={!email.trim() || sendInvite.isPending}
            >
              {sendInvite.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </TabsContent>

          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Role for link</Label>
              <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor — can edit tasks & content</SelectItem>
                  <SelectItem value="viewer">Viewer — can only view</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              variant="outline"
              onClick={handleCreateLink}
              disabled={createLink.isPending}
            >
              <Link2 className="size-4 mr-2" />
              {createLink.isPending ? "Generating..." : "Generate Invite Link"}
            </Button>

            <p className="text-xs text-muted-foreground">
              Links expire in 7 days. Anyone with the link can join as the selected role.
            </p>
          </TabsContent>
        </Tabs>

        {/* Active Invites */}
        {activeInvites.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium text-[#6B5E50] mb-3">
              Pending Invites ({activeInvites.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activeInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-2 p-2.5 bg-[#F0EBE3]/60 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    {invite.email ? (
                      <p className="text-sm font-medium truncate">{invite.email}</p>
                    ) : (
                      <p className="text-sm font-medium text-muted-foreground">Anyone with link</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground capitalize">
                        {getRoleLabel(invite.role)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatExpiry(invite.expires_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleCopyLink(invite)}
                    >
                      {copiedCode === invite.code ? (
                        <Check className="size-3.5 text-green-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      onClick={() => handleRevoke(invite.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function formatExpiry(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return "Expired"
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d left`
  return `${hours}h left`
}
