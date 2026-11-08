import { type FormEvent, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { getApiErrorMessage } from '@/services/api/apiError'
import { useAuthStore } from '@/stores/authStore'
import {
  listOrderHistory,
  type OrderHistoryItem,
  type OrderItemType,
  type OrderStatus,
} from '@/services/api/orderApi'
import {
  canViewAccountBillingTabs,
  isEnterpriseOwnerInContext,
  normalizeTenantType,
} from '@/utils/tenantAccess'
import {
  resolveOrderHistoryScope,
} from '@/utils/orderScope'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { AccountBillingShell } from '@/pages/account/components/AccountBillingShell'
import { useSessionTenant } from '@/hooks/useSessionTenant'
import { AdminPaymentsPage } from './AdminPayments'

const pageSize = 20
const FILTER_ALL = 'all'

type Filters = {
  status: '' | OrderStatus
  itemType: '' | OrderItemType
}

export const OrdersPage = () => {
  return <OrderHistoryPage />
}

export { AdminPaymentsPage }

function OrderHistoryPage() {
  const user = useAuthStore((state) => state.auth.user)
  const { tenant, sessionTenant, tenantType, isPersonal, tenantsQuery } =
    useSessionTenant()
  const ordersScope = resolveOrderHistoryScope(tenantType)
  const showTenantColumn = ordersScope === 'ENTERPRISE'
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>({
    status: '',
    itemType: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters)
  const normalizedTenantType = normalizeTenantType(tenant?.tenant_type)
  const billingAccess = canViewAccountBillingTabs(
    user,
    sessionTenant,
    tenantsQuery.data,
    tenantsQuery.isLoading && !tenantsQuery.data
  )
  const canViewOrders =
    billingAccess === true ||
    (billingAccess === null &&
      !isPersonal &&
      isEnterpriseOwnerInContext(sessionTenant, tenant, tenantsQuery.data))
  const historyQuery = useQuery({
    queryKey: [
      'order-history',
      tenant?.public_id,
      ordersScope,
      page,
      appliedFilters,
    ],
    queryFn: () =>
      listOrderHistory({
        page,
        page_size: pageSize,
        scope: ordersScope,
        tenant_public_id:
          ordersScope === 'ENTERPRISE' ? tenant?.public_id : undefined,
        status: appliedFilters.status || undefined,
        item_type: appliedFilters.itemType || undefined,
      }),
    enabled: canViewOrders,
  })
  const totalPages = Math.max(
    1,
    Math.ceil((historyQuery.data?.total ?? 0) / pageSize)
  )

  const applyFilters = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setAppliedFilters({ ...filters })
  }

  const resetFilters = () => {
    const cleared: Filters = { status: '', itemType: '' }
    setFilters(cleared)
    setAppliedFilters(cleared)
    setPage(1)
  }

  return (
    <AccountBillingShell
      active='orders'
      headerActions={
        <Button
          variant='ghost'
          size='icon'
          title='刷新订单'
          disabled={!canViewOrders || historyQuery.isFetching}
          onClick={() => void historyQuery.refetch()}
        >
          <RefreshCw
            className={historyQuery.isFetching ? 'animate-spin' : ''}
          />
        </Button>
      }
    >
      {!canViewOrders ? (
        <div className='text-muted-foreground flex min-h-64 items-center justify-center text-sm'>
          {normalizedTenantType === 'ENTERPRISE'
            ? '仅企业 owner 可查看企业订单'
            : '当前账号无法查看订单历史'}
        </div>
      ) : (
        <>
            <form
              className='flex flex-wrap items-center gap-x-4 gap-y-3'
              onSubmit={applyFilters}
            >
              <div className='flex items-center gap-2'>
                <label
                  htmlFor='order-status'
                  className='text-muted-foreground shrink-0 text-sm'
                >
                  订单状态
                </label>
                <Select
                  value={filters.status || FILTER_ALL}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      status:
                        value === FILTER_ALL ? '' : (value as OrderStatus),
                    }))
                  }
                >
                  <SelectTrigger id='order-status' className='w-40'>
                    <SelectValue placeholder='全部状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>全部状态</SelectItem>
                    <SelectItem value='PENDING'>待支付</SelectItem>
                    <SelectItem value='PAID'>待履约</SelectItem>
                    <SelectItem value='COMPLETED'>已完成</SelectItem>
                    <SelectItem value='CANCELLED'>已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='flex items-center gap-2'>
                <label
                  htmlFor='order-item-type'
                  className='text-muted-foreground shrink-0 text-sm'
                >
                  商品类型
                </label>
                <Select
                  value={filters.itemType || FILTER_ALL}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      itemType:
                        value === FILTER_ALL ? '' : (value as OrderItemType),
                    }))
                  }
                >
                  <SelectTrigger id='order-item-type' className='w-40'>
                    <SelectValue placeholder='全部类型' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>全部类型</SelectItem>
                    <SelectItem value='PLAN'>订阅套餐</SelectItem>
                    <SelectItem value='POINTS_RECHARGE'>积分充值</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='flex items-center gap-2'>
                <Button type='submit'>查询</Button>
                <Button type='button' variant='outline' onClick={resetFilters}>
                  重置
                </Button>
              </div>
            </form>

            {historyQuery.isLoading ? (
              <LoadingState />
            ) : historyQuery.isError ? (
              <ErrorState error={historyQuery.error} />
            ) : historyQuery.data?.items.length ? (
              <>
                <div className='mt-6 hidden overflow-x-auto rounded-md border lg:block'>
                  <OrderTable
                    items={historyQuery.data.items}
                    showTenantColumn={showTenantColumn}
                  />
                </div>
                <div className='mt-6 grid gap-3 lg:hidden'>
                  {historyQuery.data.items.map((item) => (
                    <OrderCard
                      key={item.order_no}
                      item={item}
                      showTenantColumn={showTenantColumn}
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
                暂无订单记录
              </div>
            )}
          </>
        )}
    </AccountBillingShell>
  )
}

