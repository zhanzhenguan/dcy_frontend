import type { TenantGroup, TenantMember } from '@/services/api/tenantApi'

/** 分组下的成员列表：负责人优先，可选排除当前用户 */
export function getGroupMembers(
  group: TenantGroup,
  currentUserId?: string
): TenantMember[] {
  const list = [...(group.members ?? [])]
  const leader = group.leader
  if (leader && !list.some((item) => item.public_id === leader.public_id)) {
    list.unshift(leader)
  }
  if (!currentUserId) return list
  return list.filter((member) => member.user_public_id !== currentUserId)
}

export function memberLabel(member: TenantMember) {
  return member.nickname || member.email || member.public_id
}

/** 仅按昵称匹配；无昵称时退回邮箱 @ 前缀 */
export function memberSearchText(member: TenantMember) {
  const nickname = member.nickname?.trim()
  if (nickname) return nickname.toLowerCase()
  const email = member.email?.trim() ?? ''
  const local = email.includes('@') ? email.split('@')[0] : email
  return local.toLowerCase()
}

export function collectGroupedUserIds(groups: TenantGroup[]) {
  const ids = new Set<string>()
  for (const group of groups) {
    for (const member of getGroupMembers(group)) {
      ids.add(member.user_public_id)
    }
  }
  return ids
}

export function resolveUngroupedMembers(
  members: TenantMember[],
  groups: TenantGroup[],
  currentUserId?: string
) {
  const grouped = collectGroupedUserIds(groups)
  return members.filter((member) => {
    if (currentUserId && member.user_public_id === currentUserId) return false
    return !grouped.has(member.user_public_id)
  })
}

export function isUserInGroup(group: TenantGroup, userPublicId: string) {
  if (!userPublicId) return false
  if (group.leader?.user_public_id === userPublicId) return true
  return (group.members ?? []).some(
    (member) => member.user_public_id === userPublicId
  )
}
