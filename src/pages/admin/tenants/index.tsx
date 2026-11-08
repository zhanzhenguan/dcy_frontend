import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, RefreshCw, UserRound, Users } from 'lucide-react'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  getAdminTenantStats,
  searchAdminTenants,
  type AdminTenantPreview,
} from '@/services/api/tenantApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  Pagination,
} from '@/components/common'
import { useDeferredSearch } from '@/components/common/useDeferredSearch'
import { PageShell } from '@/components/layout/PageShell'

/** 后端 SearchAdminTenants 限制 page_size 最大 50。 */
const PAGE_SIZE_OPTIONS = [10, 20, 50]

const TENANT_TYPE_OPTIONS = [
  { key: 'all', label: '全部类型' },
  { key: 'PERSONAL', label: '个人租户' },
  { key: 'ENTERPRISE', label: '企业租户' },
] as const

const INITIAL_FILTERS: { keyword: string; tenantType: string } = {
  keyword: '',
  tenantType: 'all',
}

/** 横向滚动时固定左侧「租户名称」列（需 border-separate，否则 collapse 下背景易透出）。 */
const STICKY_COL_HEAD =
  'sticky start-0 z-20 min-w-40 bg-surface shadow-[4px_0_8px_-4px_rgba(15,23,42,0.12)]'
const STICKY_COL_CELL =
  'sticky start-0 z-20 min-w-40 bg-surface shadow-[4px_0_8px_-4px_rgba(15,23,42,0.12)] group-hover/row:bg-muted'

export const AdminTenantsPage = () => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { draft, applied, setDraft, submit, reset, hasAppliedFilters } =
    useDeferredSearch(INITIAL_FILTERS, {
      isActive: (value) =>
        Boolean(value.keyword.trim()) || value.tenantType !== 'all',
    })

  const query = useQuery({
    queryKey: [
      'admin-tenants',
      {
        page,
        pageSize,
        tenantType: applied.tenantType,
        keyword: applied.keyword,
      },
    ],
    queryFn: () =>
      searchAdminTenants({
        page,
        page_size: pageSize,
        keyword: applied.keyword || undefined,
        tenant_type:
          applied.tenantType === 'all'
            ? undefined
            : (applied.tenantType as 'PERSONAL' | 'ENTERPRISE'),
      }),
  })

  const statsQuery = useQuery({
    queryKey: ['admin-tenant-stats', applied.keyword],
    queryFn: () =>
      getAdminTenantStats({ keyword: applied.keyword || undefined }),
  })

  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const { totalCount, personalCount, enterpriseCount, activeCount } =
    useMemo(() => {
      const stats = statsQuery.data
      const personal = stats?.personal ?? 0
      const enterprise = stats?.enterprise ?? 0
      const active = stats?.active ?? 0
      const personalActive = stats?.personal_active ?? 0
      const enterpriseActive = stats?.enterprise_active ?? 0
      const all = stats?.total ?? 0

      if (applied.tenantType === 'PERSONAL') {
        return {
          totalCount: personal,
          personalCount: personal,
          enterpriseCount: 0,
          activeCount: personalActive,
        }
      }
      if (applied.tenantType === 'ENTERPRISE') {
        return {
          totalCount: enterprise,
          personalCount: 0,
          enterpriseCount: enterprise,
          activeCount: enterpriseActive,
        }
      }
      return {
        totalCount: all,
        personalCount: personal,
        enterpriseCount: enterprise,
        activeCount: active,
      }
    }, [statsQuery.data, applied.tenantType])

  const submitSearch = () => {
    submit()
    setPage(1)
  }

  const clearSearch = () => {
    reset(INITIAL_FILTERS)
    setPage(1)
  }

  const refreshing = query.isFetching || statsQuery.isFetching

  return (
    <PageShell
      title='平台租户'
      description='查看平台全部租户，可按名称、公开 ID、Owner 昵称/邮箱/手机搜索，并按个人/企业类型筛选。'
      actions={
        <Button
          variant='outline'
          size='icon'
          title='刷新'
          disabled={refreshing}
          onClick={() => {
            void query.refetch()
            void statsQuery.refetch()
          }}
        >
          <RefreshCw className={refreshing ? 'animate-spin' : ''} />
        </Button>
      }
      surfaceClassName='space-y-4'
    >
      <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
        <Card className='bg-card border-border/60 shadow-xs'>
          <CardContent className='p-4 text-center sm:text-left'>
            <div className='text-muted-foreground flex items-center justify-center gap-1.5 text-xs font-medium sm:justify-start'>
              <Users className='size-3.5' />
              总租户数
            </div>
            <div className='text-foreground mt-1 text-2xl font-bold tracking-tight'>
              {totalCount}
            </div>
          </CardContent>
        </Card>
        <Card className='bg-card border-border/60 shadow-xs'>
          <CardContent className='p-4 text-center sm:text-left'>
            <div className='text-muted-foreground flex items-center justify-center gap-1.5 text-xs font-medium sm:justify-start'>
              <UserRound className='size-3.5' />
              个人租户
            </div>
            <div className='mt-1 text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400'>
              {personalCount}
            </div>
          </CardContent>
        </Card>
        <Card className='bg-card border-border/60 shadow-xs'>
          <CardContent className='p-4 text-center sm:text-left'>
            <div className='text-muted-foreground flex items-center justify-center gap-1.5 text-xs font-medium sm:justify-start'>
              <Building2 className='size-3.5' />
              企业租户
            </div>
            <div className='mt-1 text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400'>
              {enterpriseCount}
            </div>
          </CardContent>
        </Card>
        <Card className='bg-card border-border/60 shadow-xs'>
          <CardContent className='p-4 text-center sm:text-left'>
            <div className='text-muted-foreground text-xs font-medium'>
              正常状态
            </div>
            <div className='mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400'>
              {activeCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <FilterSearchBar
        keyword={draft.keyword}
        onKeywordChange={(keyword) =>
          setDraft((prev) => ({ ...prev, keyword }))
        }
        keywordPlaceholder='搜索名称 / ID / 昵称 / 邮箱 / 手机'
        onSearch={submitSearch}
        onClear={clearSearch}
        showClear={hasAppliedFilters}
      >
        <Select
          value={draft.tenantType}
          onValueChange={(tenantType) =>
            setDraft((prev) => ({ ...prev, tenantType }))
          }
        >
          <SelectTrigger className='w-32'>
            <SelectValue placeholder='租户类型' />
          </SelectTrigger>
          <SelectContent>
            {TENANT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSearchBar>

      {query.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive mt-4 rounded-md border px-4 py-3 text-sm'>
          租户列表加载失败：{getApiErrorMessage(query.error)}
        </div>
      )}

      <div className='mt-4 rounded-md border'>
        <Table className='border-separate border-spacing-0'>
          <TableHeader>
            <TableRow className='group/row'>
              <TableHead className={STICKY_COL_HEAD}>租户名称</TableHead>
              <TableHead>公开 ID</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>手机</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>套餐</TableHead>
              <TableHead>积分总额</TableHead>
              <TableHead>可用积分</TableHead>
              <TableHead>注册时间</TableHead>
              <TableHead>资料更新时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TenantRow key={item.id} item={item} />
            ))}
            {!query.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className='text-muted-foreground h-28 text-center'
                >
                  暂无租户。
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
  )
}

