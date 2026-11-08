import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Eye, Plus, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Pagination } from '@/components/common'
import { getApiErrorMessage } from '@/services/api/apiError'
import { listCouponTemplates } from '@/services/api/couponApi'
import {
  createRedeemBatch,
  exportRedeemBatch,
  listRedeemBatchCodes,
  listRedeemBatches,
  type RedeemCodeDetail,
  type RedeemBatch,
} from '@/services/api/redeemApi'

export function RedeemBatchesAdminPage() {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [exported, setExported] = useState<{
    batch: RedeemBatch
    codes: string[]
  } | null>(null)
  const [details, setDetails] = useState<RedeemBatch | null>(null)
  const query = useQuery({
    queryKey: ['redeem-batches'],
    queryFn: () => listRedeemBatches({ page: 1, page_size: 100 }),
  })
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ['redeem-batches'] })
  const exportMutation = useMutation({
    mutationFn: exportRedeemBatch,
    onSuccess: (data) => setExported(data),
    onError: (error) => toast.error(getApiErrorMessage(error, '导出失败')),
  })
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h1 className='text-xl font-semibold'>兑换码中心</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            按渠道批次生成兑换码，导出后投放到抖音、小红书等渠道
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          新建批次
        </Button>
      </div>
      <Card className='rounded-md'>
        <CardHeader>
          <CardTitle className='text-base'>兑换码批次</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <Skeleton className='h-48' />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>渠道</TableHead>
                  <TableHead>奖励</TableHead>
                  <TableHead>兑换进度</TableHead>
                  <TableHead>有效期</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data?.items ?? []).map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className='font-medium'>
                      {batch.channel}
                    </TableCell>
                    <TableCell>
                      <span className='inline-flex items-center gap-1'>
                        <Ticket className='text-primary size-3.5' />
                        {batch.reward_type === 'POINTS'
                          ? `${batch.reward_data.points ?? 0} 积分`
                          : `优惠券模板 ${batch.reward_data.coupon_template_id ?? '-'}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {batch.used_quantity} / {batch.quantity}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-xs'>
                      {formatTime(batch.valid_start_at)} ~{' '}
                      {formatTime(batch.valid_end_at)}
                    </TableCell>
                    <TableCell className='text-muted-foreground max-w-48 truncate text-xs'>
                      {batch.remark || '-'}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        size='icon'
                        title='查看明细'
                        onClick={() => setDetails(batch)}
                      >
                        <Eye />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        title='导出兑换码'
                        disabled={exportMutation.isPending}
                        onClick={() => exportMutation.mutate(batch.id)}
                      >
                        <Download />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {query.data?.items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className='text-muted-foreground py-8 text-center text-sm'
                    >
                      暂无批次，点击右上角新建
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {creating && (
        <CreateBatchDialog
          onClose={() => setCreating(false)}
          onSaved={refresh}
        />
      )}
      <CodesDialog data={exported} onClose={() => setExported(null)} />
      <BatchDetailsDialog
        key={details?.id ?? 'closed'}
        batch={details}
        onClose={() => setDetails(null)}
      />
    </div>
  )
}

function BatchDetailsDialog({
  batch,
  onClose,
}: {
  batch: RedeemBatch | null
  onClose: () => void
}) {
  const [status, setStatus] = useState<'USED' | 'UNUSED'>('USED')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const query = useQuery({
    queryKey: ['redeem-batch-codes', batch?.id, status, page, pageSize],
    queryFn: () =>
      listRedeemBatchCodes({
        id: batch?.id ?? '',
        status,
        page,
        page_size: pageSize,
      }),
    enabled: Boolean(batch),
  })
  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const changeStatus = (value: string) => {
    setStatus(value as 'USED' | 'UNUSED')
    setPage(1)
  }

  return (
    <Dialog open={Boolean(batch)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='flex h-[680px] max-h-[calc(100vh-2rem)] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col content-start overflow-hidden sm:w-[calc(100%-3rem)] sm:max-w-6xl'>
        <DialogHeader>
          <DialogTitle>
            批次明细{batch ? ` · ${batch.channel} · ${batch.id}` : ''}
          </DialogTitle>
        </DialogHeader>
        <Tabs
          value={status}
          onValueChange={changeStatus}
          className='min-h-0 flex-1'
        >
          <TabsList className='shrink-0'>
            <TabsTrigger value='USED'>
              已使用 ({batch?.used_quantity ?? 0})
            </TabsTrigger>
            <TabsTrigger value='UNUSED'>
              未使用 (
              {Math.max(
                0,
                (batch?.quantity ?? 0) - (batch?.used_quantity ?? 0)
              )}
              )
            </TabsTrigger>
          </TabsList>
          {(['USED', 'UNUSED'] as const).map((tab) => (
            <TabsContent
              key={tab}
              value={tab}
              className='mt-4 flex min-h-0 flex-1 flex-col overflow-hidden'
            >
              <div className='min-h-0 flex-1 overflow-auto rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>兑换码</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>兑换租户</TableHead>
                      <TableHead>用户显示名称</TableHead>
                      <TableHead>用户昵称</TableHead>
                      <TableHead>兑换时间</TableHead>
                      <TableHead>创建时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className='py-8 text-center'>
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <RedeemCodeRow key={item.id} item={item} />
                      ))
                    )}
                    {!query.isLoading && items.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className='text-muted-foreground py-8 text-center text-sm'
                        >
                          暂无{tab === 'USED' ? '已使用' : '未使用'}兑换码
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
                pageSizeOptions={[10, 20, 50, 100]}
                className='shrink-0'
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function RedeemCodeRow({ item }: { item: RedeemCodeDetail }) {
  return (
    <TableRow>
      <TableCell className='font-mono text-sm'>{item.code}</TableCell>
      <TableCell>
        <Badge variant={item.status === 'USED' ? 'default' : 'secondary'}>
          {item.status === 'USED' ? '已使用' : '未使用'}
        </Badge>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {item.redeemed_tenant_name || item.redeemed_tenant_id || '-'}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {item.redeemed_user_name || item.redeemed_user_id || '-'}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {item.redeemed_user_nickname || '-'}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTime(item.redeemed_at)}
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatTime(item.created_at)}
      </TableCell>
    </TableRow>
  )
}

function CreateBatchDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [channel, setChannel] = useState('')
  const [quantity, setQuantity] = useState('100')
  const [rewardType, setRewardType] = useState<'POINTS' | 'COUPON'>('POINTS')
  const [points, setPoints] = useState('100')
  const [templateId, setTemplateId] = useState('')
  const [validStartAt, setValidStartAt] = useState(
    toLocalDateTime(new Date().toISOString())
  )
  const [validEndAt, setValidEndAt] = useState('')
  const [remark, setRemark] = useState('')
  const templates = useQuery({
    queryKey: ['coupon-templates'],
    queryFn: () => listCouponTemplates({ page: 1, page_size: 100 }),
  })
  const mutation = useMutation({
    mutationFn: createRedeemBatch,
    onSuccess: () => {
      toast.success('兑换码批次已生成')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '创建批次失败')),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const quantityValue = Number(quantity)
    if (
      !channel.trim() ||
      !Number.isInteger(quantityValue) ||
      quantityValue < 1
    ) {
      toast.error('请填写渠道和有效的生成数量')
      return
    }
    if (!validStartAt || !validEndAt) {
      toast.error('请填写兑换有效期')
      return
    }
    const rewardData =
      rewardType === 'POINTS'
        ? { points: Number(points) }
        : { coupon_template_id: templateId }
    if (
      rewardType === 'POINTS' &&
      (!Number.isInteger(Number(points)) || Number(points) <= 0)
    ) {
      toast.error('积分数量必须为正整数')
      return
    }
    if (rewardType === 'COUPON' && !templateId) {
      toast.error('请选择优惠券模板')
      return
    }
    mutation.mutate({
      channel: channel.trim(),
      quantity: quantityValue,
      reward_type: rewardType,
      reward_data: rewardData,
      valid_start_at: new Date(validStartAt).toISOString(),
      valid_end_at: new Date(validEndAt).toISOString(),
      remark: remark.trim() || undefined,
    })
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建兑换码批次</DialogTitle>
        </DialogHeader>
        <form className='space-y-4' onSubmit={submit}>
          <Field label='投放渠道'>
            <Input
              value={channel}
              placeholder='如 douyin、xiaohongshu'
              onChange={(event) => setChannel(event.target.value)}
            />
          </Field>
          <Field label='生成数量（1 至 10000）'>
            <Input
              inputMode='numeric'
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>
          <Field label='奖励类型'>
            <Select
              value={rewardType}
              onValueChange={(value) =>
                setRewardType(value as 'POINTS' | 'COUPON')
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='POINTS'>积分</SelectItem>
                <SelectItem value='COUPON'>优惠券</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {rewardType === 'POINTS' ? (
            <Field label='积分数量'>
              <Input
                inputMode='numeric'
                value={points}
                onChange={(event) => setPoints(event.target.value)}
              />
            </Field>
          ) : (
            <Field label='优惠券模板'>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='选择模板' />
                </SelectTrigger>
                <SelectContent>
                  {(templates.data?.items ?? []).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label='兑换开始时间'>
            <Input
              type='datetime-local'
              value={validStartAt}
              onChange={(event) => setValidStartAt(event.target.value)}
            />
          </Field>
          <Field label='兑换截止时间'>
            <Input
              type='datetime-local'
              value={validEndAt}
              onChange={(event) => setValidEndAt(event.target.value)}
            />
          </Field>
          <Field label='备注（可选）'>
            <Textarea
              value={remark}
              rows={2}
              onChange={(event) => setRemark(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              生成
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CodesDialog({
  data,
  onClose,
}: {
  data: { batch: RedeemBatch; codes: string[] } | null
  onClose: () => void
}) {
  const copyAll = () => {
    if (!data) return
    void navigator.clipboard.writeText(data.codes.join('\n'))
    toast.success('已复制全部兑换码')
  }
  const download = () => {
    if (!data) return
    const blob = new Blob([data.codes.join('\n')], {
      type: 'text/plain;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `redeem-codes-${data.batch.id}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <Dialog open={Boolean(data)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>批次兑换码（{data?.codes.length ?? 0} 个）</DialogTitle>
        </DialogHeader>
        <div className='bg-muted max-h-72 overflow-auto rounded-md p-3'>
          <pre className='text-xs leading-5 break-all'>
            {data?.codes.join('\n')}
          </pre>
        </div>
        <DialogFooter>
          <Button type='button' variant='outline' onClick={copyAll}>
            复制全部
          </Button>
          <Button type='button' onClick={download}>
            <Download />
            下载 txt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function formatTime(value: string) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
}

function toLocalDateTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
