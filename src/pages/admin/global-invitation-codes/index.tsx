import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  generateGlobalInvitationCodes,
  getGlobalInvitationCodeEnabled,
  listGlobalInvitationCodes,
  type GlobalInvitationCode,
  updateGlobalInvitationCodeEnabled,
} from '@/services/api/globalInvitationCodeApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pagination } from '@/components/common'
import { PageShell } from '@/components/layout/PageShell'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export const GlobalInvitationCodesAdmin = () => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [generating, setGenerating] = useState(false)
  const enabledQuery = useQuery({
    queryKey: ['global-invitation-code-enabled', 'admin'],
    queryFn: getGlobalInvitationCodeEnabled,
  })
  const updateEnabledMutation = useMutation({
    mutationFn: updateGlobalInvitationCodeEnabled,
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['global-invitation-code-enabled', 'admin'],
        data
      )
      queryClient.setQueryData(['global-invitation-code-enabled'], data)
      toast.success(data.enabled ? '已启用邀请码校验' : '已关闭邀请码校验')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '更新开关失败')),
  })
  const query = useQuery({
    queryKey: ['global-invitation-codes', { page, pageSize }],
    queryFn: () => listGlobalInvitationCodes({ page, page_size: pageSize }),
  })
  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ['global-invitation-codes'],
    })
  }

  return (
    <>
      <PageShell
        title='全局注册码'
        description='注册码仅可成功使用一次；可设置统一过期时间，或生成永久有效的注册码。'
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
            <Button onClick={() => setGenerating(true)}>
              <Plus />
              批量生成
            </Button>
          </>
        }
        surfaceClassName='space-y-4'
      >
      <div className='flex items-center justify-between border-b pb-3'>
        <div>
          <p className='text-sm font-medium'>注册时校验邀请码</p>
          <p className='text-muted-foreground mt-1 text-xs'>
            {enabledQuery.data?.enabled !== false ? '已启用' : '已关闭'}
          </p>
        </div>
        <Switch
          checked={enabledQuery.data?.enabled !== false}
          disabled={enabledQuery.isLoading || updateEnabledMutation.isPending}
          aria-label='注册时校验邀请码'
          onCheckedChange={(enabled) => updateEnabledMutation.mutate(enabled)}
        />
      </div>

      {query.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-4 py-3 text-sm'>
          注册码列表加载失败：{getApiErrorMessage(query.error)}
        </div>
      )}

      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>注册码</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>过期时间</TableHead>
              <TableHead>占用用户</TableHead>
              <TableHead>占用时间</TableHead>
              <TableHead>生成时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <GlobalInvitationCodeRow key={item.id} item={item} />
            ))}
            {!query.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='text-muted-foreground h-28 text-center'
                >
                  暂无注册码，请先批量生成。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
      </PageShell>

      {generating && (
        <GenerateCodesDialog
          onClose={() => setGenerating(false)}
          onGenerated={refresh}
        />
      )}
    </>
  )
}

function GlobalInvitationCodeRow({ item }: { item: GlobalInvitationCode }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.code)
      toast.success('注册码已复制')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }
  return (
    <TableRow>
      <TableCell>
        <div className='flex items-center gap-2'>
          <KeyRound className='text-muted-foreground size-4 shrink-0' />
          <span className='font-mono text-sm font-medium'>{item.code}</span>
          <Button
            variant='ghost'
            size='icon'
            className='size-7'
            title='复制注册码'
            onClick={copy}
          >
            <Copy className='size-3.5' />
          </Button>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={item.status} />
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatDate(item.expires_at, '永久有效')}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {item.occupied_by_user_nickname || '-'}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatDate(item.occupied_at, '-')}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatDate(item.created_at, '-')}
      </TableCell>
    </TableRow>
  )
}

function StatusBadge({ status }: { status: GlobalInvitationCode['status'] }) {
  const labels = { available: '可用', occupied: '已占用', expired: '已过期' }
  const variants = {
    available: 'default',
    occupied: 'secondary',
    expired: 'outline',
  } as const
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}

function GenerateCodesDialog({
  onClose,
  onGenerated,
}: {
  onClose: () => void
  onGenerated: () => void
}) {
  const [count, setCount] = useState('10')
  const [permanent, setPermanent] = useState(true)
  const [expiresAt, setExpiresAt] = useState('')
  const mutation = useMutation({
    mutationFn: generateGlobalInvitationCodes,
    onSuccess: (items) => {
      toast.success(`已生成 ${items.length} 个注册码`)
      onGenerated()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '生成失败')),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const parsedCount = Number(count)
    if (
      !Number.isInteger(parsedCount) ||
      parsedCount < 1 ||
      parsedCount > 1000
    ) {
      toast.error('生成数量需在 1 至 1000 之间')
      return
    }
    if (!permanent && !expiresAt) {
      toast.error('请选择过期时间')
      return
    }
    const expiration = permanent ? undefined : new Date(expiresAt).toISOString()
    mutation.mutate({ count: parsedCount, expires_at: expiration })
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>批量生成注册码</DialogTitle>
          <DialogDescription>
            每个注册码仅能被一个新注册用户成功使用。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='global-code-count'>生成数量</Label>
            <Input
              id='global-code-count'
              type='number'
              min={1}
              max={1000}
              value={count}
              onChange={(event) => setCount(event.target.value)}
              required
            />
          </div>
          <label
            htmlFor='global-code-permanent'
            className='flex cursor-pointer items-center gap-3 text-sm'
          >
            <Checkbox
              id='global-code-permanent'
              checked={permanent}
              onCheckedChange={(checked) => setPermanent(checked === true)}
            />
            永久有效
          </label>
          {!permanent && (
            <div className='space-y-2'>
              <Label htmlFor='global-code-expires-at'>过期时间</Label>
              <Input
                id='global-code-expires-at'
                type='datetime-local'
                value={expiresAt}
                min={toLocalDateTimeInput(new Date())}
                onChange={(event) => setExpiresAt(event.target.value)}
                required
              />
            </div>
          )}
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? '生成中' : '生成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function formatDate(value: string, fallback: string) {
  return value ? new Date(value).toLocaleString('zh-CN') : fallback
}

function toLocalDateTimeInput(date: Date) {
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  )
  return offsetDate.toISOString().slice(0, 16)
}
