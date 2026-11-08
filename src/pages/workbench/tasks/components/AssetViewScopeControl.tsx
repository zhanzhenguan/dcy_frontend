import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  EnterpriseScopePicker,
  getGroupMembers,
  memberLabel,
  memberSearchText,
  resolveUngroupedMembers,
  type EnterpriseScopeOption,
  type EnterpriseScopeSection,
} from '@/components/business'
import {
  listTenantGroups,
  listTenantMembers,
  type TenantGroup,
} from '@/services/api/tenantApi'
import { useAuthStore } from '@/stores/authStore'
import { getTenantRole, isCurrentEnterpriseStaff } from '@/utils/tenantAccess'
import {
  assetViewFilterKey,
  assetViewFilterLabel,
  defaultAssetViewFilter,
  type AssetViewFilter,
} from '../types/assetViewFilter'

type AssetViewScopeControlProps = {
  value: AssetViewFilter
  onChange: (next: AssetViewFilter) => void
}

type BoundOption = EnterpriseScopeOption & {
  filter: AssetViewFilter
}

/** 资产列表「范围」：复用企业筛选器（所有 / 仅自己 / 分组整组 / 组成员 / 未入组） */
export const AssetViewScopeControl = ({
  value,
  onChange,
}: AssetViewScopeControlProps) => {
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const currentUserId = useAuthStore((state) => state.auth.user?.id ?? '')
  const role = getTenantRole(tenant)
  const enabled = isCurrentEnterpriseStaff(tenant)

  const groupsQuery = useQuery({
    queryKey: ['tenant-groups', 'asset-view-scope'],
    queryFn: listTenantGroups,
    enabled,
    staleTime: 30 * 1000,
  })

  const membersQuery = useQuery({
    queryKey: ['tenant-members', 'asset-view-scope'],
    queryFn: listTenantMembers,
    enabled: enabled && (role === 'owner' || role === 'manager'),
    staleTime: 30 * 1000,
  })

  const visibleGroups = useMemo(
    () =>
      resolveAssetViewGroups({
        groups: groupsQuery.data?.items ?? [],
        role,
        currentUserId,
      }),
    [currentUserId, groupsQuery.data?.items, role]
  )

  const ungroupedPeople = useMemo(() => {
    // Owner / Manager 可看企业全部数据，含未入组人员
    if (role !== 'owner' && role !== 'manager') return []
    return resolveUngroupedMembers(
      membersQuery.data?.items ?? [],
      visibleGroups,
      currentUserId
    )
  }, [currentUserId, membersQuery.data?.items, role, visibleGroups])

  const leadingOptions = useMemo<BoundOption[]>(() => {
    const allOption: BoundOption = {
      value: 'all',
      label: '所有',
      keywords: '所有 全部',
      filter: { kind: 'all' },
    }
    const selfOption: BoundOption = {
      value: 'self',
      label: '仅自己',
      keywords: '仅自己',
      filter: { kind: 'self' },
    }
    // 无分组时人员平铺，不展示「未入组」一级菜单
    if (visibleGroups.length > 0) return [allOption, selfOption]
    return [
      allOption,
      selfOption,
      ...ungroupedPeople.map((member) => {
        const name = memberLabel(member)
        return {
          value: `user:${member.user_public_id}`,
          label: name,
          keywords: memberSearchText(member),
          filter: {
            kind: 'user' as const,
            userPublicId: member.user_public_id,
            label: name,
          },
        }
      }),
    ]
  }, [ungroupedPeople, visibleGroups.length])

  const sections = useMemo<EnterpriseScopeSection[]>(() => {
    const result: EnterpriseScopeSection[] = visibleGroups.map((group) => {
      const people = getGroupMembers(group, currentUserId)
      return {
        id: `group:${group.public_id}`,
        heading: group.name,
        selectOption: {
          value: `group:${group.public_id}`,
          label: group.name,
          keywords: group.name.toLowerCase(),
        },
        options: people.map((member) => {
          const name = memberLabel(member)
          return {
            value: `user:${member.user_public_id}`,
            label: name,
            keywords: memberSearchText(member),
          }
        }),
      }
    })

    // 有分组时，「未入组人员」仍作为独立分组展示
    if (visibleGroups.length > 0 && ungroupedPeople.length > 0) {
      result.push({
        id: 'ungrouped',
        heading: '未入组人员',
        // 未入组不是真实分组，不可整组选中；展开后选具体人员
        options: ungroupedPeople.map((member) => {
          const name = memberLabel(member)
          return {
            value: `user:${member.user_public_id}`,
            label: name,
            keywords: memberSearchText(member),
          }
        }),
      })
    }

    return result
  }, [currentUserId, ungroupedPeople, visibleGroups])

  const optionFilterMap = useMemo(() => {
    const map = new Map<string, AssetViewFilter>()
    map.set('all', { kind: 'all' })
    map.set('self', { kind: 'self' })
    for (const group of visibleGroups) {
      map.set(`group:${group.public_id}`, {
        kind: 'group',
        groupPublicId: group.public_id,
        label: group.name,
      })
      for (const member of getGroupMembers(group, currentUserId)) {
        map.set(`user:${member.user_public_id}`, {
          kind: 'user',
          userPublicId: member.user_public_id,
          label: memberLabel(member),
        })
      }
    }
    for (const member of ungroupedPeople) {
      map.set(`user:${member.user_public_id}`, {
        kind: 'user',
        userPublicId: member.user_public_id,
        label: memberLabel(member),
      })
    }
    return map
  }, [currentUserId, ungroupedPeople, visibleGroups])

  if (!enabled) return null

  const scopeKey = assetViewFilterKey(value)
  const scopeFiltered = value.kind !== 'self'

  return (
    <EnterpriseScopePicker
      variant='filter'
      value={scopeKey}
      label={assetViewFilterLabel(value)}
      placeholder='范围'
      searchPlaceholder='搜索分组、账号…'
      leadingOptions={leadingOptions}
      sections={sections}
      active={scopeFiltered}
      onClear={() => onChange(defaultAssetViewFilter())}
      onSelect={(option) => {
        const bound = option as BoundOption
        if (bound.filter) {
          onChange(bound.filter)
          return
        }
        const next = optionFilterMap.get(option.value)
        if (next) onChange(next)
      }}
    />
  )
}

function resolveAssetViewGroups(params: {
  groups: TenantGroup[]
  role: string
  currentUserId: string
}) {
  const { groups, role, currentUserId } = params
  if (role === 'owner' || role === 'manager') return groups
  // 组长仅可见自己负责的分组（与团队「分组」页、素材空间一致）
  if (role === 'leader') {
    if (!currentUserId) return []
    return groups.filter(
      (group) => group.leader?.user_public_id === currentUserId
    )
  }
  return []
}
