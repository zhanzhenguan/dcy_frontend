import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ContactRound, Plus, Search, Tags } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, NameAvatar, ThemeSwitch } from '@/components/common'
import { ProfileDropdown } from '@/components/business'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  createManagedAccount,
  createManagedAccountStatusTag,
  deleteManagedAccount,
  deleteManagedAccountStatusTag,
  getManagedAccountSettings,
  listManagedAccounts,
  listManagedAccountStatusTags,
  updateManagedAccount,
  updateManagedAccountSettings,
  updateManagedAccountStatusTag,
} from '@/services/api/managedAccountApi'
import { cn } from '@/utils/utils'
import { AccountFormDialog } from './components/AccountFormDialog'
import { AccountRowActions } from './components/AccountRowActions'
import { AccountScopeToolbar } from './components/AccountScopeToolbar'
import { AccountStatusDialog } from './components/AccountStatusDialog'
import { ExpiryRemindDialog } from './components/ExpiryRemindDialog'
import { NetworkIpDialog } from './components/NetworkIpDialog'
import { StatusTagManageDialog } from './components/StatusTagManageDialog'
import {
  personalScopeSelection,
  useAccountScopeAccess,
  useClampAccountSelection,
} from './hooks/useAccountScopeAccess'
import {
  DEFAULT_NODE_EXPIRY_REMIND_DAYS,
  formatFollowerCount,
  formatNodeExpiresAt,
  getNodeExpiryHint,
  getStatusTagToneProps,
  isNodeExpiryAlert,
  resolveAccountStatusTags,
  type AccountScopeSelection,
  type AccountStatusTag,
  type ManagedAccount,
} from './types'

function listParamsFromSelection(selection: AccountScopeSelection) {
  if (selection.kind === 'personal') {
    return { scope: 'personal' as const }
  }
  if (selection.kind === 'enterprise') {
    return null
  }
  if (selection.kind === 'member' && selection.userPublicId) {
    return { owner_user_id: selection.userPublicId }
  }
  if (selection.kind === 'group' && selection.groupPublicId) {
    return { group_public_id: selection.groupPublicId }
  }
  return { scope: 'personal' as const }
}

