import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useSessionTenant } from '@/hooks/useSessionTenant'
import {
  collectGroupedUserIds,
  isUserInGroup,
  resolveUngroupedMembers,
} from '@/components/business'
import {
  listTenantGroups,
  listTenantMembers,
  type TenantGroup,
  type TenantMember,
} from '@/services/api/tenantApi'
import { getTenantRole } from '@/utils/tenantAccess'
import {
  type AccountScopeSelection,
  type ManagedAccount,
} from '../types'

/** plain：仅列表；groups：有分组；flat-members：无分组时平铺员工 */
export type AccountDirectoryMode = 'plain' | 'groups' | 'flat-members'

export const personalScopeSelection = (): AccountScopeSelection => ({
  kind: 'personal',
  label: '我的账号',
})

/** 企业 Tab 已选、尚未选择具体员工 */
export const enterpriseScopeSelection = (): AccountScopeSelection => ({
  kind: 'enterprise',
  label: '企业',
})

export function resolveAccountOwnerId(
  account: ManagedAccount,
  currentUserId: string
) {
  if (!account.ownerUserId || account.ownerUserId === 'self') {
    return currentUserId
  }
  return account.ownerUserId
}

export function filterAccountsByScope(
  accounts: ManagedAccount[],
  selection: AccountScopeSelection,
  currentUserId: string,
  groups: TenantGroup[]
) {
  if (selection.kind === 'personal') {
    return accounts.filter(
      (account) =>
        resolveAccountOwnerId(account, currentUserId) === currentUserId
    )
  }

  if (selection.kind === 'enterprise') {
    return []
  }

  if (selection.kind === 'member' && selection.userPublicId) {
    return accounts.filter(
      (account) =>
        resolveAccountOwnerId(account, currentUserId) ===
        selection.userPublicId
    )
  }

  if (selection.kind === 'group' && selection.groupPublicId) {
    const group = groups.find(
      (item) => item.public_id === selection.groupPublicId
    )
    const memberIds = new Set(
      (group?.members ?? []).map((member) => member.user_public_id)
    )
    if (group?.leader?.user_public_id) {
      memberIds.add(group.leader.user_public_id)
    }
    return accounts.filter((account) =>
      memberIds.has(resolveAccountOwnerId(account, currentUserId))
    )
  }

  return []
}

/** 将 mock 账号挂到真实成员上，便于演示分组查看 */
export function seedAccountOwners(
  accounts: ManagedAccount[],
  members: TenantMember[],
  currentUserId: string
) {
  if (!currentUserId) return accounts
  const others = members.filter(
    (member) => member.user_public_id !== currentUserId
  )
  return accounts.map((account, index) => {
    if (account.ownerUserId && account.ownerUserId !== 'self') {
      return account
    }
    if (index < 2 || others.length === 0) {
      return { ...account, ownerUserId: currentUserId }
    }
    const other = others[(index - 2) % others.length]
    return { ...account, ownerUserId: other.user_public_id }
  })
}

/** 当前用户是否属于该分组（负责人或成员） */
export { isUserInGroup, collectGroupedUserIds, resolveUngroupedMembers }

/**
 * 账号目录可见分组（与数据权限一致）：
 * - Owner / Manager：企业全部分组
 * - Leader：仅自己负责的分组
 * - Member / 个人租户：无分组
 */
export function resolveVisibleGroups(params: {
  groups: TenantGroup[]
  role: string
  isEnterprise: boolean
  currentUserId: string
}) {
  const { groups, role, isEnterprise, currentUserId } = params
  if (!isEnterprise) return []
  if (role === 'owner' || role === 'manager') return groups
  if (role === 'leader') {
    if (!currentUserId) return []
    return groups.filter(
      (group) => group.leader?.user_public_id === currentUserId
    )
  }
  return []
}

