import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Coins,
  ExternalLink,
  Loader2,
  LockKeyhole,
  RefreshCw,
  WalletCards,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  creditAccountQueryKey,
  creditLotsQueryKey,
  listCreditLots,
  listCreditTransactions,
  refreshSessionCreditBalance,
  type CreditTransaction,
} from '@/services/api/creditApi'
import { canViewCreditDetails } from '@/utils/tenantAccess'
import {
  resolveTimeRangeBounds,
  type TimeRangeFilter,
} from '@/utils/timeRangeFilter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  FilterSearchBar,
  ThemeSwitch,
  TimeRangeFilterPopover,
} from '@/components/common'
import { useDeferredSearch } from '@/components/common/useDeferredSearch'
import { Header } from '@/components/layout/header'
import { ContentPage } from '@/components/layout/PageShell'
import { ProfileDropdown } from '@/components/business'

const pageSize = 20

const TYPE_OPTIONS = [
  { key: 'all', label: '全部类型' },
  { key: 'recharge', label: '充值' },
  { key: 'grant', label: '赠送' },
  { key: 'consume', label: '消费' },
  { key: 'refund', label: '退款' },
  { key: 'adjust', label: '调整' },
  { key: 'freeze', label: '冻结' },
  { key: 'unfreeze', label: '解冻' },
] as const

type CreditFilters = {
  operator: string
  type: string
  timeRange: TimeRangeFilter
}

const INITIAL_FILTERS: CreditFilters = {
  operator: '',
  type: 'all',
  timeRange: { preset: 'all' },
}

function isTimeRangeActive(timeRange: TimeRangeFilter) {
  return timeRange.preset !== 'all'
}