function TenantRow({ item }: { item: AdminTenantPreview }) {
  const planLabel = item.plan_level_name || item.plan_level_code || '未订阅'
  return (
    <TableRow className='group/row'>
      <TableCell className={STICKY_COL_CELL}>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>{item.display_name || '-'}</span>
        </div>
      </TableCell>
      <TableCell className='font-mono text-xs'>{item.public_id}</TableCell>
      <TableCell>
        <Badge variant='outline'>
          {item.tenant_type === 'ENTERPRISE' ? '企业租户' : '个人租户'}
        </Badge>
      </TableCell>
      <TableCell className='text-sm'>{item.email || '-'}</TableCell>
      <TableCell className='font-mono text-sm'>{item.phone || '-'}</TableCell>
      <TableCell>
        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
          {item.status === 'active' ? '正常' : item.status || '-'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className='flex flex-col'>
          <span className='font-medium'>{planLabel}</span>
          <span className='text-muted-foreground text-xs'>
            {formatPlanExpiresAt(item.plan_expires_at)}
          </span>
        </div>
      </TableCell>
      <TableCell>{item.credit_balance.toLocaleString()}</TableCell>
      <TableCell>{item.available_credit.toLocaleString()}</TableCell>
      <TableCell className='text-muted-foreground whitespace-nowrap text-xs'>
        {formatDateTime(item.created_at)}
      </TableCell>
      <TableCell className='text-muted-foreground whitespace-nowrap text-xs'>
        {formatDateTime(item.updated_at)}
      </TableCell>
    </TableRow>
  )
}

function formatDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

function formatPlanExpiresAt(value: string) {
  if (!value) return '永久 / 未订阅'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `到期 ${date.toLocaleString('zh-CN', { hour12: false })}`
}
