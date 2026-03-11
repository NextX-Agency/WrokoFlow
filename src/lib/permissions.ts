import type { MemberRole } from "@/types"

/** Permission levels: owner > editor > viewer */
const ROLE_LEVELS: Record<MemberRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
}

export function canEdit(role: MemberRole | null | undefined): boolean {
  if (!role) return false
  return ROLE_LEVELS[role] >= ROLE_LEVELS.editor
}

export function canManageMembers(role: MemberRole | null | undefined): boolean {
  if (!role) return false
  return role === "owner"
}

export function canDelete(role: MemberRole | null | undefined): boolean {
  if (!role) return false
  return role === "owner"
}

export function canManageSettings(role: MemberRole | null | undefined): boolean {
  if (!role) return false
  return role === "owner"
}

export function canCreateTasks(role: MemberRole | null | undefined): boolean {
  if (!role) return false
  return ROLE_LEVELS[role] >= ROLE_LEVELS.editor
}

export function canComment(role: MemberRole | null | undefined): boolean {
  // All members can comment
  if (!role) return false
  return true
}

export function getRoleLabel(role: MemberRole): string {
  switch (role) {
    case "owner":
      return "Owner"
    case "editor":
      return "Editor"
    case "viewer":
      return "Viewer"
    default:
      return "Viewer"
  }
}

export function getRoleBadgeColor(role: MemberRole): string {
  switch (role) {
    case "owner":
      return "bg-amber-100 text-amber-800"
    case "editor":
      return "bg-blue-100 text-blue-800"
    case "viewer":
      return "bg-gray-100 text-gray-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}