function OrderTable({
  items,
  showTenantColumn,
}: {
  items: OrderHistoryItem[]
  showTenantColumn: boolean
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='ps-4'>订单</TableHead>
          {showTenantColumn ? <TableHead>企业</TableHead> : null}
          <TableHead>商品</TableHead>
          <TableHead>金额</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>下单时间</TableHead>
          <TableHead className='pe-4'>完成时间</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.order_no}>
            <TableCell className='ps-4 font-mono text-xs'>
              {item.order_no}
            </TableCell>
            {showTenantColumn ? (
              <TableCell className='max-w-[160px] truncate text-sm'>
                {item.tenant_name?.trim() || '—'}
              </TableCell>
            ) : null}
            <TableCell>
              <div className='font-medium'>{item.item_name}</div>
              <div className='mt-1'>
                <ItemTypeBadge type={item.item_type} />
              </div>
            </TableCell>
            <TableCell className='font-medium'>
              {formatMoney(item.payable_amount, item.currency)}
            </TableCell>
            <TableCell>
              <OrderStatusBadge status={item.status} />
            </TableCell>
            <TableCell className='text-muted-foreground text-sm'>
              {formatDateTime(item.created_at)}
            </TableCell>
            <TableCell className='text-muted-foreground pe-4 text-sm'>
              {item.completed_at ? formatDateTime(item.completed_at) : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function OrderCard({
  item,
  showTenantColumn,
}: {
  item: OrderHistoryItem
  showTenantColumn: boolean
}) {
  return (
    <article className='rounded-md border p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='truncate font-medium'>{item.item_name}</div>
          <div className='text-muted-foreground mt-1 truncate font-mono text-xs'>
            {item.order_no}
          </div>
          {showTenantColumn && item.tenant_name ? (
            <div className='text-muted-foreground mt-1 truncate text-xs'>
              {item.tenant_name}
            </div>
          ) : null}
        </div>
        <OrderStatusBadge status={item.status} />
      </div>
      <div className='mt-4 flex items-center justify-between gap-3'>
        <ItemTypeBadge type={item.item_type} />
        <span className='font-semibold'>
          {formatMoney(item.payable_amount, item.currency)}
        </span>
      </div>
      <div className='text-muted-foreground mt-4 border-t pt-3 text-xs'>
        下单：{formatDateTime(item.created_at)}
        {item.completed_at && ` · 完成：${formatDateTime(item.completed_at)}`}
      </div>
    </article>
  )
}

function Pagination({
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className='mt-5 flex items-center justify-end gap-3'>
      <span className='text-muted-foreground text-sm'>
        第 {page} / {totalPages} 页
      </span>
      <Button
        variant='outline'
        size='icon'
        title='上一页'
        disabled={page <= 1}
        onClick={onPrevious}
      >
        <ChevronLeft />
      </Button>
      <Button
        variant='outline'
        size='icon'
        title='下一页'
        disabled={page >= totalPages}
        onClick={onNext}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className='text-muted-foreground flex min-h-64 items-center justify-center gap-2 text-sm'>
      <Loader2 className='animate-spin' />
      正在加载订单历史
    </div>
  )
}

function ErrorState({ error }: { error: unknown }) {
  return (
    <div className='border-destructive/40 bg-destructive/5 text-destructive mt-6 border px-4 py-3 text-sm'>
      订单历史加载失败：{getApiErrorMessage(error)}
    </div>
  )
}

function ItemTypeBadge({ type }: { type: OrderItemType }) {
  return (
    <Badge variant='outline'>{type === 'PLAN' ? '订阅套餐' : '积分充值'}</Badge>
  )
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const labels: Record<OrderStatus, string> = {
    PENDING: '待支付',
    PAID: '待履约',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  }
  const classes: Record<OrderStatus, string> = {
    PENDING:
      'border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300',
    PAID: 'border-sky-300 text-sky-800 dark:border-sky-800 dark:text-sky-300',
    COMPLETED:
      'border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300',
    CANCELLED: 'border-muted-foreground/30 text-muted-foreground',
  }
  return (
    <Badge variant='outline' className={classes[status]}>
      {labels[status]}
    </Badge>
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
  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
  })
}