export const AccountManagementPage = () => {
  const queryClient = useQueryClient()
  const {
    currentUserId,
    directoryMode,
    showScopeSidebar,
    visibleGroups,
    directoryMembers,
    canViewStaffDirectory,
    groupsQuery,
    membersQuery,
    canCreateInSelection,
    canManageAccount,
  } = useAccountScopeAccess()

  const [selection, setSelection] = useState<AccountScopeSelection>(
    personalScopeSelection()
  )
  const [keyword, setKeyword] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [remindOpen, setRemindOpen] = useState(false)
  const [statusTagOpen, setStatusTagOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<ManagedAccount | null>(
    null
  )
  const [deletingAccount, setDeletingAccount] =
    useState<ManagedAccount | null>(null)
  const [ipAccount, setIpAccount] = useState<ManagedAccount | null>(null)
  const [statusAccount, setStatusAccount] = useState<ManagedAccount | null>(
    null
  )

  useClampAccountSelection(
    selection,
    setSelection,
    directoryMode,
    visibleGroups,
    directoryMembers,
    currentUserId
  )

  const handleSelectScope = (value: AccountScopeSelection) => {
    setSelection(value)
    setKeyword('')
  }

  const canCreate = canCreateInSelection(selection)
  const listParams = listParamsFromSelection(selection)

  const accountsQuery = useQuery({
    queryKey: ['managed-accounts', listParams],
    queryFn: () =>
      listManagedAccounts({
        page: 1,
        page_size: 200,
        ...listParams!,
      }),
    enabled: listParams !== null,
  })

  const statusTagsQuery = useQuery({
    queryKey: ['managed-account-status-tags'],
    queryFn: listManagedAccountStatusTags,
  })

  const settingsQuery = useQuery({
    queryKey: ['managed-account-settings'],
    queryFn: getManagedAccountSettings,
  })

  const accounts =
    listParams === null ? [] : (accountsQuery.data?.items ?? [])
  const statusTags = statusTagsQuery.data ?? []
  const remindDays =
    settingsQuery.data ?? DEFAULT_NODE_EXPIRY_REMIND_DAYS

  const filteredAccounts = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    if (!query) return accounts
    return accounts.filter((account) => {
      const tags = resolveAccountStatusTags(account.statuses, statusTags)
      const haystack = [
        account.name,
        account.region,
        account.platform,
        account.accountType,
        account.deviceSerial,
        account.networkIp,
        account.nodeName,
        account.nodeLink,
        account.remark,
        ...tags.map((tag) => tag.label),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [accounts, keyword, statusTags])

  const invalidateAccounts = () =>
    queryClient.invalidateQueries({ queryKey: ['managed-accounts'] })

  const invalidateTags = () =>
    queryClient.invalidateQueries({ queryKey: ['managed-account-status-tags'] })

  const saveAccountMutation = useMutation({
    mutationFn: async (account: ManagedAccount) => {
      if (editingAccount) {
        return updateManagedAccount(account)
      }
      return createManagedAccount(account)
    },
    onSuccess: (saved) => {
      invalidateAccounts()
      toast.success(
        editingAccount
          ? `已更新账号：${saved.name}`
          : `已新增账号：${saved.name}`
      )
      setFormOpen(false)
      setEditingAccount(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || '保存账号失败')
    },
  })

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => deleteManagedAccount(id),
    onSuccess: () => {
      const name = deletingAccount?.name ?? ''
      setDeletingAccount(null)
      invalidateAccounts()
      toast.success(`已删除账号：${name}`)
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除账号失败')
    },
  })

  const createTagMutation = useMutation({
    mutationFn: createManagedAccountStatusTag,
    onSuccess: () => {
      invalidateTags()
      toast.success('已新增状态标签')
    },
    onError: (error: Error) => toast.error(error.message || '新增标签失败'),
  })

  const updateTagMutation = useMutation({
    mutationFn: updateManagedAccountStatusTag,
    onSuccess: () => {
      invalidateTags()
      toast.success('已更新状态标签')
    },
    onError: (error: Error) => toast.error(error.message || '更新标签失败'),
  })

  const deleteTagMutation = useMutation({
    mutationFn: deleteManagedAccountStatusTag,
    onSuccess: () => {
      invalidateTags()
      invalidateAccounts()
      toast.success('已删除状态标签')
    },
    onError: (error: Error) => toast.error(error.message || '删除标签失败'),
  })

  const saveSettingsMutation = useMutation({
    mutationFn: updateManagedAccountSettings,
    onSuccess: (days) => {
      queryClient.setQueryData(['managed-account-settings'], days)
      toast.success('已保存到期提醒设置')
      setRemindOpen(false)
    },
    onError: (error: Error) => toast.error(error.message || '保存设置失败'),
  })

  const showActionsColumn = useMemo(
    () =>
      canCreate ||
      filteredAccounts.some((account) => canManageAccount(account)),
    [canCreate, canManageAccount, filteredAccounts]
  )

  const accountTotal = accountsQuery.data?.total ?? accounts.length
  const displayTotal = keyword.trim()
    ? filteredAccounts.length
    : accountTotal
  const countLabel =
    !accountsQuery.isSuccess || displayTotal <= 0
      ? null
      : `${displayTotal} 个账号`

  const openCreate = () => {
    if (!canCreate) {
      toast.error('仅可在自己的账号下新增')
      return
    }
    setEditingAccount(null)
    setFormOpen(true)
  }

  const openEdit = (account: ManagedAccount) => {
    if (!canManageAccount(account)) {
      toast.error('只能编辑自己的账号')
      return
    }
    setEditingAccount(account)
    setFormOpen(true)
  }

  const openDelete = (account: ManagedAccount) => {
    if (!canManageAccount(account)) {
      toast.error('只能删除自己的账号')
      return
    }
    setDeletingAccount(account)
  }

  const handleFormSubmit = (account: ManagedAccount) => {
    if (editingAccount) {
      if (!canManageAccount(account)) {
        toast.error('只能编辑自己的账号')
        return
      }
    } else if (!canCreate) {
      toast.error('仅可在自己的账号下新增')
      return
    }
    saveAccountMutation.mutate({
      ...account,
      ownerUserId: currentUserId || account.ownerUserId,
    })
  }

  const handleDeleteConfirm = () => {
    if (!deletingAccount) return
    deleteAccountMutation.mutate(deletingAccount.id)
  }

  const handleCreateStatusTag = (tag: AccountStatusTag) => {
    createTagMutation.mutate(tag)
  }

  const handleUpdateStatusTag = (tag: AccountStatusTag) => {
    updateTagMutation.mutate(tag)
  }

  const handleDeleteStatusTag = (tagId: string) => {
    deleteTagMutation.mutate(tagId)
  }

  const loading = accountsQuery.isLoading || statusTagsQuery.isLoading

  return (
    <>
      <Header fixed>
        <ContactRound className='text-primary size-5 shrink-0' />
        <span className='truncate font-medium'>账号管理</span>
        {countLabel ? (
          <Badge
            variant='outline'
            className='bg-primary/5 text-primary border-primary/20 hidden text-[10px] font-normal sm:inline-flex'
          >
            {countLabel}
          </Badge>
        ) : null}
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex min-h-0 flex-1'>
        <div className='bg-surface flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border shadow-sm'>
          <section className='flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 md:p-6'>
            <div className='flex flex-col gap-3'>
              {showScopeSidebar && directoryMode === 'groups' ? (
                <AccountScopeToolbar
                  part='tabs'
                  mode={directoryMode}
                  selection={selection}
                  onSelect={handleSelectScope}
                  groups={visibleGroups}
                  members={directoryMembers}
                  showStaff={canViewStaffDirectory}
                  currentUserId={currentUserId}
                  loading={groupsQuery.isLoading || membersQuery.isLoading}
                />
              ) : null}

              <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                {showScopeSidebar &&
                (directoryMode === 'groups' ||
                  directoryMode === 'flat-members') ? (
                  <AccountScopeToolbar
                    part='filter'
                    mode={directoryMode}
                    selection={selection}
                    onSelect={handleSelectScope}
                    groups={visibleGroups}
                    members={directoryMembers}
                    showStaff={canViewStaffDirectory}
                    currentUserId={currentUserId}
                    loading={groupsQuery.isLoading || membersQuery.isLoading}
                  />
                ) : null}

                <div className='relative min-w-0 max-w-xl flex-1 basis-56'>
                  <Search className='text-muted-foreground absolute top-2.5 left-2.5 size-4' />
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder='搜索账号、设备、IP、状态、备注…'
                    className='h-9 pl-8'
                  />
                </div>

                {canCreate ? (
                  <div className='ms-auto flex flex-wrap items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-9 gap-1.5'
                      onClick={() => setRemindOpen(true)}
                    >
                      <Bell className='size-4' />
                      到期提醒
                      <span className='text-muted-foreground text-xs font-normal'>
                        {remindDays}天
                      </span>
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-9 gap-1.5'
                      onClick={() => setStatusTagOpen(true)}
                    >
                      <Tags className='size-4' />
                      状态标签
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      className='h-9 gap-1.5'
                      onClick={openCreate}
                    >
                      <Plus className='size-4' />
                      新增账号
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className='min-h-0 flex-1 overflow-auto rounded-lg border'>
              <Table className='border-separate border-spacing-0'>
                <TableHeader>
                  <TableRow className='group/row hover:bg-transparent'>
                    <TableHead className='min-w-56 pl-4'>账号信息</TableHead>
                    <TableHead className='min-w-44'>邮箱</TableHead>
                    <TableHead className='min-w-36'>密码</TableHead>
                    {/* <TableHead className='min-w-36'>2FA 密钥</TableHead> */}
                    <TableHead className='min-w-32'>设备编号</TableHead>
                    <TableHead className='min-w-36'>网络 IP</TableHead>
                    <TableHead className='min-w-24'>状态</TableHead>
                    <TableHead className='min-w-28'>备注</TableHead>
                    {showActionsColumn ? (
                      <TableHead className='bg-background sticky end-0 z-20 w-16 pr-4 text-right shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.12)]'>
                        操作
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={showActionsColumn ? 9 : 8}
                        className='text-muted-foreground h-28 text-center'
                      >
                        加载中…
                      </TableCell>
                    </TableRow>
                  ) : filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={showActionsColumn ? 9 : 8}
                        className='text-muted-foreground h-28 text-center'
                      >
                        {keyword.trim()
                          ? '未找到匹配账号'
                          : '暂无账号'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts.map((account) => {
                      const tags = resolveAccountStatusTags(
                        account.statuses,
                        statusTags
                      )
                      const expiryHint = getNodeExpiryHint(
                        account.nodeExpiresAt,
                        remindDays
                      )
                      const expiryAlert = isNodeExpiryAlert(
                        account.nodeExpiresAt,
                        remindDays
                      )
                      const manageable = canManageAccount(account)
                      return (
                        <TableRow key={account.id} className='group/row'>
                          <TableCell className='pl-4'>
                            <div className='flex items-center gap-3'>
                              <NameAvatar
                                name={account.name}
                                src={account.avatarUrl}
                              />
                              <div className='min-w-0'>
                                <p className='text-foreground truncate text-sm font-semibold'>
                                  {account.name}
                                </p>
                                <p className='text-muted-foreground truncate text-xs'>
                                  {account.platform} · {account.region} ·{' '}
                                  {account.accountType}
                                </p>
                                <p className='text-muted-foreground mt-0.5 text-xs tabular-nums'>
                                  粉丝 {formatFollowerCount(account.followers)}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className='text-foreground font-mono text-sm select-all break-all' title={account.email}>
                              {account.email || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className='text-foreground font-mono text-sm select-all break-all' title={account.password}>
                              {account.password || '—'}
                            </span>
                          </TableCell>
                          {/* <TableCell>
                            {account.twoFactorSecret ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type='button'
                                    className='hover:bg-muted/60 inline-flex max-w-32 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs transition-colors cursor-pointer text-left'
                                    title='点击查看完整2FA密钥并复制'
                                  >
                                    <span className='truncate'>{account.twoFactorSecret}</span>
                                    <span className='text-muted-foreground font-sans text-xs'>...</span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className='w-80 space-y-3 p-4' align='start'>
                                  <div className='flex items-center justify-between gap-2 border-b pb-2'>
                                    <div className='flex items-center gap-1.5'>
                                      <ShieldCheck className='size-4 text-emerald-600 dark:text-emerald-400' />
                                      <span className='text-foreground text-sm font-medium'>2FA 密钥</span>
                                    </div>
                                    <Button
                                      type='button'
                                      variant='secondary'
                                      size='sm'
                                      className='h-7 gap-1 px-2 text-xs cursor-pointer'
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(account.twoFactorSecret)
                                          toast.success('2FA密钥已复制')
                                        } catch {
                                          toast.error('复制失败')
                                        }
                                      }}
                                    >
                                      <Copy className='size-3.5' />
                                      复制
                                    </Button>
                                  </div>
                                  <div className='bg-muted/40 rounded border p-2.5'>
                                    <p className='text-foreground font-mono text-xs break-all select-all leading-relaxed'>
                                      {account.twoFactorSecret}
                                    </p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <span className='text-muted-foreground text-xs'>—</span>
                            )}
                          </TableCell> */}
                          <TableCell>
                            <p className='font-mono text-sm'>
                              {account.deviceSerial || '—'}
                            </p>
                          </TableCell>
                          <TableCell>
                            <button
                              type='button'
                              className='text-foreground h-auto p-0 font-mono text-sm'
                              onClick={() => setIpAccount(account)}
                            >
                              {account.networkIp || '查看节点'}
                            </button>
                            {account.nodeName ? (
                              <p className='text-muted-foreground mt-0.5 max-w-40 truncate text-xs'>
                                {account.nodeName}
                              </p>
                            ) : null}
                            {expiryHint ? (
                              <p
                                className={cn(
                                  'mt-0.5 text-xs',
                                  expiryAlert
                                    ? 'text-destructive'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {formatNodeExpiresAt(account.nodeExpiresAt)} ·{' '}
                                {expiryHint}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <button
                              type='button'
                              className='flex max-w-44 flex-wrap gap-1.5 text-left'
                              onClick={() => setStatusAccount(account)}
                            >
                              {tags.length > 0 ? (
                                tags.map((tag) => {
                                  const tone = getStatusTagToneProps(tag)
                                  return (
                                  <Badge
                                    key={tag.id}
                                    variant='secondary'
                                    className={cn(
                                      'border-0 font-normal',
                                      tone.className
                                    )}
                                    style={tone.style}
                                  >
                                    {tag.label}
                                  </Badge>
                                  )
                                })
                              ) : (
                                <span className='text-muted-foreground text-xs'>
                                  未设置
                                </span>
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <span className='text-muted-foreground line-clamp-2 text-sm'>
                              {account.remark || '—'}
                            </span>
                          </TableCell>
                          {showActionsColumn ? (
                            <TableCell className='bg-background group-hover/row:bg-muted/50 sticky end-0 z-20 pr-4 text-right shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.12)]'>
                              {manageable ? (
                                <AccountRowActions
                                  onEdit={() => openEdit(account)}
                                  onDelete={() => openDelete(account)}
                                />
                              ) : (
                                <span className='text-muted-foreground text-xs'>
                                  只读
                                </span>
                              )}
                            </TableCell>
                          ) : null}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </Main>

      <AccountFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingAccount(null)
        }}
        statusTags={statusTags}
        account={editingAccount}
        onSubmit={handleFormSubmit}
      />
      <ExpiryRemindDialog
        open={remindOpen}
        onOpenChange={setRemindOpen}
        remindDays={remindDays}
        onSave={(days) => saveSettingsMutation.mutate(days)}
      />
      <StatusTagManageDialog
        open={statusTagOpen}
        onOpenChange={setStatusTagOpen}
        tags={statusTags}
        onCreate={handleCreateStatusTag}
        onUpdate={handleUpdateStatusTag}
        onDelete={handleDeleteStatusTag}
      />
      <NetworkIpDialog
        account={ipAccount}
        open={Boolean(ipAccount)}
        onOpenChange={(open) => {
          if (!open) setIpAccount(null)
        }}
        remindDays={remindDays}
      />
      <AccountStatusDialog
        account={statusAccount}
        statusTags={statusTags}
        open={Boolean(statusAccount)}
        onOpenChange={(open) => {
          if (!open) setStatusAccount(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingAccount)}
        onOpenChange={(open) => {
          if (!open) setDeletingAccount(null)
        }}
        title='删除账号'
        desc={
          deletingAccount
            ? `确定删除账号「${deletingAccount.name}」？删除后列表中将不再显示。`
            : ''
        }
        confirmText='删除'
        cancelBtnText='取消'
        destructive
        handleConfirm={handleDeleteConfirm}
      />
    </>
  )
}
