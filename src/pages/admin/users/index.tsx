import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  ADMIN_USER_ROLES,
  createAdminUser,
  listAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
  type AdminUserRole,
  type AdminUserStatus,
  type CreateAdminUserInput,
} from '@/services/api/adminUserApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/common'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageShell } from '@/components/layout/PageShell'

type FilterDraft = {
  keyword: string
  role: '' | AdminUserRole
  status: '' | AdminUserStatus
}

// Radix UI 的 Select 不允许 SelectItem 的 value 为空串，这里使用 'all'
// 作为"不过滤"的哨兵值，在提交查询前再映射回空串。
const FILTER_ALL = 'all'

export const UserAdmin = () => {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<FilterDraft>({
    keyword: '',
    role: '',
    status: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<FilterDraft>(filters)
  const [createOpen, setCreateOpen] = useState(false)

  const query = useQuery({
    queryKey: ['admin-users', appliedFilters],
    queryFn: () =>
      listAdminUsers({
        page: 1,
        page_size: 50,
        keyword: appliedFilters.keyword || undefined,
        role: appliedFilters.role || undefined,
        status: appliedFilters.status || undefined,
      }),
  })
  const items = query.data?.items ?? []

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminUserStatus }) =>
      updateAdminUserStatus(id, status),
    onSuccess: (_, variables) => {
      toast.success(variables.status === 'active' ? '用户已启用' : '用户已禁用')
      refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '更新状态失败')),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminUserRole }) =>
      updateAdminUserRole(id, role),
    onSuccess: (_, variables) => {
      toast.success(
        variables.role === 'admin' ? '已提升为管理员' : '已切换为普通用户'
      )
      refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '更新角色失败')),
  })

  const applyFilters = (event?: FormEvent) => {
    event?.preventDefault()
    setAppliedFilters({
      keyword: filters.keyword.trim(),
      role: filters.role,
      status: filters.status,
    })
  }

  const resetFilters = () => {
    const cleared: FilterDraft = { keyword: '', role: '', status: '' }
    setFilters(cleared)
    setAppliedFilters(cleared)
  }

  return (
    <>
      <PageShell
        title='用户维护'
        description='维护平台注册用户，查看账号信息、启用状态并配置用户角色（普通用户或管理员）。'
        actions={
          <>
            <Button
              variant='outline'
              size='icon'
              title='刷新'
              disabled={query.isFetching}
              onClick={refresh}
            >
              <RefreshCw className={query.isFetching ? 'animate-spin' : ''} />
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus />
              新增用户
            </Button>
          </>
        }
        surfaceClassName='space-y-6'
      >
      <form
        onSubmit={applyFilters}
        className='grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_160px_auto]'
      >
        <Field id='user-keyword' label='搜索'>
          <div className='relative'>
            <Search className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
            <Input
              id='user-keyword'
              value={filters.keyword}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  keyword: event.target.value,
                }))
              }
              placeholder='按邮箱或昵称搜索'
              className='pl-9'
            />
          </div>
        </Field>
        <Field id='user-role' label='角色'>
          <Select
            value={filters.role || FILTER_ALL}
            onValueChange={(value) =>
              setFilters((current) => ({
                ...current,
                role: value === FILTER_ALL ? '' : (value as AdminUserRole),
              }))
            }
          >
            <SelectTrigger id='user-role' className='w-full'>
              <SelectValue placeholder='全部角色' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部角色</SelectItem>
              <SelectItem value='user'>普通用户</SelectItem>
              <SelectItem value='admin'>管理员</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field id='user-status' label='状态'>
          <Select
            value={filters.status || FILTER_ALL}
            onValueChange={(value) =>
              setFilters((current) => ({
                ...current,
                status: value === FILTER_ALL ? '' : (value as AdminUserStatus),
              }))
            }
          >
            <SelectTrigger id='user-status' className='w-full'>
              <SelectValue placeholder='全部状态' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部状态</SelectItem>
              <SelectItem value='active'>启用</SelectItem>
              <SelectItem value='disabled'>禁用</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className='flex items-end gap-2'>
          <Button type='submit'>查询</Button>
          <Button type='button' variant='outline' onClick={resetFilters}>
            重置
          </Button>
        </div>
      </form>

      {query.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive mt-6 rounded-md border px-4 py-3 text-sm'>
          用户列表加载失败：{getApiErrorMessage(query.error)}
        </div>
      )}

      <div className='mt-6 overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>订阅</TableHead>
              <TableHead>最近登录</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className='w-44 text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <span className='bg-muted flex size-9 items-center justify-center rounded-full'>
                      <UserRound className='size-4' />
                    </span>
                    <div className='min-w-0'>
                      <div className='truncate font-medium'>
                        {user.nickname}
                      </div>
                      <div className='text-muted-foreground truncate text-xs'>
                        {user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === 'admin' ? 'default' : 'secondary'}
                  >
                    {user.role === 'admin' ? '管理员' : '普通用户'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.status === 'active' ? 'default' : 'secondary'}
                  >
                    {user.status === 'active' ? '启用' : '禁用'}
                  </Badge>
                </TableCell>
                <TableCell className='text-muted-foreground text-sm'>
                  {user.subscription_plan || '—'}
                </TableCell>
                <TableCell className='text-muted-foreground text-sm'>
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString('zh-CN')
                    : '从未登录'}
                </TableCell>
                <TableCell className='text-muted-foreground text-sm'>
                  {new Date(user.created_at).toLocaleString('zh-CN')}
                </TableCell>
                <TableCell>
                  <div className='flex justify-end gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      title={user.status === 'active' ? '禁用用户' : '启用用户'}
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          id: user.id,
                          status:
                            user.status === 'active' ? 'disabled' : 'active',
                        })
                      }
                    >
                      <Power
                        className={
                          user.status === 'active'
                            ? 'text-destructive'
                            : 'text-emerald-600'
                        }
                      />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      title={
                        user.role === 'admin'
                          ? '降级为普通用户'
                          : '提升为管理员'
                      }
                      disabled={roleMutation.isPending}
                      onClick={() =>
                        roleMutation.mutate({
                          id: user.id,
                          role: user.role === 'admin' ? 'user' : 'admin',
                        })
                      }
                    >
                      {user.role === 'admin' ? (
                        <ShieldOff className='text-muted-foreground' />
                      ) : (
                        <ShieldCheck className='text-primary' />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!query.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className='text-muted-foreground h-28 text-center'
                >
                  未找到匹配的用户。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </PageShell>

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={refresh}
      />
    </>
  )
}

function CreateUserDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AdminUserRole>('user')

  const mutation = useMutation({
    mutationFn: (input: CreateAdminUserInput) => createAdminUser(input),
    onSuccess: () => {
      toast.success('用户已创建')
      setEmail('')
      setNickname('')
      setPassword('')
      setRole('user')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '创建失败')),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmedEmail = email.trim()
    const trimmedNickname = nickname.trim()
    if (!trimmedEmail) {
      toast.error('请输入邮箱')
      return
    }
    if (!trimmedNickname) {
      toast.error('请输入昵称')
      return
    }
    if (!password) {
      toast.error('请输入初始密码')
      return
    }
    mutation.mutate({
      email: trimmedEmail,
      nickname: trimmedNickname,
      password,
      role,
      status: 'active',
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose()
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>新增用户</DialogTitle>
          <DialogDescription>
            新建用户将自动启用，请妥善告知初始密码并提示用户尽快修改。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <Field id='user-create-email' label='邮箱'>
            <Input
              id='user-create-email'
              type='email'
              value={email}
              maxLength={320}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field id='user-create-nickname' label='昵称'>
            <Input
              id='user-create-nickname'
              value={nickname}
              maxLength={64}
              onChange={(event) => setNickname(event.target.value)}
              required
            />
          </Field>
          <Field id='user-create-password' label='初始密码'>
            <PasswordInput
              id='user-create-password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete='new-password'
            />
          </Field>
          <Field id='user-create-role' label='角色'>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as AdminUserRole)}
            >
              <SelectTrigger id='user-create-role' className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_USER_ROLES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === 'admin' ? '管理员' : '普通用户'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <p className='text-muted-foreground text-xs'>
            密码需 8 至 72 个字符，同时包含字母和数字。
          </p>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? '保存中' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  children,
}: {
  id?: string
  label: string
  children: ReactNode
}) {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
