import { useState } from "react"
import { useMembers, useUpdateMemberRole, useDeleteMember } from "@/hooks/useMembers"
import { useUserRole } from "@/hooks/useUserRole"
import { useAuthStore } from "@/stores/useAuthStore"
import { canManageMembers, getRoleLabel, getRoleBadgeColor } from "@/lib/permissions"
import type { MemberRole, Member } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Crown,
  MoreVertical,
  UserMinus,
  Shield,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MembersPanelProps {
  projectId: string
}

export function MembersPanel({ projectId }: MembersPanelProps) {
  const { data: members = [], isLoading } = useMembers(projectId)
  const { data: currentRole } = useUserRole(projectId)
  const user = useAuthStore((s) => s.user)
  const updateRole = useUpdateMemberRole()
  const deleteMember = useDeleteMember()
  const isOwner = canManageMembers(currentRole)

  const [removeMember, setRemoveMember] = useState<Member | null>(null)

  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder: Record<string, number> = { owner: 0, editor: 1, viewer: 2 }
    return (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3)
  })

  const handleRoleChange = (memberId: string, newRole: MemberRole) => {
    updateRole.mutate({ id: memberId, role: newRole, projectId })
  }

  const handleRemove = () => {
    if (!removeMember) return
    deleteMember.mutate(
      { id: removeMember.id, projectId },
      { onSuccess: () => setRemoveMember(null) }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-pulse">
            <div className="size-9 rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-24 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-1">
        {sortedMembers.map((member) => {
          const isCurrentUser = member.user_id === user?.id
          const isMemberOwner = member.role === "owner"

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F0EBE3]/50 transition-colors group"
            >
              <Avatar className="size-9">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="bg-[#B07C4F]/10 text-[#B07C4F] text-sm font-medium">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {member.name}
                    {isCurrentUser && (
                      <span className="text-muted-foreground ml-1">(you)</span>
                    )}
                  </p>
                  {isMemberOwner && (
                    <Crown className="size-3.5 text-amber-500 shrink-0" />
                  )}
                </div>
                {member.email && (
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                )}
              </div>

              <Badge
                variant="secondary"
                className={`${getRoleBadgeColor(member.role as MemberRole)} shrink-0`}
              >
                {getRoleLabel(member.role as MemberRole)}
              </Badge>

              {/* Actions: Only shown to owner, not on themselves or other owners */}
              {isOwner && !isCurrentUser && !isMemberOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Change role</p>
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleRoleChange(member.id, v as MemberRole)}
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => setRemoveMember(member)}
                    >
                      <UserMinus className="size-4 mr-2" />
                      Remove from project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Shield icon for non-owners who can't manage */}
              {!isOwner && isMemberOwner && (
                <Shield className="size-4 text-amber-500 shrink-0 opacity-50" />
              )}
            </div>
          )
        })}

        {members.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No members yet</p>
          </div>
        )}
      </div>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removeMember} onOpenChange={(open) => !open && setRemoveMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{removeMember?.name}</strong> from this project?
              They will lose access to all project content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