export const CreditsPage = () => {
  const [page, setPage] = useState(1)
  const session = useAuthStore((state) => state.auth.session)
  const tenantId = session?.tenant?.public_id
  const allowed = canViewCreditDetails(session?.tenant)
  const { draft, applied, setDraft, submit, reset, hasAppliedFilters } =
    useDeferredSearch<CreditFilters>(INITIAL_FILTERS, {
      isActive: (value) =>
        Boolean(value.operator.trim()) ||
        value.type !== 'all' ||
        isTimeRangeActive(value.timeRange),
    })
  const timeBounds = useMemo(
    () => resolveTimeRangeBounds(applied.timeRange),
    [applied.timeRange]
  )
  const accountQuery = useQuery({
    queryKey: creditAccountQueryKey(tenantId),
    queryFn: () => refreshSessionCreditBalance(tenantId),
    enabled: allowed && Boolean(tenantId),
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  })
  const transactionsQuery = useQuery({
    queryKey: [
      'credit-transactions',
      tenantId,
      page,
      pageSize,
      applied.type,
      applied.operator,
      timeBounds?.startSec ?? null,
      timeBounds?.endSec ?? null,
    ],
    queryFn: () =>
      listCreditTransactions({
        page,
        page_size: pageSize,
        type: applied.type,
        operator: applied.operator,
        created_from: timeBounds?.startSec,
        created_to: timeBounds?.endSec,
      }),
    enabled: allowed && Boolean(tenantId),
  })
  const lotsQuery = useQuery({
    queryKey: creditLotsQueryKey(tenantId),
    queryFn: listCreditLots,
    enabled: allowed && Boolean(tenantId),
  })
  const totalPages = Math.max(
    1,
    Math.ceil((transactionsQuery.data?.total ?? 0) / pageSize)
  )

  const refresh = () => {
    void accountQuery.refetch()
    void transactionsQuery.refetch()
    void lotsQuery.refetch()
  }

  const handleSearch = () => {
    setPage(1)
    submit()
  }

  const handleClear = () => {
    setPage(1)
    reset()
  }

  if (!allowed) {
    return (
      <>
        <Header>
          <div className='flex min-w-0 items-center gap-2'>
            <Coins className='text-primary size-5 shrink-0' />
            <span className='truncate font-medium'>积分明细</span>
          </div>
          <div className='ms-auto flex items-center gap-1'>
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>
        <ContentPage
          title='积分明细'
          surfaceClassName='text-muted-foreground flex min-h-64 items-center justify-center text-sm'
        >
          仅管理员可查看积分明细
        </ContentPage>
      </>
    )
  }

  return (
    <>
      <Header>
        <div className='flex min-w-0 items-center gap-2'>
          <Coins className='text-primary size-5 shrink-0' />
          <span className='truncate font-medium'>积分明细</span>
        </div>
        <div className='ms-auto flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            title='刷新积分账户'
            onClick={refresh}
            disabled={accountQuery.isFetching || transactionsQuery.isFetching}
          >
            <RefreshCw
              className={
                accountQuery.isFetching || transactionsQuery.isFetching
                  ? 'animate-spin'
                  : ''
              }
            />
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <ContentPage
        title=''
        description=''
      >
        {accountQuery.isLoading ? (
          <div className='text-muted-foreground flex min-h-40 items-center justify-center gap-2 text-sm'>
            <Loader2 className='animate-spin' />
            正在加载积分账户
          </div>
        ) : accountQuery.isError ? (
          <ErrorPanel error={accountQuery.error} fallback='积分账户加载失败' />
        ) : accountQuery.data ? (
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <AccountMetric
              title='积分余额'
              value={accountQuery.data.balance}
              icon={WalletCards}
            />
            <AccountMetric
              title='可用积分'
              value={accountQuery.data.available_balance}
              icon={CircleDollarSign}
              accent='text-emerald-600 dark:text-emerald-400'
            />
            <AccountMetric
              title='冻结积分'
              value={accountQuery.data.frozen_balance}
              icon={LockKeyhole}
              accent='text-amber-600 dark:text-amber-400'
            />
            <AccountMetric
              title='累计消费'
              value={accountQuery.data.total_consumed}
              icon={ArrowUpRight}
              accent='text-red-600 dark:text-red-400'
            />
          </div>
        ) : null}

        <section className='mt-8'>
          <div className='flex flex-wrap items-end justify-between gap-2'>
            <div>
              <h2 className='text-lg font-semibold'>积分流水</h2>
              <p className='text-muted-foreground mt-1 text-sm'>
                共 {transactionsQuery.data?.total ?? 0} 笔，按发生时间倒序排列
              </p>
            </div>
          </div>

          <FilterSearchBar
            className='mt-4'
            keyword={draft.operator}
            onKeywordChange={(operator) =>
              setDraft((prev) => ({ ...prev, operator }))
            }
            keywordPlaceholder='搜索操作人'
            onSearch={handleSearch}
            onClear={handleClear}
            showClear={hasAppliedFilters}
          >
            <Select
              value={draft.type}
              onValueChange={(type) => setDraft((prev) => ({ ...prev, type }))}
            >
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='类型' />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TimeRangeFilterPopover
              value={draft.timeRange}
              onChange={(timeRange) =>
                setDraft((prev) => ({ ...prev, timeRange }))
              }
            />
          </FilterSearchBar>

          {transactionsQuery.isLoading ? (
            <div className='text-muted-foreground flex min-h-64 items-center justify-center gap-2 text-sm'>
              <Loader2 className='animate-spin' />
              正在加载积分流水
            </div>
          ) : transactionsQuery.isError ? (
            <ErrorPanel
              error={transactionsQuery.error}
              fallback='积分流水加载失败'
            />
          ) : transactionsQuery.data?.items.length ? (
            <>
              <div className='mt-4 hidden overflow-hidden rounded-md border md:block'>
                <TransactionTable items={transactionsQuery.data.items} />
              </div>
              <div className='mt-4 grid gap-3 md:hidden'>
                {transactionsQuery.data.items.map((item) => (
                  <TransactionCard key={item.transaction_no} item={item} />
                ))}
              </div>
              <div className='mt-5 flex items-center justify-end gap-3'>
                <span className='text-muted-foreground text-sm'>
                  第 {page} / {totalPages} 页
                </span>
                <Button
                  variant='outline'
                  size='icon'
                  title='上一页'
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  title='下一页'
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            </>
          ) : (
            <div className='text-muted-foreground flex min-h-64 items-center justify-center text-sm'>
              暂无积分流水
            </div>
          )}
        </section>
      </ContentPage>
    </>
  )
}

function AccountMetric({
  title,
  value,
  icon: Icon,
  accent = 'text-primary',
}: {
  title: string
  value: number
  icon: typeof Coins
  accent?: string
}) {
  return (
    <Card className='rounded-lg'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <Icon className={`size-4 ${accent}`} />
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value.toLocaleString()}</div>
        <p className='text-muted-foreground mt-1 text-xs'>Credit</p>
      </CardContent>
    </Card>
  )
}

