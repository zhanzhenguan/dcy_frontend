import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, LogOut, RefreshCw, Search, ShieldCheck, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { isEnterpriseTenant, normalizeTenantRole } from '@/utils/tenantAccess';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InviteTenantMemberDialog, ProfileDropdown } from '@/components/business';
import { Pagination, UserAvatar, ThemeSwitch } from '@/components/common'
import { PageSurface } from '@/components/layout/PageSurface';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { getApiErrorMessage } from '@/services/api/apiError';
import { listTenantGroups, listTenantMembers, createTenantInvitation, createOffboardingPreview, confirmOffboarding, listOffboardingAudits, type OffboardingAudit, updateTenantMemberRole, type OffboardingPreview, type TenantMember, type TenantRole } from '@/services/api/tenantApi';
import { offboardingCleanupFailureDetails, offboardingPrimaryAction, offboardingPreviewErrorMessage, offboardingPreviewSummary } from './offboardingPreviewState';


const dataScopeLabel: Record<TenantRole['data_scope'], string> = {
  all: '全部数据',
  group: '本组数据',
  self: '个人数据',
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export const OrganizationMembersPage = ({
  embedded = false,
}: {
  embedded?: boolean
}) => {
  const queryClient = useQueryClient()
  const [offboardingMember, setOffboardingMember] =
    useState<TenantMember | null>(null)
  const [offboardingAuditsOpen, setOffboardingAuditsOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const currentUser = useAuthStore((state) => state.auth.user)
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const role = normalizeTenantRole(tenant?.role)
  const isLeader = role === 'leader'
  const canEditRoles = role === 'owner' || role === 'manager'
  const enabled = isEnterpriseTenant(tenant)
  const membersQuery = useQuery({
    queryKey: ['tenant-members', tenant?.public_id],
    queryFn: listTenantMembers,
    enabled,
  })
  const groupsQuery = useQuery({
    queryKey: ['tenant-groups', tenant?.public_id],
    queryFn: listTenantGroups,
    enabled: enabled && (isLeader || role === 'owner'),
  })
  const updateMutation = useMutation({
    mutationFn: ({
      memberPublicId,
      rolePublicId,
    }: {
      memberPublicId: string
      rolePublicId: string
    }) => updateTenantMemberRole(memberPublicId, rolePublicId),
    onSuccess: () => {
      toast.success('成员角色已更新')
      void queryClient.invalidateQueries({ queryKey: ['tenant-members'] })
      void queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '更新成员角色失败')),
  })
  const inviteMutation = useMutation({
    mutationFn: createTenantInvitation,
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '生成邀请链接失败')),
  })
  const data = membersQuery.data

  const auditsQuery = useQuery({
    queryKey: ['offboarding-audits', tenant?.public_id],
    queryFn: listOffboardingAudits,
    enabled: enabled && role === 'owner' && offboardingAuditsOpen,
  })

  const leaderGroupMemberIds = new Set(
    (groupsQuery.data?.items ?? [])
      .filter((group) => group.leader?.user_public_id === currentUser?.id)
      .flatMap((group) => group.members.map((member) => member.public_id))
  )

  const visibleMembers =
    data?.items.filter((member) => {
      if (!isLeader) return true
      return (
        leaderGroupMemberIds.has(member.public_id) ||
        member.user_public_id === currentUser?.id
      )
    }) ?? []

  const filteredMembers = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    if (!query) return visibleMembers
    return visibleMembers.filter((member) => {
      const haystack = [
        member.nickname,
        member.email,
        member.role?.name,
        member.role?.code,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [keyword, visibleMembers])

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedMembers = useMemo(
    () =>
      filteredMembers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      ),
    [filteredMembers, currentPage, pageSize]
  )

  const changePageSize = (size: number) => {
    setPageSize(size)
    setPage(1)
  }

  const membersLoading =
    membersQuery.isLoading || (isLeader && groupsQuery.isLoading)

  const refreshing = membersQuery.isFetching || groupsQuery.isFetching

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
          placeholder='搜索成员昵称、邮箱、角色…'
          className='h-9 pl-8'
        />
      </div>
      <div className='ms-auto flex flex-wrap items-center gap-2'>
        {data ? (
          <Badge className='gap-1.5 font-normal' variant='secondary'>
            <ShieldCheck className='size-3.5' />
            {roleLabel(data.current_role, data.roles)}
          </Badge>
        ) : null}
        {data ? (
          <InviteTenantMemberDialog
            roles={data.roles}
            isLeader={isLeader}
            isPending={inviteMutation.isPending}
            onCreate={(rolePublicId) =>
              inviteMutation.mutateAsync(rolePublicId)
            }
          />
        ) : null}
        {embedded ? (
          <Button
            variant='ghost'
            size='icon'
            className='size-9'
            title='刷新成员列表'
            disabled={refreshing}
            onClick={() => {
              void membersQuery.refetch()
              if (isLeader) void groupsQuery.refetch()
            }}
          >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} />
          </Button>
        ) : null}
        {role === 'owner' ? (
          <Button
            variant='outline'
            className='gap-2'
            onClick={() => setOffboardingAuditsOpen(true)}
          >
            <History className='size-4' />
            离职交接审计
          </Button>
        ) : null}
      </div>
    </section>
  )

  const contentBlock = (
    <>
      {!enabled && (
        <div className='border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'>
          当前还在「我的组织」。请切换到企业工作空间后再管理企业成员。
        </div>
      )}

      {membersQuery.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive px-4 py-3 text-sm'>
          成员列表加载失败：{getApiErrorMessage(membersQuery.error)}
        </div>
      )}

      <section className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>成员</TableHead>
              <TableHead>当前角色</TableHead>
              <TableHead>数据范围</TableHead>
              <TableHead className='w-64'>编辑角色</TableHead>
              {role === 'owner' && (
                <TableHead className='w-28 text-right'>离职交接</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {membersLoading && (
              <TableRow>
                <TableCell
                  colSpan={role === 'owner' ? 5 : 4}
                  className='text-muted-foreground h-28 text-center'
                >
                  正在加载成员...
                </TableCell>
              </TableRow>
            )}
            {!membersLoading &&
              pagedMembers.map((member) => (
                <MemberRow
                  key={member.public_id}
                  member={member}
                  roles={data?.roles ?? []}
                  currentUserId={currentUser?.id}
                  canEditRoles={canEditRoles}
                  disabled={updateMutation.isPending}
                  canOffboard={role === 'owner'}
                  onOffboard={() => setOffboardingMember(member)}
                  onRoleChange={(rolePublicId) =>
                    updateMutation.mutate({
                      memberPublicId: member.public_id,
                      rolePublicId,
                    })
                  }
                />
              ))}
            {!membersLoading && data && filteredMembers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={role === 'owner' ? 5 : 4}
                  className='text-muted-foreground h-28 text-center'
                >
                  {keyword.trim()
                    ? '未找到匹配成员'
                    : isLeader
                      ? '你负责的分组下暂无可展示的成员。'
                      : '当前企业还没有可展示的成员。'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination
          className='border-t px-4'
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredMembers.length}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
        />
      </section>
      {offboardingMember && data && (
        <OffboardingPreviewDialog
          departingMember={offboardingMember}
          members={data.items}
          groups={groupsQuery.data?.items ?? []}
          onClose={() => setOffboardingMember(null)}
        />
      )}
      <OffboardingAuditsDialog
        audits={auditsQuery.data ?? []}
        error={auditsQuery.error}
        loading={auditsQuery.isLoading}
        onOpenChange={setOffboardingAuditsOpen}
        open={offboardingAuditsOpen}
      />
    </>
  )

  if (embedded) {
    return (
      <div className='space-y-4'>
        {toolbar}
        {contentBlock}
      </div>
    )
  }

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <UsersRound className='text-primary size-5 shrink-0' />
          <span className='truncate font-medium'>企业成员</span>
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
            title='刷新成员列表'
            disabled={membersQuery.isFetching}
            onClick={() => void membersQuery.refetch()}
          >
            <RefreshCw
              className={membersQuery.isFetching ? 'animate-spin' : ''}
            />
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        {toolbar}
        <PageSurface className='space-y-6'>{contentBlock}</PageSurface>
      </Main>
    </>
  )
}

