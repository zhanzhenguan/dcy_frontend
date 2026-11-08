import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Pencil, Plus, RefreshCw, Search, Trash2, UserMinus, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { getApiErrorMessage } from '@/services/api/apiError'
import { isEnterpriseTenant, normalizeTenantRole } from '@/utils/tenantAccess'
import {
  addTenantGroupMember,
  createTenantGroup,
  // createTenantInvitation,
  deleteTenantGroup,
  listTenantGroups,
  listTenantMembers,
  setTenantGroupLeader,
  updateTenantGroupName,
  type TenantGroup,
  type TenantMember,
} from '@/services/api/tenantApi'
import { ConfirmDialog, NameAvatar, Pagination, ThemeSwitch } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdownMenu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageSurface } from '@/components/layout/PageSurface'
import { ProfileDropdown } from '@/components/business'

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export const OrganizationGroupsPage = ({
  embedded = false,
}: {
  embedded?: boolean
}) => {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.auth.user)
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const enabled = isEnterpriseTenant(tenant)
  const role = normalizeTenantRole(tenant?.role)
  const isLeader = role === 'leader'
  const canManageAllGroups = role === 'owner' || role === 'manager'
  const [deletingGroup, setDeletingGroup] = useState<TenantGroup | null>(null)
  const [clearingGroup, setClearingGroup] = useState<TenantGroup | null>(null)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const groupsQuery = useQuery({
    queryKey: ['tenant-groups', tenant?.public_id],
    queryFn: listTenantGroups,
    enabled,
  })
  const membersQuery = useQuery({
    queryKey: ['tenant-members', tenant?.public_id],
    queryFn: listTenantMembers,
    enabled,
  })
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tenant-groups'] }),
      queryClient.invalidateQueries({ queryKey: ['tenant-members'] }),
    ])
  const createMutation = useMutation({
    mutationFn: async ({
      name,
      leaderPublicId,
      memberPublicIds,
    }: {
      name: string
      leaderPublicId: string
      memberPublicIds: string[]
    }) => {
      const group = await createTenantGroup(name)
      const memberIds = Array.from(
        new Set([...memberPublicIds, leaderPublicId])
      )
      await addTenantGroupMember(group.public_id, memberIds)
      await setTenantGroupLeader(group.public_id, leaderPublicId)
      return group
    },
    onSuccess: () => {
      toast.success('分组已创建')
      void invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '创建分组失败')),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteTenantGroup,
    onSuccess: () => {
      toast.success('分组已删除')
      setDeletingGroup(null)
      void invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '删除分组失败')),
  })
  const renameMutation = useMutation({
    mutationFn: ({
      groupPublicId,
      name,
    }: {
      groupPublicId: string
      name: string
    }) => updateTenantGroupName(groupPublicId, name),
    onSuccess: () => {
      toast.success('分组名称已更新')
      void invalidate()
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '修改分组名称失败')),
  })
  const setMembersMutation = useMutation({
    mutationFn: ({
      groupPublicId,
      memberPublicIds,
    }: {
      groupPublicId: string
      memberPublicIds: string[]
    }) => addTenantGroupMember(groupPublicId, memberPublicIds),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.memberPublicIds.length === 0
          ? '分组成员已清空'
          : '分组成员已更新'
      )
      setClearingGroup(null)
      void invalidate()
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '更新分组成员失败')),
  })
  const leaderMutation = useMutation({
    mutationFn: ({ groupPublicId, memberPublicId }: MutationInput) =>
      setTenantGroupLeader(groupPublicId, memberPublicId),
    onSuccess: () => {
      toast.success('分组负责人已更新')
      void invalidate()
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '设置负责人失败')),
  })
  const visibleGroups = useMemo(
    () =>
      groupsQuery.data?.items.filter((group) => {
        if (!isLeader) return true
        return group.leader?.user_public_id === currentUser?.id
      }) ?? [],
    [groupsQuery.data?.items, isLeader, currentUser?.id]
  )

  const filteredGroups = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    if (!query) return visibleGroups
    return visibleGroups.filter((group) => {
      const haystack = [
        group.name,
        group.leader?.nickname,
        ...group.members.map((member) => member.nickname),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [keyword, visibleGroups])

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedGroups = useMemo(
    () =>
      filteredGroups.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      ),
    [filteredGroups, currentPage, pageSize]
  )
  const changePageSize = (size: number) => {
    setPageSize(size)
    setPage(1)
  }

  const selectableMembers = useMemo(() => {
    const allMembers = membersQuery.data?.items ?? []
    if (!isLeader) return allMembers
    const ids = new Set(
      visibleGroups.flatMap((group) =>
        group.members.map((member) => member.public_id)
      )
    )
    return allMembers.filter(
      (member) =>
        ids.has(member.public_id) || member.user_public_id === currentUser?.id
    )
  }, [membersQuery.data?.items, isLeader, visibleGroups, currentUser?.id])

  const toolbar = (
    <section className='flex flex-wrap items-center gap-2'>
      <div className='relative min-w-48 max-w-md flex-1'>
        <Search className='text-muted-foreground absolute top-2.5 left-2.5 size-4' />
        <Input
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value)
            setPage(1)
          }}
          placeholder='搜索分组、负责人、成员…'
          className='h-9 pl-8'
        />
      </div>
      <div className='ms-auto flex flex-wrap items-center gap-2'>
        {canManageAllGroups && (
          <CreateGroupDialog
            isPending={createMutation.isPending}
            leaderCandidates={groupsQuery.data?.leader_candidates ?? []}
            members={membersQuery.data?.items ?? []}
            onCreate={(payload) => createMutation.mutateAsync(payload)}
          />
        )}
        {embedded ? (
          <Button
            variant='ghost'
            size='icon'
            className='size-9'
            title='刷新分组列表'
            disabled={groupsQuery.isFetching}
            onClick={() => void groupsQuery.refetch()}
          >
            <RefreshCw
              className={
                groupsQuery.isFetching ? 'size-4 animate-spin' : 'size-4'
              }
            />
          </Button>
        ) : null}
      </div>
    </section>
  )

  const contentBlock = (
    <div className='space-y-3'>
      {!enabled && (
        <div className='border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'>
          当前还在「我的组织」。请切换到企业工作空间后再维护分组。
        </div>
      )}

      {groupsQuery.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive px-4 py-3 text-sm'>
          分组列表加载失败：{getApiErrorMessage(groupsQuery.error)}
        </div>
      )}

      <section className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>分组</TableHead>
              <TableHead>负责人</TableHead>
              <TableHead>成员</TableHead>
              <TableHead className='w-[1%] whitespace-nowrap text-right'>
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupsQuery.isLoading && <LoadingRow />}
            {pagedGroups.map((group) => (
              <GroupRow
                key={group.public_id}
                group={group}
                leaderCandidates={groupsQuery.data?.leader_candidates ?? []}
                members={selectableMembers}
                canManageGroupMeta={canManageAllGroups}
                isPending={
                  setMembersMutation.isPending ||
                  leaderMutation.isPending ||
                  deleteMutation.isPending ||
                  renameMutation.isPending
                }
                onRename={(name) =>
                  renameMutation.mutateAsync({
                    groupPublicId: group.public_id,
                    name,
                  })
                }
                onSetMembers={(memberPublicIds) =>
                  setMembersMutation.mutateAsync({
                    groupPublicId: group.public_id,
                    memberPublicIds,
                  })
                }
                onSetLeader={(memberPublicId) =>
                  leaderMutation.mutate({
                    groupPublicId: group.public_id,
                    memberPublicId,
                  })
                }
                onClearMembers={() => setClearingGroup(group)}
                onDelete={() => {
                  if (group.members.length > 0) {
                    toast.error(
                      `「${group.name}」下还有 ${group.members.length} 名员工，请先清空分组内成员后再删除`
                    )
                    return
                  }
                  setDeletingGroup(group)
                }}
              />
            ))}
            {groupsQuery.data && filteredGroups.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className='text-muted-foreground h-28 text-center'
                >
                  {keyword.trim()
                    ? '没有匹配的分组'
                    : isLeader
                      ? '你当前没有负责的分组。'
                      : '暂无分组，请先创建一个分组。'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination
          className='border-t px-4'
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredGroups.length}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
        />
      </section>
    </div>
  )

  const dialogs = (
    <>
      <ConfirmDialog
        open={Boolean(clearingGroup)}
        onOpenChange={(open) => !open && setClearingGroup(null)}
        title='清空分组成员'
        desc={`确定清空分组「${clearingGroup?.name ?? ''}」下的全部 ${clearingGroup?.members.length ?? 0} 名员工吗？清空后可再重新添加。`}
        cancelBtnText='取消'
        confirmText='确认清空'
        destructive
        isLoading={setMembersMutation.isPending}
        handleConfirm={() => {
          if (!clearingGroup) return
          setMembersMutation.mutate({
            groupPublicId: clearingGroup.public_id,
            memberPublicIds: [],
          })
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingGroup)}
        onOpenChange={(open) => !open && setDeletingGroup(null)}
        title='删除分组'
        desc={`确定删除分组「${deletingGroup?.name ?? ''}」吗？删除后不可恢复。`}
        cancelBtnText='取消'
        confirmText='确认删除'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => {
          if (!deletingGroup) return
          if (deletingGroup.members.length > 0) {
            toast.error(
              `「${deletingGroup.name}」下还有员工，请先清空分组内成员后再删除`
            )
            setDeletingGroup(null)
            return
          }
          deleteMutation.mutate(deletingGroup.public_id)
        }}
      />
    </>
  )

  if (embedded) {
    return (
      <>
        <div className='space-y-4'>
          {toolbar}
          {contentBlock}
        </div>
        {dialogs}
      </>
    )
  }

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <UsersRound className='text-primary size-5 shrink-0' />
          <span className='truncate font-medium'>分组</span>
          {tenant?.company_name && (
            <Badge variant='outline' className='hidden sm:inline-flex'>
              {tenant.company_name}
            </Badge>
          )}
        </div>
        <div className='ms-auto flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='size-9'
            title='刷新分组列表'
            disabled={groupsQuery.isFetching}
            onClick={() => void groupsQuery.refetch()}
          >
            <RefreshCw
              className={groupsQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
            />
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-4'>
        {toolbar}
        <PageSurface className='space-y-4'>{contentBlock}</PageSurface>
      </Main>
      {dialogs}
    </>
  )
}