/** 角色是否可能使用账号目录（企业 + Owner / Manager / Leader） */
export function resolveScopeSidebarRole(params: {
  role: string
  isEnterprise: boolean
  isPersonal: boolean
}) {
  const { role, isEnterprise, isPersonal } = params
  if (!isEnterprise || isPersonal) return false
  return role === 'owner' || role === 'manager' || role === 'leader'
}

/**
 * 目录模式：
 * 1. 个人 / 企业仅 1 人 / 普通成员 → plain（只列表）
 * 2. 有可见分组 → groups（我的账号 / 企业 → 分组、未入组员工）
 * 3. 无分组但多人（Owner/Manager）→ flat-members（无 Tab，平铺选员工）
 * 4. Leader 无可视分组 → plain
 */
export function resolveAccountDirectoryMode(params: {
  role: string
  isEnterprise: boolean
  isPersonal: boolean
  enterpriseMemberCount: number | null
  visibleGroupCount: number
  groupsReady: boolean
}): AccountDirectoryMode {
  const {
    role,
    isEnterprise,
    isPersonal,
    enterpriseMemberCount,
    visibleGroupCount,
    groupsReady,
  } = params

  if (!resolveScopeSidebarRole({ role, isEnterprise, isPersonal })) {
    return 'plain'
  }
  if (enterpriseMemberCount === null || enterpriseMemberCount <= 1) {
    return 'plain'
  }
  if (!groupsReady) {
    // 分组未就绪前先 plain，避免无分组企业闪出 Tab
    return 'plain'
  }
  if (visibleGroupCount > 0) return 'groups'
  if (role === 'owner' || role === 'manager') return 'flat-members'
  return 'plain'
}

/** 「员工」（未分配组）：仅 Owner 在「有分组」模式下可见。Manager / Leader 不可见。 */
export function resolveStaffMembers(
  members: TenantMember[],
  groups: TenantGroup[],
  role: string,
  currentUserId?: string
) {
  if (role !== 'owner') return []
  return resolveUngroupedMembers(members, groups, currentUserId)
}

/** 无分组时平铺的其它员工（排除自己）；Owner / Manager */
export function resolveFlatMembers(
  members: TenantMember[],
  role: string,
  currentUserId?: string
) {
  if (role !== 'owner' && role !== 'manager') return []
  return members.filter((member) => {
    if (!currentUserId) return true
    return member.user_public_id !== currentUserId
  })
}