function OffboardingAuditsDialog({
  audits,
  error,
  loading,
  onOpenChange,
  open,
}: {
  audits: OffboardingAudit[]
  error: unknown
  loading: boolean
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>离职交接审计</DialogTitle>
          <DialogDescription>
            查看已完成交接的资源统计与个人素材清理状态。
          </DialogDescription>
        </DialogHeader>
        {loading && (
          <p className='text-muted-foreground text-sm'>正在加载审计记录...</p>
        )}
        {error !== null && (
          <p className='text-destructive text-sm'>
            审计记录加载失败：{getApiErrorMessage(error)}
          </p>
        )}
        {!loading && !error && audits.length === 0 && (
          <p className='text-muted-foreground text-sm'>
            暂无离职交接审计记录。
          </p>
        )}
        <div className='space-y-3'>
          {audits.map((audit) => (
            <article
              key={audit.public_id}
              className='space-y-3 border p-3 text-sm'
            >
              <div className='flex flex-wrap justify-between gap-2'>
                <span>
                  {audit.departing_member.nickname} 交接给{' '}
                  {audit.recipient_member.nickname}
                </span>
                <span className='text-muted-foreground'>
                  {new Date(audit.confirmed_at).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className='text-muted-foreground grid grid-cols-2 gap-2'>
                <span>视频任务 {audit.resource_counts.video_tasks}</span>
                <span>手动草稿 {audit.resource_counts.video_drafts}</span>
                <span>
                  个人素材待清理 {audit.resource_counts.personal_assets}
                </span>
                <span>
                  个人素材保留 {audit.resource_counts.protected_personal_assets}
                </span>
              </div>
              <CleanupAuditDetails
                label='个人素材'
                details={audit.personal_assets_cleanup}
              />
              <CleanupAuditDetails
                label='个人目录'
                details={audit.personal_directories_cleanup}
              />
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CleanupAuditDetails({
  details,
  label,
}: {
  details: import('@/services/api/tenantApi').OffboardingCleanupDetails
  label: string
}) {
  return (
    <div className='space-y-1 border-t pt-2 text-xs'>
      <p className='font-medium'>{label}清理</p>
      <p className='text-muted-foreground'>
        等待 {details.pending}，保留 {details.protected}，处理中{' '}
        {details.processing}，完成 {details.completed}，失败 {details.failed}
        ，累计重试 {details.retry_count}
      </p>
      {offboardingCleanupFailureDetails(details.failure_details).map(
        (detail) => (
          <p key={detail} className='text-destructive'>
            {detail}
          </p>
        )
      )}
    </div>
  )
}

type MemberRowProps = {
  member: TenantMember
  roles: TenantRole[]
  currentUserId?: string
  canEditRoles: boolean
  disabled: boolean
  onRoleChange: (rolePublicId: string) => void
  canOffboard: boolean
  onOffboard: () => void
}

function MemberRow({
  member,
  roles,
  currentUserId,
  canEditRoles,
  disabled,
  onRoleChange,
  canOffboard,
  onOffboard,
}: MemberRowProps) {
  const isSelf = member.user_public_id === currentUserId
  const isOwner = member.role.code === 'owner'
  const canEdit = canEditRoles && !isSelf && !isOwner
  const availableRoles = roles.filter((role) => role.code !== 'owner')

  return (
    <TableRow>
      <TableCell>
        <div className='flex min-w-56 items-center gap-3'>
          <UserAvatar
            src={member.avatar_url}
            alt={member.nickname}
            className='size-9'
          />
          <div className='min-w-0'>
            <div className='truncate font-medium'>{member.nickname}</div>
            <div className='text-muted-foreground truncate text-xs'>
              {member.email}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={isOwner ? 'default' : 'secondary'}>
          {member.role.name}
        </Badge>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {dataScopeLabel[member.role.data_scope]}
      </TableCell>
      <TableCell>
        {canEdit ? (
          <Select
            value={member.role.public_id}
            disabled={disabled}
            onValueChange={onRoleChange}
          >
            <SelectTrigger aria-label={`编辑 ${member.nickname} 的角色`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => (
                <SelectItem key={role.public_id} value={role.public_id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className='text-muted-foreground text-sm'>
            {!canEditRoles
              ? '仅可查看'
              : isSelf
                ? '不可编辑自己'
                : '管理员不可编辑'}
          </span>
        )}
      </TableCell>
      {canOffboard && (
        <TableCell className='text-right'>
          {!isOwner ? (
            <Button variant='outline' size='sm' onClick={onOffboard}>
              <LogOut />
              交接
            </Button>
          ) : (
            <span className='text-muted-foreground text-sm'>需先转让企业</span>
          )}
        </TableCell>
      )}
    </TableRow>
  )
}

function roleLabel(code: TenantRole['code'], roles: TenantRole[]) {
  return roles.find((role) => role.code === code)?.name ?? code
}

function OffboardingPreviewDialog({
  departingMember,
  members,
  groups,
  onClose,
}: {
  departingMember: TenantMember
  members: TenantMember[]
  groups: import('@/services/api/tenantApi').TenantGroup[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [recipientMemberId, setRecipientMemberId] = useState('')
  const [successors, setSuccessors] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<OffboardingPreview | null>(null)
  const [error, setError] = useState('')
  const ledGroups = groups.filter(
    (group) => group.leader?.public_id === departingMember.public_id
  )
  const successorCandidates = members.filter(
    (member) =>
      member.public_id !== departingMember.public_id &&
      (member.role.code === 'manager' || member.role.code === 'leader')
  )
  const previewMutation = useMutation({
    mutationFn: () =>
      createOffboardingPreview({
        departing_member_public_id: departingMember.public_id,
        recipient_member_public_id: recipientMemberId,
        group_successors: ledGroups.map((group) => ({
          group_public_id: group.public_id,
          member_public_id: successors[group.public_id] ?? '',
        })),
      }),
    onSuccess: (value) => {
      setError('')
      setPreview(value)
    },
    onError: (reason) => {
      setPreview(null)
      setError(offboardingPreviewErrorMessage(reason))
    },
  })
  const confirmMutation = useMutation({
    mutationFn: confirmOffboarding,
    onSuccess: () => {
      toast.success('离职交接已完成')
      void queryClient.invalidateQueries({ queryKey: ['tenant-members'] })
      void queryClient.invalidateQueries({ queryKey: ['tenant-groups'] })
      void queryClient.invalidateQueries({ queryKey: ['tenants'] })
      onClose()
    },
    onError: (reason) => {
      setError(offboardingPreviewErrorMessage(reason, '无法确认离职交接'))
    },
  })
  const canPreview =
    Boolean(recipientMemberId) &&
    ledGroups.every((group) => Boolean(successors[group.public_id]))
  const primaryAction = offboardingPrimaryAction(preview)

  function resetPreview() {
    setPreview(null)
    setError('')
  }

  function handlePrimaryAction() {
    if (preview) {
      confirmMutation.mutate(preview.credential)
      return
    }
    previewMutation.mutate()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>离职交接预览</DialogTitle>
          <DialogDescription>
            为 {departingMember.nickname} 选择资源承接人与分组负责人继任者。
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='offboarding-recipient'>资源承接人</Label>
            <Select
              value={recipientMemberId}
              disabled={previewMutation.isPending || confirmMutation.isPending}
              onValueChange={(memberPublicId) => {
                setRecipientMemberId(memberPublicId)
                resetPreview()
              }}
            >
              <SelectTrigger id='offboarding-recipient'>
                <SelectValue placeholder='选择活跃企业成员' />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter(
                    (member) => member.public_id !== departingMember.public_id
                  )
                  .map((member) => (
                    <SelectItem key={member.public_id} value={member.public_id}>
                      {member.nickname}（{member.role.name}）
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {ledGroups.map((group) => (
            <div key={group.public_id} className='space-y-2'>
              <Label htmlFor={`successor-${group.public_id}`}>
                {group.name} 负责人继任者
              </Label>
              <Select
                value={successors[group.public_id] ?? ''}
                disabled={
                  previewMutation.isPending || confirmMutation.isPending
                }
                onValueChange={(memberPublicId) => {
                  setSuccessors((current) => ({
                    ...current,
                    [group.public_id]: memberPublicId,
                  }))
                  resetPreview()
                }}
              >
                <SelectTrigger id={`successor-${group.public_id}`}>
                  <SelectValue placeholder='选择 Manager 或 Leader' />
                </SelectTrigger>
                <SelectContent>
                  {successorCandidates.map((member) => (
                    <SelectItem key={member.public_id} value={member.public_id}>
                      {member.nickname}（{member.role.name}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {error && <p className='text-destructive text-sm'>{error}</p>}
          {preview && (
            <div className='space-y-3 border px-3 py-3 text-sm'>
              <div className='grid grid-cols-2 gap-2'>
                {offboardingPreviewSummary(preview).map(([label, count]) => (
                  <div key={label} className='flex justify-between gap-3'>
                    <span className='text-muted-foreground'>{label}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
              <p className='text-muted-foreground'>
                个人素材将在离职后保留 {preview.retention_days}{' '}
                天；预览凭证有效至{' '}
                {new Date(preview.expires_at).toLocaleString('zh-CN')}。
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            取消
          </Button>
          <Button
            variant={primaryAction === 'confirm' ? 'destructive' : 'default'}
            disabled={
              primaryAction === 'create'
                ? !canPreview || previewMutation.isPending
                : confirmMutation.isPending
            }
            onClick={handlePrimaryAction}
          >
            {primaryAction === 'create'
              ? previewMutation.isPending
                ? '计算中'
                : '创建预览'
              : confirmMutation.isPending
                ? '交接中'
                : '确认交接'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}