function TransactionTable({ items }: { items: CreditTransaction[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='ps-4'>类型</TableHead>
          <TableHead>说明</TableHead>
          <TableHead>操作人</TableHead>
          <TableHead>积分变动</TableHead>
          <TableHead>余额 / 冻结</TableHead>
          <TableHead>发生时间</TableHead>
          {/* <TableHead className='pe-4 text-end'>关联业务</TableHead> */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.transaction_no}>
            <TableCell className='ps-4'>
              <TransactionType item={item} />
            </TableCell>
            <TableCell className='max-w-72'>
              <div className='truncate'>
                {item.description || typeLabel(item.type)}
              </div>
              <div className='text-muted-foreground mt-0.5 truncate font-mono text-xs'>
                {item.transaction_no}
              </div>
            </TableCell>
            <TableCell className='max-w-32 truncate'>
              {item.operator_name?.trim() || '—'}
            </TableCell>
            <TableCell>
              <Amount item={item} />
            </TableCell>
            <TableCell>
              {item.balance_after.toLocaleString()}
              <span className='text-muted-foreground'>
                {' '}
                / {item.frozen_after.toLocaleString()}
              </span>
            </TableCell>
            <TableCell>{formatDateTime(item.created_at)}</TableCell>
            {/* <TableCell className='pe-4 text-end'>
              <BusinessLink item={item} />
            </TableCell> */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function TransactionCard({ item }: { item: CreditTransaction }) {
  return (
    <article className='rounded-md border p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <TransactionType item={item} />
          <div className='mt-2 truncate text-sm'>
            {item.description || typeLabel(item.type)}
          </div>
        </div>
        <Amount item={item} />
      </div>
      <div className='text-muted-foreground mt-4 flex items-center justify-between border-t pt-3 text-xs'>
        <span>
          {formatDateTime(item.created_at)}
          {item.operator_name?.trim()
            ? ` · ${item.operator_name.trim()}`
            : ''}
        </span>
        <BusinessLink item={item} />
      </div>
    </article>
  )
}

function TransactionType({ item }: { item: CreditTransaction }) {
  const outgoing = ['consume', 'freeze'].includes(item.type)
  const Icon = outgoing ? ArrowUpRight : ArrowDownLeft
  return (
    <Badge
      variant='outline'
      className={
        outgoing
          ? 'text-red-700 dark:text-red-300'
          : 'text-emerald-700 dark:text-emerald-300'
      }
    >
      <Icon />
      {typeLabel(item.type)}
    </Badge>
  )
}

function Amount({ item }: { item: CreditTransaction }) {
  const value = item.amount
  if (item.type === 'freeze' || item.type === 'unfreeze') {
    return (
      <span
        className={
          item.type === 'freeze'
            ? 'font-medium text-amber-800 dark:text-amber-300'
            : 'font-medium text-emerald-700 dark:text-emerald-300'
        }
      >
        {item.type === 'freeze' ? '冻结 ' : '解冻 '}
        {Math.abs(value).toLocaleString()}
      </span>
    )
  }
  return (
    <span
      className={
        value < 0
          ? 'font-medium text-red-700 dark:text-red-300'
          : 'font-medium text-emerald-700 dark:text-emerald-300'
      }
    >
      {value > 0 ? '+' : ''}
      {value.toLocaleString()}
    </span>
  )
}

function BusinessLink({ item }: { item: CreditTransaction }) {
  if (item.business_type === 'video_generation' && item.business_id) {
    return (
      <Button asChild variant='ghost' size='sm'>
        <Link to='/tasks' search={{ task: item.business_id }}>
          <ExternalLink />
          生成记录
        </Link>
      </Button>
    )
  }
  return (
    <span className='text-muted-foreground text-xs'>
      {businessLabel(item.business_type)}
    </span>
  )
}

function ErrorPanel({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <div className='border-destructive/40 text-destructive mt-6 rounded-md border p-4 text-sm'>
      {getApiErrorMessage(error, fallback)}
    </div>
  )
}

function typeLabel(type: CreditTransaction['type']) {
  return (
    {
      recharge: '充值',
      grant: '赠送',
      consume: '消费',
      refund: '退款',
      adjust: '调整',
      freeze: '冻结',
      unfreeze: '解冻',
    }[type] ?? type
  )
}

function businessLabel(type: string) {
  return (
    {
      video_generation: '视频生成',
      registration: '用户注册',
      subscription_purchase: '订阅购买',
    }[type] ??
    type ??
    '-'
  )
}

function formatDateTime(value: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