export function useAccountScopeAccess() {
  const currentUserId = useAuthStore((state) => state.auth.user?.id ?? '')
  const { tenant, isEnterprise, isPersonal } = useSessionTenant()
  const role = getTenantRole(tenant)

  const roleCanUseScopeSidebar = resolveScopeSidebarRole({
    role,
    isEnterprise,
    isPersonal,
  })

  /** 有分组模式下的「员工」节点仅 Owner 可见 */
  const canViewStaffDirectory = role === 'owner'

  const membersQuery = useQuery({
    queryKey: ['tenant-members', 'account-management'],
    queryFn: listTenantMembers,
    enabled: roleCanUseScopeSidebar,
    staleTime: 30 * 1000,
    retry: false,
  })

  const enterpriseMemberCount = membersQuery.isSuccess
    ? (membersQuery.data?.items?.length ?? 0)
    : null

  const multiMemberEnterprise =
    roleCanUseScopeSidebar &&
    enterpriseMemberCount !== null &&
    enterpriseMemberCount > 1

  const groupsQuery = useQuery({
    queryKey: ['tenant-groups', 'account-management'],
    queryFn: listTenantGroups,
    enabled: multiMemberEnterprise,
    staleTime: 30 * 1000,
    retry: false,
  })

  const allGroups = groupsQuery.data?.items ?? []
  const allMembers = membersQuery.data?.items ?? []

  const visibleGroups = useMemo(
    () =>
      resolveVisibleGroups({
        groups: allGroups,
        role,
        isEnterprise,
        currentUserId,
      }),
    [allGroups, currentUserId, isEnterprise, role]
  )

  const directoryMode = useMemo(
    () =>
      resolveAccountDirectoryMode({
        role,
        isEnterprise,
        isPersonal,
        enterpriseMemberCount,
        visibleGroupCount: visibleGroups.length,
        groupsReady: groupsQuery.isSuccess || groupsQuery.isError,
      }),
    [
      enterpriseMemberCount,
      groupsQuery.isError,
      groupsQuery.isSuccess,
      isEnterprise,
      isPersonal,
      role,
      visibleGroups.length,
    ]
  )

  const showScopeSidebar =
    directoryMode === 'groups' || directoryMode === 'flat-members'

  const staffMembers = useMemo(
    () =>
      directoryMode === 'groups' && canViewStaffDirectory
        ? resolveStaffMembers(allMembers, allGroups, role, currentUserId)
        : [],
    [
      allGroups,
      allMembers,
      canViewStaffDirectory,
      currentUserId,
      directoryMode,
      role,
    ]
  )

  const flatMembers = useMemo(
    () =>
      directoryMode === 'flat-members'
        ? resolveFlatMembers(allMembers, role, currentUserId)
        : [],
    [allMembers, currentUserId, directoryMode, role]
  )

  /** flat：全部其它员工；groups：未入组员工 */
  const directoryMembers =
    directoryMode === 'flat-members' ? flatMembers : staffMembers

  const isPlainList = !showScopeSidebar

  const canCreateInSelection = (selection: AccountScopeSelection) => {
    return (
      selection.kind === 'personal' ||
      selection.userPublicId === currentUserId
    )
  }

  const canManageAccount = (account: ManagedAccount) => {
    if (!currentUserId) return false
    return resolveAccountOwnerId(account, currentUserId) === currentUserId
  }

  return {
    currentUserId,
    role,
    isEnterprise,
    isPersonal,
    directoryMode,
    showScopeSidebar,
    isPlainList,
    visibleGroups,
    staffMembers,
    flatMembers,
    directoryMembers,
    canViewStaffDirectory,
    groupsQuery,
    membersQuery,
    canCreateInSelection,
    canManageAccount,
    personalSelection: personalScopeSelection(),
  }
}

/** 当前选中范围若已不可见，回退到「我的账号」 */
export function useClampAccountSelection(
  selection: AccountScopeSelection,
  setSelection: (value: AccountScopeSelection) => void,
  directoryMode: AccountDirectoryMode,
  visibleGroups: TenantGroup[],
  directoryMembers: TenantMember[],
  currentUserId?: string
) {
  useEffect(() => {
    if (directoryMode === 'plain') {
      if (selection.kind !== 'personal') {
        setSelection(personalScopeSelection())
      }
      return
    }

    if (selection.kind === 'personal') return

    if (selection.kind === 'enterprise') {
      if (directoryMode !== 'groups') {
        setSelection(personalScopeSelection())
      }
      return
    }

    if (
      selection.kind === 'member' &&
      currentUserId &&
      selection.userPublicId === currentUserId
    ) {
      setSelection(personalScopeSelection())
      return
    }

    // flat / 有分组下的「员工」：按 directoryMembers 校验
    if (selection.kind === 'member' && !selection.groupPublicId) {
      const stillVisible = directoryMembers.some(
        (member) => member.public_id === selection.memberPublicId
      )
      if (!stillVisible) setSelection(personalScopeSelection())
      return
    }

    if (directoryMode === 'flat-members') {
      setSelection(personalScopeSelection())
      return
    }

    // groups 模式：校验分组节点
    if (visibleGroups.length === 0) {
      setSelection(personalScopeSelection())
      return
    }

    const groupId = selection.groupPublicId
    const groupVisible = visibleGroups.some(
      (group) => group.public_id === groupId
    )
    if (!groupVisible) {
      setSelection(personalScopeSelection())
    }
  }, [
    currentUserId,
    directoryMembers,
    directoryMode,
    selection,
    setSelection,
    visibleGroups,
  ])
}
