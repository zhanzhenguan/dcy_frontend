import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clapperboard, RefreshCw } from 'lucide-react'
import { getApiErrorMessage } from '@/services/api/apiError'
import { formatRelativeUnixTime } from '@/utils/formatRelativeDateTime'
import {
  resolveTimeRangeBounds,
  type TimeRangeFilter,
} from '@/utils/timeRangeFilter'
import {
  getAdminVideoGenerationStats,
  listAdminVideoGenerations,
  type AdminVideoGeneration,
} from '@/services/api/adminVideoApi'
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
  TimeRangeFilterPopover,
} from '@/components/common'
import { useDeferredSearch } from '@/components/common/useDeferredSearch'
import { PageShell } from '@/components/layout/PageShell'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

/** 与后端 videogen.IsValidStatus 对齐的任务状态。 */
const STATUS_OPTIONS = [
  { key: 'all', label: '全部状态' },
  { key: 'queued', label: '排队中' },
  { key: 'running', label: '生成中' },
  { key: 'succeeded', label: '已完成' },
  { key: 'failed', label: '失败' },
  { key: 'cancelled', label: '已取消' },
  { key: 'expired', label: '已过期' },
] as const

type VideoGenerationFilters = {
  keyword: string
  status: string
  timeRange: TimeRangeFilter
}

const INITIAL_FILTERS: VideoGenerationFilters = {
  keyword: '',
  status: 'all',
  timeRange: { preset: 'all' },
}

function isTimeRangeActive(timeRange: TimeRangeFilter) {
  return timeRange.preset !== 'all'
}

