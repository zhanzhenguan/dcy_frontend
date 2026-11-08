import { useMemo } from 'react'
import { Building2, UsersRound } from 'lucide-react'
import { AnimatedTabs } from '@/components/common'
import {
  EnterpriseScopePicker,
  getGroupMembers,
  memberLabel,
  memberSearchText,
  type EnterpriseScopeOption,
  type EnterpriseScopeSection,
} from '@/components/business'
import { cn } from '@/utils/utils'
import type { TenantGroup, TenantMember } from '@/services/api/tenantApi'
import type { AccountDirectoryMode } from '../hooks/useAccountScopeAccess'
import {
  personalScopeSelection,
  enterpriseScopeSelection,
} from '../hooks/useAccountScopeAccess'
import type { AccountScopeSelection } from '../types'

type AccountScopeToolbarProps = {
  mode: Extract<AccountDirectoryMode, 'groups' | 'flat-members'>
  selection: AccountScopeSelection
  onSelect: (value: AccountScopeSelection) => void
  groups: TenantGroup[]
  /** groups：未入组员工；flat-members：全部其它员工 */
  members?: TenantMember[]
  showStaff?: boolean
  currentUserId?: string
  loading?: boolean
  /** tabs：仅 groups；filter：下拉（与搜索同行） */
  part?: 'tabs' | 'filter'
  className?: string
}

type BoundOption = EnterpriseScopeOption & {
  selection: AccountScopeSelection
}

function encodeGroupMember(groupPublicId: string, memberPublicId: string) {
  return `group-member:${groupPublicId}:${memberPublicId}`
}

function encodeStaff(memberPublicId: string) {
  return `staff:${memberPublicId}`
}

function selectionToValue(selection: AccountScopeSelection): string {
  if (selection.kind === 'personal') return 'personal'
  if (selection.kind === 'enterprise') return ''
  if (selection.kind === 'group' && selection.groupPublicId) {
    return `group:${selection.groupPublicId}`
  }
  if (selection.kind === 'member' && selection.memberPublicId) {
    if (selection.groupPublicId) {
      return encodeGroupMember(
        selection.groupPublicId,
        selection.memberPublicId
      )
    }
    return encodeStaff(selection.memberPublicId)
  }
  return ''
}

export const AccountScopeToolbar = ({
  mode,
  selection,
  onSelect,
  groups,
  members = [],
  showStaff = false,
  currentUserId,
  loading,
  part = 'tabs',
  className,
}: AccountScopeToolbarProps) => {
  const personal = personalScopeSelection()
  const primary = selection.kind === 'personal' ? 'personal' : 'enterprise'
  const scopeValue = selectionToValue(selection)
  const staffMembers = showStaff ? members : []

  const enterpriseSections = useMemo<EnterpriseScopeSection[]>(() => {
    const result: EnterpriseScopeSection[] = groups.map((group) => {
      const groupMembers = getGroupMembers(group, currentUserId)
      return {
        id: `group:${group.public_id}`,
        heading: group.name,
        options: groupMembers.map((member) => {
          const name = memberLabel(member)
          return {
            value: encodeGroupMember(group.public_id, member.public_id),
            label: name,
            keywords: memberSearchText(member),
          }
        }),
      }
    })

    if (staffMembers.length > 0) {
      result.push({
        id: 'staff',
        heading: '未入组员工',
        options: staffMembers.map((member) => {
          const name = memberLabel(member)
          return {
            value: encodeStaff(member.public_id),
            label: name,
            keywords: memberSearchText(member),
          }
        }),
      })
    }

    return result
  }, [currentUserId, groups, staffMembers])

  const enterpriseOptionMap = useMemo(() => {
    const map = new Map<string, AccountScopeSelection>()
    for (const group of groups) {
      for (const member of getGroupMembers(group, currentUserId)) {
        const name = memberLabel(member)
        map.set(encodeGroupMember(group.public_id, member.public_id), {
          kind: 'member',
          label: name,
          groupPublicId: group.public_id,
          userPublicId: member.user_public_id,
          memberPublicId: member.public_id,
        })
      }
    }
    for (const member of staffMembers) {
      const name = memberLabel(member)
      map.set(encodeStaff(member.public_id), {
        kind: 'member',
        label: name,
        userPublicId: member.user_public_id,
        memberPublicId: member.public_id,
      })
    }
    return map
  }, [currentUserId, groups, staffMembers])

  const flatLeading = useMemo<BoundOption[]>(() => {
    const personalOption = personalScopeSelection()
    return [
      {
        value: 'personal',
        label: personalOption.label,
        keywords: personalOption.label.toLowerCase(),
        selection: personalOption,
      },
      ...members.map((member) => {
        const name = memberLabel(member)
        const selectionValue: AccountScopeSelection = {
          kind: 'member',
          label: name,
          userPublicId: member.user_public_id,
          memberPublicId: member.public_id,
        }
        return {
          value: encodeStaff(member.public_id),
          label: name,
          keywords: memberSearchText(member),
          selection: selectionValue,
        }
      }),
    ]
  }, [members])

  const handlePrimaryChange = (tab: string) => {
    if (tab === 'personal') {
      onSelect(personal)
      return
    }
    if (selection.kind === 'personal') {
      onSelect(enterpriseScopeSelection())
    }
  }

  if (loading) {
    if (part === 'filter') return null
    return (
      <div className={cn('text-muted-foreground text-xs', className)}>
        正在加载目录...
      </div>
    )
  }

  const enterpriseActive =
    primary === 'enterprise' &&
    (scopeValue.startsWith('group') || scopeValue.startsWith('staff'))

  if (part === 'tabs') {
    if (mode !== 'groups') return null
    return (
      <AnimatedTabs
        variant='pill'
        size='md'
        value={primary}
        onValueChange={handlePrimaryChange}
        items={[
          { value: 'personal', label: '我的账号' },
          { value: 'enterprise', label: '企业' },
        ]}
        className={cn('w-fit shrink-0', className)}
        listClassName='border bg-background shadow-none'
      />
    )
  }

  if (mode === 'flat-members') {
    return (
      <EnterpriseScopePicker
        value={scopeValue || 'personal'}
        label={selection.label}
        placeholder='选择账号'
        searchPlaceholder='搜索账号…'
        icon={
          <UsersRound className='text-muted-foreground size-3.5 shrink-0' />
        }
        sections={[]}
        leadingOptions={flatLeading}
        flat
        active
        onSelect={(option) => {
          const bound = flatLeading.find((item) => item.value === option.value)
          if (bound) onSelect(bound.selection)
        }}
        className={className}
      />
    )
  }

  if (primary !== 'enterprise') return null

  return (
    <EnterpriseScopePicker
      value={enterpriseActive ? scopeValue : ''}
      label={enterpriseActive ? selection.label : ''}
      placeholder='选择账号'
      searchPlaceholder='搜索分组、账号…'
      icon={
        <Building2 className='text-muted-foreground size-3.5 shrink-0' />
      }
      sections={enterpriseSections}
      active={enterpriseActive}
      onSelect={(option) => {
        const next = enterpriseOptionMap.get(option.value)
        if (next) onSelect(next)
      }}
      className={className}
    />
  )
}