type MutationInput = { groupPublicId: string; memberPublicId: string }

function LoadingRow() {
  return (
    <TableRow>
      <TableCell colSpan={4} className='text-muted-foreground h-28 text-center'>
        正在加载分组...
      </TableCell>
    </TableRow>
  )
}

function CreateGroupDialog({
  isPending,
  leaderCandidates,
  members,
  onCreate,
}: {
  isPending: boolean
  leaderCandidates: TenantMember[]
  members: TenantMember[]
  onCreate: (payload: {
    name: string
    leaderPublicId: string
    memberPublicIds: string[]
  }) => Promise<unknown>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [leaderPublicId, setLeaderPublicId] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  const reset = () => {
    setName('')
    setLeaderPublicId('')
    setSelectedMemberIds([])
  }

  const toggleMember = (memberPublicId: string, checked: boolean) => {
    setSelectedMemberIds((current) =>
      checked
        ? current.includes(memberPublicId)
          ? current
          : [...current, memberPublicId]
        : current.filter((id) => id !== memberPublicId)
    )
  }

  async function submit() {
    const value = name.trim()
    if (!value) {
      toast.error('请输入名称')
      return
    }
    if (!leaderPublicId) {
      toast.error('请选择负责人')
      return
    }
    if (selectedMemberIds.length === 0) {
      toast.error('请至少选择一名成员')
      return
    }
    try {
      await onCreate({
        name: value,
        leaderPublicId,
        memberPublicIds: selectedMemberIds,
      })
      setOpen(false)
      reset()
    } catch {
      // 错误提示由 mutation 统一处理。
    }
  }

  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(leaderPublicId) &&
    selectedMemberIds.length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) reset()
      }}
    >
      <Button size='sm' onClick={() => setOpen(true)}>
        <Plus className='size-4' />
        新建分组
      </Button>
      <DialogContent className='sm:max-w-[800px]'>
        <DialogHeader>
          <DialogTitle>新建分组</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='create-group-name'>名称</Label>
            <Input
              id='create-group-name'
              value={name}
              maxLength={128}
              placeholder='输入名称'
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label>负责人</Label>
            <Select
              value={leaderPublicId || undefined}
              onValueChange={(value) => {
                setLeaderPublicId(value)
                setSelectedMemberIds((current) =>
                  current.includes(value) ? current : [...current, value]
                )
              }}
              disabled={leaderCandidates.length === 0}
            >
              <SelectTrigger className='w-full' aria-label='选择分组负责人'>
                <SelectValue placeholder='选择负责人' />
              </SelectTrigger>
              <SelectContent>
                {leaderCandidates.map((member) => (
                  <SelectItem key={member.public_id} value={member.public_id}>
                    {member.nickname}（{member.role.name}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {leaderCandidates.length === 0 && (
              <p className='text-muted-foreground text-xs'>
                暂无可选负责人，请先邀请具备负责人资格的成员。
              </p>
            )}
          </div>
          <div className='space-y-2'>
            <Label>成员</Label>
            <div className='max-h-56 space-y-1 overflow-y-auto rounded-md border p-2'>
              {members.length === 0 ? (
                <p className='text-muted-foreground px-2 py-6 text-center text-sm'>
                  暂无企业员工
                </p>
              ) : (
                members.map((member) => {
                  const checked = selectedMemberIds.includes(member.public_id)
                  const checkboxId = `create-group-member-${member.public_id}`
                  const isLeader = member.public_id === leaderPublicId
                  return (
                    <Label
                      key={member.public_id}
                      htmlFor={checkboxId}
                      className='hover:bg-muted/60 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2'
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={checked}
                        disabled={isLeader}
                        onCheckedChange={(value) =>
                          toggleMember(member.public_id, value === true)
                        }
                      />
                      <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                        {member.nickname}
                        <span className='text-muted-foreground font-normal'>
                          （{member.role.name}）
                        </span>
                      </span>
                      {isLeader && (
                        <Badge variant='outline' className='shrink-0 text-[10px]'>
                          负责人
                        </Badge>
                      )}
                    </Label>
                  )
                })
              )}
            </div>
            <p className='text-muted-foreground text-xs'>
              已选 {selectedMemberIds.length} 人
              {leaderPublicId ? '（负责人已自动加入）' : ''}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            disabled={isPending || !canSubmit}
            onClick={() => void submit()}
          >
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GroupRow({
  group,
  leaderCandidates,
  members,
  canManageGroupMeta,
  isPending,
  onRename,
  onSetMembers,
  onSetLeader,
  onClearMembers,
  onDelete,
}: {
  group: TenantGroup
  leaderCandidates: TenantMember[]
  members: TenantMember[]
  canManageGroupMeta: boolean
  isPending: boolean
  onRename: (name: string) => Promise<unknown>
  onSetMembers: (memberPublicIds: string[]) => Promise<unknown>
  onSetLeader: (memberPublicId: string) => void
  onClearMembers: () => void
  onDelete: () => void
}) {
  const existingMemberIds = group.members.map((member) => member.public_id)
  const [manageOpen, setManageOpen] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const hasMembers = group.members.length > 0
  const canManageMembers = members.length > 0
  const deleteTitle = hasMembers
    ? `请先清空分组内 ${group.members.length} 名员工后再删除`
    : `删除 ${group.name}`
  const openManageDialog = () => {
    setSelectedMemberIds(existingMemberIds)
    setManageOpen(true)
  }

  return (
    <TableRow>
      <TableCell>
        <div className='flex min-w-40 items-center gap-1.5'>
          <span className='font-medium'>{group.name}</span>
          <RenameGroupDialog
            groupName={group.name}
            isPending={isPending}
            onRename={onRename}
          />
        </div>
      </TableCell>
      <TableCell>
        {canManageGroupMeta ? (
          <Select
            value={group.leader?.public_id ?? undefined}
            disabled={isPending || leaderCandidates.length === 0}
            onValueChange={onSetLeader}
          >
            <SelectTrigger
              className='h-8 min-w-40 max-w-56'
              aria-label={`设置 ${group.name} 的负责人`}
            >
              <SelectValue placeholder='选择负责人' />
            </SelectTrigger>
            <SelectContent>
              {leaderCandidates.map((member) => (
                <SelectItem key={member.public_id} value={member.public_id}>
                  {member.nickname}（{member.role.name}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className='text-sm'>
            {group.leader?.nickname ?? (
              <span className='text-muted-foreground'>未设置</span>
            )}
          </span>
        )}
      </TableCell>
      <TableCell>
        <div className='flex min-w-56 flex-wrap items-center gap-1.5'>
          {group.members.map((member) => (
            <MemberBadge key={member.public_id} member={member} />
          ))}
          {group.members.length === 0 && (
            <span className='text-muted-foreground text-sm'>暂无成员</span>
          )}
        </div>
      </TableCell>
      <TableCell className='text-right'>
        <div className='hidden items-center justify-end gap-1.5 whitespace-nowrap md:flex'>
          <Button
            size='sm'
            variant='outline'
            className='h-8 gap-1.5'
            disabled={isPending || !canManageMembers}
            onClick={openManageDialog}
          >
            <Plus className='size-3.5' />
            管理成员
          </Button>
          {hasMembers && (
            <Button
              size='icon'
              variant='outline'
              className='size-8'
              title={`清空 ${group.name} 的成员`}
              disabled={isPending}
              onClick={onClearMembers}
            >
              <UserMinus className='size-3.5' />
            </Button>
          )}
          {canManageGroupMeta && (
            <Button
              variant='ghost'
              size='icon'
              className='size-8'
              title={deleteTitle}
              disabled={isPending}
              onClick={onDelete}
            >
              <Trash2 className='text-destructive size-3.5' />
            </Button>
          )}
        </div>

        <div className='md:hidden'>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                disabled={isPending}
                aria-label={`${group.name} 操作`}
              >
                <MoreHorizontal className='size-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-40'>
              <DropdownMenuItem
                disabled={!canManageMembers}
                onClick={openManageDialog}
              >
                <Plus className='size-4' />
                管理成员
              </DropdownMenuItem>
              {hasMembers && (
                <DropdownMenuItem onClick={onClearMembers}>
                  <UserMinus className='size-4' />
                  清空成员
                </DropdownMenuItem>
              )}
              {canManageGroupMeta && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant='destructive'
                    title={deleteTitle}
                    onClick={onDelete}
                  >
                    <Trash2 className='size-4' />
                    删除分组
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ManageMembersDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          members={members}
          existingMemberIds={existingMemberIds}
          selectedIds={selectedMemberIds}
          onSelectedIdsChange={setSelectedMemberIds}
          isPending={isPending}
          onSave={onSetMembers}
        />
      </TableCell>
    </TableRow>
  )
}

function RenameGroupDialog({
  groupName,
  isPending,
  onRename,
}: {
  groupName: string
  isPending: boolean
  onRename: (name: string) => Promise<unknown>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(groupName)

  async function submit() {
    const value = name.trim()
    if (!value) {
      toast.error('请输入名称')
      return
    }
    if (value === groupName) {
      setOpen(false)
      return
    }
    try {
      await onRename(value)
      setOpen(false)
    } catch {
      // 错误提示由 mutation 统一处理。
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setName(groupName)
      }}
    >
      <Button
        variant='ghost'
        size='icon'
        className='size-7'
        title={`修改 ${groupName} 名称`}
        disabled={isPending}
        onClick={() => setOpen(true)}
      >
        <Pencil className='size-3.5' />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改名称</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          maxLength={128}
          placeholder='输入名称'
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submit()
          }}
        />
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            disabled={isPending || !name.trim()}
            onClick={() => void submit()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ManageMembersDialog({
  open,
  onOpenChange,
  members,
  existingMemberIds,
  selectedIds,
  onSelectedIdsChange,
  isPending,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: TenantMember[]
  existingMemberIds: string[]
  selectedIds: string[]
  onSelectedIdsChange: (memberPublicIds: string[]) => void
  isPending: boolean
  onSave: (memberPublicIds: string[]) => Promise<unknown>
}) {
  const existingIdSet = new Set(existingMemberIds)

  const toggleMember = (memberPublicId: string, checked: boolean) => {
    onSelectedIdsChange(
      checked
        ? selectedIds.includes(memberPublicId)
          ? selectedIds
          : [...selectedIds, memberPublicId]
        : selectedIds.filter((id) => id !== memberPublicId)
    )
  }

  async function submit() {
    try {
      await onSave(selectedIds)
      onOpenChange(false)
      onSelectedIdsChange([])
    } catch {
      // 错误提示由 mutation 统一处理。
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) onSelectedIdsChange([])
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>管理分组成员</DialogTitle>
        </DialogHeader>
        <p className='text-muted-foreground text-xs'>
          勾选加入、取消勾选移出；全部取消后保存即可清空该分组。
        </p>
        <div className='max-h-72 space-y-1 overflow-y-auto rounded-md border p-2'>
          {members.length === 0 ? (
            <p className='text-muted-foreground px-2 py-6 text-center text-sm'>
              暂无企业员工
            </p>
          ) : (
            members.map((member) => {
              const checked = selectedIds.includes(member.public_id)
              const alreadyInGroup = existingIdSet.has(member.public_id)
              const checkboxId = `group-member-${member.public_id}`
              return (
                <Label
                  key={member.public_id}
                  htmlFor={checkboxId}
                  className='hover:bg-muted/60 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2'
                >
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleMember(member.public_id, value === true)
                    }
                  />
                  <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                    {member.nickname}
                    <span className='text-muted-foreground font-normal'>
                      （{member.role.name}）
                    </span>
                  </span>
                  {alreadyInGroup && (
                    <Badge variant='outline' className='shrink-0 text-[10px]'>
                      已在组内
                    </Badge>
                  )}
                </Label>
              )
            })
          )}
        </div>
        <p className='text-muted-foreground text-xs'>
          共 {members.length} 名员工，已选 {selectedIds.length} 人
        </p>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={isPending} onClick={() => void submit()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MemberBadge({ member }: { member: TenantMember }) {
  return (
    <Badge variant='secondary' className='gap-1.5 py-1 pl-1 pr-2 font-normal'>
      <NameAvatar
        name={member.nickname}
        src={member.avatar_url}
        className='size-4'
        fallbackClassName='text-[8px]'
      />
      {member.nickname}
    </Badge>
  )
}
