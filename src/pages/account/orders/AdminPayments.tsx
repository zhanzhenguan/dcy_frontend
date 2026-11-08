import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createAdminRefund,
  listAdminPayments,
  type AdminPaymentItem,
  type PaymentStatus,
  type RefundStatus,
} from '@/services/api/adminPaymentApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog, ThemeSwitch } from '@/components/common'
import { Header } from '@/components/layout/header'
import { ContentPage } from '@/components/layout/PageShell'
import { ProfileDropdown } from '@/components/business'

const pageSize = 20
const FILTER_ALL = 'all'

type Filters = {
  orderNo: string
  paymentNo: string
  tenantPublicId: string
  paymentStatus: '' | PaymentStatus
  refundStatus: '' | RefundStatus | 'NONE'
}

const emptyFilters: Filters = {
  orderNo: '',
  paymentNo: '',
  tenantPublicId: '',
  paymentStatus: '',
  refundStatus: '',
}

export const AdminPaymentsPage = () => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters)
  const [refundTarget, setRefundTarget] = useState<AdminPaymentItem | null>(
    null
  )
  const [refundReason, setRefundReason] = useState('')

  const paymentsQuery = useQuery({
    queryKey: ['admin-payments', page, appliedFilters],
    queryFn: () =>
      listAdminPayments({
        page,
        page_size: pageSize,
        order_no: appliedFilters.orderNo || undefined,
        payment_no: appliedFilters.paymentNo || undefined,
        tenant_public_id: appliedFilters.tenantPublicId || undefined,
        payment_status: appliedFilters.paymentStatus || undefined,
        refund_status: appliedFilters.refundStatus || undefined,
      }),
  })
  const refundMutation = useMutation({
    mutationFn: ({
      paymentNo,
      reason,
    }: {
      paymentNo: string
      reason: string
    }) => createAdminRefund(paymentNo, reason),
    onSuccess: async () => {
      toast.success('退款申请已提交')
      setRefundTarget(null)
      setRefundReason('')
      await queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '发起退款失败，请稍后重试')),
  })
  const totalPages = Math.max(
    1,
    Math.ceil((paymentsQuery.data?.total ?? 0) / pageSize)
  )
  const reasonBytes = new TextEncoder().encode(refundReason.trim()).length

  const applyFilters = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setAppliedFilters({
      ...filters,
      orderNo: filters.orderNo.trim(),
      paymentNo: filters.paymentNo.trim(),
      tenantPublicId: filters.tenantPublicId.trim(),
    })
  }

  const resetFilters = () => {
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setPage(1)
  }

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <ReceiptText className='text-primary size-5 shrink-0' />
          <span className='truncate font-medium'>支付订单</span>
        </div>
        <div className='ms-auto flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            title='刷新支付订单'
            disabled={paymentsQuery.isFetching}
            onClick={() => void paymentsQuery.refetch()}
          >
            <RefreshCw
              className={paymentsQuery.isFetching ? 'animate-spin' : ''}
            />
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <ContentPage
        title='支付订单'
        description={`共 ${paymentsQuery.data?.total ?? 0} 笔支付记录`}
        actions={<Badge variant='secondary'>全平台视图</Badge>}
      >
        <form className='space-y-3' onSubmit={applyFilters}>
          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
            <FilterInput
              id='admin-order-no'
              label='订单号'
              value={filters.orderNo}
              placeholder='输入完整订单号'
              onChange={(orderNo) =>
                setFilters((current) => ({ ...current, orderNo }))
              }
            />
            <FilterInput
              id='admin-payment-no'
              label='支付单号'
              value={filters.paymentNo}
              placeholder='输入完整支付单号'
              onChange={(paymentNo) =>
                setFilters((current) => ({ ...current, paymentNo }))
              }
            />
            <FilterInput
              id='admin-tenant-id'
              label='租户 ID'
              value={filters.tenantPublicId}
              placeholder='输入租户公开 ID'
              onChange={(tenantPublicId) =>
                setFilters((current) => ({ ...current, tenantPublicId }))
              }
            />
            <FilterSelect
              id='admin-payment-status'
              label='支付状态'
              value={filters.paymentStatus}
              options={[
                ['PENDING', '待支付'],
                ['SUCCESS', '支付成功'],
                ['FAILED', '支付失败'],
                ['REFUNDED', '已退款'],
              ]}
              onChange={(paymentStatus) =>
                setFilters((current) => ({
                  ...current,
                  paymentStatus: paymentStatus as Filters['paymentStatus'],
                }))
              }
            />
            <FilterSelect
              id='admin-refund-status'
              label='退款状态'
              value={filters.refundStatus}
              options={[
                ['NONE', '未退款'],
                ['CREATING', '提交中'],
                ['PROCESSING', '处理中'],
                ['SUCCESS', '退款成功'],
                ['CLOSED', '退款关闭'],
                ['ABNORMAL', '退款异常'],
              ]}
              onChange={(refundStatus) =>
                setFilters((current) => ({
                  ...current,
                  refundStatus: refundStatus as Filters['refundStatus'],
                }))
              }
            />
            <div className='flex items-end justify-start gap-2 xl:justify-end'>
              <Button type='submit'>
                <Search /> 查询
              </Button>
              <Button type='button' variant='outline' onClick={resetFilters}>
                <RotateCcw /> 重置
              </Button>
            </div>
          </div>
        </form>

        {paymentsQuery.isLoading ? (
          <div className='text-muted-foreground flex min-h-64 items-center justify-center gap-2 text-sm'>
            <Loader2 className='animate-spin' /> 正在加载支付订单
          </div>
        ) : paymentsQuery.isError ? (
          <div className='border-destructive/40 bg-destructive/5 text-destructive mt-6 border px-4 py-3 text-sm'>
            支付订单加载失败：{getApiErrorMessage(paymentsQuery.error)}
          </div>
        ) : paymentsQuery.data?.items.length ? (
          <>
            <div className='mt-6 hidden overflow-x-auto rounded-md border xl:block'>
              <PaymentTable
                items={paymentsQuery.data.items}
                onRefund={setRefundTarget}
              />
            </div>
            <div className='mt-6 grid gap-3 xl:hidden'>
              {paymentsQuery.data.items.map((item) => (
                <PaymentCard
                  key={item.payment_no}
                  item={item}
                  onRefund={setRefundTarget}
                />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrevious={() => setPage((current) => current - 1)}
              onNext={() => setPage((current) => current + 1)}
            />
          </>
        ) : (
          <div className='text-muted-foreground flex min-h-64 items-center justify-center text-sm'>
            暂无符合条件的支付订单
          </div>
        )}
      </ContentPage>

      <ConfirmDialog
        open={Boolean(refundTarget)}
        onOpenChange={(open) => {
          if (!open && !refundMutation.isPending) {
            setRefundTarget(null)
            setRefundReason('')
          }
        }}
        title='确认发起整单退款？'
        desc={
          <span>
            将按原支付路径退还{' '}
            <strong>
              {refundTarget
                ? formatMoney(refundTarget.amount, refundTarget.currency)
                : ''}
            </strong>
            。提交后以微信退款回调或主动查单结果为准。
          </span>
        }
        confirmText='确认退款'
        cancelBtnText='取消'
        destructive
        disabled={reasonBytes === 0 || reasonBytes > 80}
        isLoading={refundMutation.isPending}
        handleConfirm={() => {
          if (refundTarget && reasonBytes > 0 && reasonBytes <= 80) {
            refundMutation.mutate({
              paymentNo: refundTarget.payment_no,
              reason: refundReason.trim(),
            })
          }
        }}
      >
        <div className='space-y-2'>
          <Label htmlFor='refund-reason'>退款原因</Label>
          <Textarea
            id='refund-reason'
            value={refundReason}
            rows={3}
            placeholder='填写用户可见的退款原因'
            disabled={refundMutation.isPending}
            onChange={(event) => setRefundReason(event.target.value)}
          />
          <div
            className={`text-right text-xs ${reasonBytes > 80 ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {reasonBytes} / 80 字节
          </div>
        </div>
      </ConfirmDialog>
    </>
  )
}

function FilterInput(props: {
  id: string
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <div className='space-y-1.5'>
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  )
}

function FilterSelect(props: {
  id: string
  label: string
  value: string
  options: [string, string][]
  onChange: (value: string) => void
}) {
  return (
    <div className='space-y-1.5'>
      <Label htmlFor={props.id}>{props.label}</Label>
      <Select
        value={props.value || FILTER_ALL}
        onValueChange={(value) =>
          props.onChange(value === FILTER_ALL ? '' : value)
        }
      >
        <SelectTrigger id={props.id} className='w-full'>
          <SelectValue placeholder='全部状态' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTER_ALL}>全部状态</SelectItem>
          {props.options.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function PaymentTable({
  items,
  onRefund,
}: {
  items: AdminPaymentItem[]
  onRefund: (item: AdminPaymentItem) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='ps-4'>订单 / 支付单</TableHead>
          <TableHead>租户</TableHead>
          <TableHead>商品</TableHead>
          <TableHead>金额</TableHead>
          <TableHead>支付</TableHead>
          <TableHead>退款</TableHead>
          <TableHead>时间</TableHead>
          <TableHead className='pe-4 text-right'>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.payment_no}>
            <TableCell className='ps-4'>
              <Identifier value={item.order_no} />
              <Identifier value={item.payment_no} muted />
            </TableCell>
            <TableCell>
              <div className='max-w-40 truncate font-medium'>
                {item.tenant_name}
              </div>
              <div className='text-muted-foreground max-w-40 truncate text-xs'>
                {item.tenant_public_id}
              </div>
            </TableCell>
            <TableCell>
              <div className='max-w-44 truncate font-medium'>
                {item.item_name}
              </div>
              <div className='text-muted-foreground mt-1 text-xs'>
                {item.operator_name}
              </div>
            </TableCell>
            <TableCell className='font-medium'>
              {formatMoney(item.amount, item.currency)}
            </TableCell>
            <TableCell>
              <PaymentStatusBadge status={item.payment_status} />
              <div className='text-muted-foreground mt-1 text-xs'>
                {paymentMethodLabel(item.payment_method)}
              </div>
            </TableCell>
            <TableCell>
              {item.refund_status ? (
                <>
                  <RefundStatusBadge status={item.refund_status} />
                  <div className='text-muted-foreground mt-1 max-w-40 truncate text-xs'>
                    {item.refund_reason}
                  </div>
                </>
              ) : (
                <span className='text-muted-foreground text-sm'>未退款</span>
              )}
            </TableCell>
            <TableCell className='text-muted-foreground text-xs'>
              <div>创建 {formatDateTime(item.created_at)}</div>
              {item.paid_at && <div>支付 {formatDateTime(item.paid_at)}</div>}
              {item.refunded_at && (
                <div>退款 {formatDateTime(item.refunded_at)}</div>
              )}
            </TableCell>
            <TableCell className='pe-4 text-right'>
              <RefundButton item={item} onRefund={onRefund} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function PaymentCard({
  item,
  onRefund,
}: {
  item: AdminPaymentItem
  onRefund: (item: AdminPaymentItem) => void
}) {
  return (
    <article className='rounded-md border p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='truncate font-medium'>{item.item_name}</div>
          <div className='text-muted-foreground mt-1 truncate text-xs'>
            {item.tenant_name} · {item.operator_name}
          </div>
        </div>
        <PaymentStatusBadge status={item.payment_status} />
      </div>
      <div className='mt-3 space-y-1 border-t pt-3'>
        <Identifier value={item.order_no} />
        <Identifier value={item.payment_no} muted />
        <div className='text-muted-foreground text-xs'>
          {paymentMethodLabel(item.payment_method)}
        </div>
      </div>
      <div className='mt-4 flex items-center justify-between gap-3'>
        <div>
          {item.refund_status ? (
            <RefundStatusBadge status={item.refund_status} />
          ) : (
            <span className='text-muted-foreground text-sm'>未退款</span>
          )}
        </div>
        <span className='font-semibold'>
          {formatMoney(item.amount, item.currency)}
        </span>
      </div>
      {item.refund_reason && (
        <div className='text-muted-foreground mt-3 text-xs'>
          退款原因：{item.refund_reason}
        </div>
      )}
      <div className='mt-4 flex items-center justify-between gap-3 border-t pt-3'>
        <span className='text-muted-foreground text-xs'>
          {formatDateTime(item.created_at)}
        </span>
        <RefundButton item={item} onRefund={onRefund} />
      </div>
    </article>
  )
}

function Identifier({
  value,
  muted = false,
}: {
  value: string
  muted?: boolean
}) {
  return (
    <div
      className={`${muted ? 'text-muted-foreground' : ''} max-w-52 truncate font-mono text-xs`}
      title={value}
    >
      {value}
    </div>
  )
}

function RefundButton({
  item,
  onRefund,
}: {
  item: AdminPaymentItem
  onRefund: (item: AdminPaymentItem) => void
}) {
  const canRefund =
    item.payment_status === 'SUCCESS' &&
    (!item.refund_status || item.refund_status === 'CLOSED')
  if (!canRefund) return null
  return (
    <Button size='sm' variant='destructive' onClick={() => onRefund(item)}>
      <RotateCcw /> 退款
    </Button>
  )
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const labels: Record<PaymentStatus, string> = {
    PENDING: '待支付',
    SUCCESS: '支付成功',
    FAILED: '支付失败',
    REFUNDED: '已退款',
  }
  return <Badge variant='outline'>{labels[status]}</Badge>
}

function paymentMethodLabel(paymentMethod: string) {
  const labels: Record<string, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
  }
  return labels[paymentMethod] ?? paymentMethod
}

function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const labels: Record<RefundStatus, string> = {
    CREATING: '提交中',
    PROCESSING: '处理中',
    SUCCESS: '退款成功',
    CLOSED: '退款关闭',
    ABNORMAL: '退款异常',
  }
  const classes: Record<RefundStatus, string> = {
    CREATING:
      'border-sky-300 text-sky-800 dark:border-sky-800 dark:text-sky-300',
    PROCESSING:
      'border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300',
    SUCCESS:
      'border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300',
    CLOSED: 'border-muted-foreground/30 text-muted-foreground',
    ABNORMAL:
      'border-destructive/50 text-destructive dark:border-destructive/70',
  }
  return (
    <Badge variant='outline' className={classes[status]}>
      {labels[status]}
    </Badge>
  )
}

function Pagination(props: {
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className='mt-5 flex items-center justify-end gap-3'>
      <span className='text-muted-foreground text-sm'>
        第 {props.page} / {props.totalPages} 页
      </span>
      <Button
        variant='outline'
        size='icon'
        title='上一页'
        disabled={props.page <= 1}
        onClick={props.onPrevious}
      >
        <ChevronLeft />
      </Button>
      <Button
        variant='outline'
        size='icon'
        title='下一页'
        disabled={props.page >= props.totalPages}
        onClick={props.onNext}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