export const VideoGenerationAdmin = () => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { draft, applied, setDraft, submit, reset, hasAppliedFilters } =
    useDeferredSearch<VideoGenerationFilters>(INITIAL_FILTERS, {
      isActive: (value: VideoGenerationFilters) =>
        Boolean(value.keyword.trim()) ||
        value.status !== 'all' ||
        isTimeRangeActive(value.timeRange),
    })

  const timeBounds = useMemo(
    () => resolveTimeRangeBounds(applied.timeRange),
    [applied.timeRange]
  )
  const timeParams = useMemo(
    () => ({
      ...(timeBounds?.startSec ? { created_from: timeBounds.startSec } : {}),
      ...(timeBounds?.endSec ? { created_to: timeBounds.endSec } : {}),
    }),
    [timeBounds]
  )

  const query = useQuery({
    queryKey: [
      'admin-video-generations',
      {
        page,
        pageSize,
        status: applied.status,
        tenantKeyword: applied.keyword,
        timeParams,
      },
    ],
    queryFn: () =>
      listAdminVideoGenerations({
        page,
        page_size: pageSize,
        status: applied.status === 'all' ? undefined : applied.status,
        tenant_keyword: applied.keyword || undefined,
        ...timeParams,
      }),
  })

  const statsQuery = useQuery({
    queryKey: [
      'admin-video-generation-stats',
      applied.keyword,
      timeParams,
    ],
    queryFn: () =>
      getAdminVideoGenerationStats({
        tenant_keyword: applied.keyword || undefined,
        ...timeParams,
      }),
  })

  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const { totalCount, succeededCount, processingCount, failedCount } =
    useMemo(() => {
      const stats = statsQuery.data
      const succeeded = stats?.succeeded ?? 0
      const processing = stats?.processing ?? 0
      const failed = stats?.failed ?? 0
      const queued = stats?.queued ?? 0
      const running = stats?.running ?? 0
      const cancelled = stats?.cancelled ?? 0
      const expired = stats?.expired ?? 0
      const all = stats?.total ?? 0

      switch (applied.status) {
        case 'succeeded':
          return {
            totalCount: succeeded,
            succeededCount: succeeded,
            processingCount: 0,
            failedCount: 0,
          }
        case 'queued':
          return {
            totalCount: queued,
            succeededCount: 0,
            processingCount: queued,
            failedCount: 0,
          }
        case 'running':
          return {
            totalCount: running,
            succeededCount: 0,
            processingCount: running,
            failedCount: 0,
          }
        case 'failed':
          return {
            totalCount: failed,
            succeededCount: 0,
            processingCount: 0,
            failedCount: failed,
          }
        case 'cancelled':
          return {
            totalCount: cancelled,
            succeededCount: 0,
            processingCount: 0,
            failedCount: 0,
          }
        case 'expired':
          return {
            totalCount: expired,
            succeededCount: 0,
            processingCount: 0,
            failedCount: 0,
          }
        default:
          return {
            totalCount: all,
            succeededCount: succeeded,
            processingCount: processing,
            failedCount: failed,
          }
      }
    }, [statsQuery.data, applied.status])

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
      title='视频生成记录'
      description='查看平台全部视频生成历史记录，可按租户名称、租户 ID、Owner 昵称、创建者、时间与状态筛选。'
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
            <div className='text-muted-foreground text-xs font-medium'>
              总记录数
            </div>
            <div className='text-foreground mt-1 text-2xl font-bold tracking-tight'>
              {totalCount}
            </div>
          </CardContent>
        </Card>
        <Card className='bg-card border-border/60 shadow-xs'>
          <CardContent className='p-4 text-center sm:text-left'>
            <div className='text-muted-foreground text-xs font-medium'>
              已完成
            </div>
            <div className='mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400'>
              {succeededCount}
            </div>
          </CardContent>
        </Card>
        <Card className='bg-card border-border/60 shadow-xs'>
          <CardContent className='p-4 text-center sm:text-left'>
            <div className='text-muted-foreground text-xs font-medium'>
              处理中
            </div>
            <div className='mt-1 text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400'>
              {processingCount}
            </div>
          </CardContent>
        </Card>
        <Card className='bg-card border-border/60 shadow-xs'>
          <CardContent className='p-4 text-center sm:text-left'>
            <div className='text-muted-foreground text-xs font-medium'>失败</div>
            <div className='mt-1 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400'>
              {failedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <FilterSearchBar
        keyword={draft.keyword}
        onKeywordChange={(keyword) =>
          setDraft((prev: VideoGenerationFilters) => ({ ...prev, keyword }))
        }
        keywordPlaceholder='搜索租户名称 / 租户 ID / Owner / 创建者'
        keywordClassName='w-80'
        onSearch={submitSearch}
        onClear={clearSearch}
        showClear={hasAppliedFilters}
      >
        <Select
          value={draft.status}
          onValueChange={(status) =>
            setDraft((prev: VideoGenerationFilters) => ({ ...prev, status }))
          }
        >
          <SelectTrigger className='w-32'>
            <SelectValue placeholder='任务状态' />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TimeRangeFilterPopover
          value={draft.timeRange}
          onChange={(timeRange) =>
            setDraft((prev: VideoGenerationFilters) => ({
              ...prev,
              timeRange,
            }))
          }
        />
      </FilterSearchBar>

      {query.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive mt-4 rounded-md border px-4 py-3 text-sm'>
          视频生成记录加载失败：{getApiErrorMessage(query.error)}
        </div>
      )}

      <div className='mt-4 overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>项目标题</TableHead>
              <TableHead>创建者</TableHead>
              <TableHead>租户名称</TableHead>
              <TableHead>模型</TableHead>
              <TableHead>分辨率</TableHead>
              <TableHead>视频增强</TableHead>
              <TableHead>宽高比</TableHead>
              <TableHead>时长</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <VideoGenerationRow key={item.id} item={item} />
            ))}
            {!query.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className='text-muted-foreground h-28 text-center'
                >
                  暂无视频生成记录。
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

function VideoGenerationRow({ item }: { item: AdminVideoGeneration }) {
  return (
    <TableRow>
      <TableCell>
        <div className='flex items-center gap-2'>
          <Clapperboard className='text-muted-foreground size-4 shrink-0' />
          <span className='font-medium'>{item.title || '未命名项目'}</span>
        </div>
      </TableCell>
      <TableCell>{item.creator_nickname || '-'}</TableCell>
      <TableCell>
        {item.tenant_name ? (
          item.tenant_name
        ) : (
          <span className='text-muted-foreground'>个人租户</span>
        )}
      </TableCell>
      <TableCell>
        <div className='flex flex-col'>
          <span className='font-medium'>{item.model_name || '-'}</span>
          {item.provider_name && (
            <span className='text-muted-foreground text-xs'>
              {item.provider_name}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>{item.resolution || '-'}</TableCell>
      <TableCell>
        {item.enhancement_used ? (
          <div className='flex flex-col'>
            <Badge variant='secondary'>已使用</Badge>
            <span className='text-muted-foreground text-xs'>
              原始：{item.enhancement_source_resolution || '-'}
            </span>
          </div>
        ) : (
          <span className='text-muted-foreground'>未使用</span>
        )}
      </TableCell>
      <TableCell>{item.ratio || '-'}</TableCell>
      <TableCell>{item.duration > 0 ? `${item.duration} 秒` : '-'}</TableCell>
      <TableCell>
        <StatusBadge status={item.status} />
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {formatRelativeUnixTime(item.created_at)}
      </TableCell>
    </TableRow>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGES[status] ?? { label: status, variant: 'outline' }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

const STATUS_BADGES: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  queued: { label: '排队中', variant: 'secondary' },
  running: { label: '生成中', variant: 'default' },
  succeeded: { label: '已完成', variant: 'default' },
  failed: { label: '失败', variant: 'destructive' },
  cancelled: { label: '已取消', variant: 'outline' },
  expired: { label: '已过期', variant: 'outline' },
}
