import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  ArrowRight,
  CircleDollarSign,
  CloudUpload,
  Film,
  Folder,
  FolderOpen,
  LayoutDashboard,
  RefreshCw,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getAssetDirectoryTree,
  listAssets,
  type AssetDirectory,
} from '@/services/api/assetLibraryApi'
import {
  getDashboardSummary,
  getDashboardTrend,
} from '@/services/api/dashboardApi'
import {
  creditAccountQueryKey,
  creditLotsQueryKey,
  listCreditLots,
  refreshSessionCreditBalance,
} from '@/services/api/creditApi'
import {
  listVideoDrafts,
  listVideoGenerations,
  type VideoDraft,
  type VideoGenerationTask,
} from '@/services/api/videoApi'
import { useAuthStore } from '@/stores/authStore'
import { getUserDisplayName } from '@/utils/user'
import {
  formatSubscriptionExpireLabel,
  resolveTenantPlanDisplay,
} from '@/utils/subscriptionDisplay'
import { cn } from '@/utils/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { WorkbenchHeaderActions } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import {
  formatAssetBytes,
  formatRelativeTime,
} from './workbenchShared'
import { CreationCalendar } from './CreationCalendar'
import { RecentGenerations } from './RecentGenerations'

type ContinueTab = 'drafts' | 'running' | 'queued'

type PersonalWorkbenchProps = {
  /** enterprise-member：企业普通成员，仅展示创作相关模块 */
  variant?: 'personal' | 'enterprise-member'
}

const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024

function countDirectories(nodes: AssetDirectory[]): number {
  return nodes.reduce(
    (sum, node) =>
      sum + (node.id ? 1 : 0) + countDirectories(node.children ?? []),
    0
  )
}

function lotLabel(sourceType: string) {
  const key = sourceType.trim().toLowerCase()
  if (key.includes('grant') || key.includes('reward') || key.includes('赠送'))
    return '平台赠送'
  if (key.includes('plan') || key.includes('subscription') || key.includes('套餐'))
    return '套餐转入'
  if (key.includes('recharge') || key.includes('充值')) return '充值积分'
  if (key.includes('invite') || key.includes('邀请')) return '邀请奖励'
  if (key.includes('marketing') || key.includes('营销')) return '营销赠送'
  if (key.includes('compensation') || key.includes('补偿')) return '平台补偿'
  if (key.includes('adjust') || key.includes('adjustment'))
    return '平台调整'
  return sourceType || '其他'
}

/** 个人工作台 / 企业成员创作工作台 */
export const PersonalWorkbench = ({
  variant = 'personal',
}: PersonalWorkbenchProps) => {
  const isEnterpriseMember = variant === 'enterprise-member'
  const user = useAuthStore((state) => state.auth.user)
  const session = useAuthStore((state) => state.auth.session)
  const tenantId = session?.tenant?.public_id

  const [continueTab, setContinueTab] = useState<ContinueTab>('drafts')

  const creditQuery = useQuery({
    queryKey: creditAccountQueryKey(tenantId),
    queryFn: () => refreshSessionCreditBalance(tenantId),
    enabled: !isEnterpriseMember && Boolean(tenantId),
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  })
  const lotsQuery = useQuery({
    queryKey: creditLotsQueryKey(tenantId),
    queryFn: listCreditLots,
    enabled: !isEnterpriseMember && Boolean(tenantId),
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  })
  const assetsQuery = useQuery({
    queryKey: ['workbench', 'asset-library', 'personal'],
    queryFn: () =>
      listAssets({
        scope: 'personal',
        page: 1,
        page_size: 100,
        sort: 'newest',
      }),
  })
  const directoriesQuery = useQuery({
    queryKey: ['workbench', 'asset-directories'],
    queryFn: getAssetDirectoryTree,
  })
  const draftsQuery = useQuery({
    queryKey: ['workbench', 'video-drafts'],
    queryFn: () => listVideoDrafts(),
  })
  const runningQuery = useQuery({
    queryKey: ['workbench', 'video-running'],
    queryFn: () =>
      listVideoGenerations({ page: 1, page_size: 20, status: 'running' }),
  })
  const queuedQuery = useQuery({
    queryKey: ['workbench', 'video-queued'],
    queryFn: () =>
      listVideoGenerations({ page: 1, page_size: 20, status: 'queued' }),
  })
  const dashboardSummaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', session?.tenant?.public_id],
    queryFn: getDashboardSummary,
    enabled: isEnterpriseMember,
  })
  const dashboardTrendQuery = useQuery({
    queryKey: ['dashboard', 'trend', session?.tenant?.public_id, 7],
    queryFn: () => getDashboardTrend(7),
  })

  const displayName = user ? getUserDisplayName(user) : '创作者'
  const creditBalance =
    creditQuery.data?.available_balance ??
    creditQuery.data?.balance ??
    session?.credit_balance ??
    0
  const frozenBalance = creditQuery.data?.frozen_balance ?? 0
  // 当前套餐卡片取 tenants/current（session）
  const { displayLabel: planDisplayLabel, active: hasPaidPlan } =
    resolveTenantPlanDisplay(session?.tenant)
  const isPro = hasPaidPlan
  const planExpireLabel = formatSubscriptionExpireLabel()
  /** 成员走工作台统计接口取本月消耗与环比，个人租户沿用积分账户累计值 */
  const memberConsumed = dashboardSummaryQuery.data?.credit_consumed
  const memberConsumedPrev = dashboardSummaryQuery.data?.credit_consumed_prev
  const memberConsumedChange =
    memberConsumed == null || memberConsumedPrev == null || memberConsumedPrev === 0
      ? null
      : ((memberConsumed - memberConsumedPrev) / memberConsumedPrev) * 100
  const totalConsumed = isEnterpriseMember
    ? (memberConsumed ?? null)
    : (creditQuery.data?.total_consumed ?? 0)

  const monthGenerated = dashboardSummaryQuery.data?.month_generated
  const monthPublished = dashboardSummaryQuery.data?.month_published ?? 0

  const lotBreakdown = useMemo(() => {
    const items = lotsQuery.data?.items ?? []
    if (items.length === 0) {
      const granted = creditQuery.data?.total_granted ?? 0
      const recharged = creditQuery.data?.total_recharged ?? 0
      const planTransfer = Math.max(
        0,
        creditBalance - granted - recharged - frozenBalance
      )
      return [
        { label: '平台赠送', amount: granted },
        { label: '套餐转入', amount: planTransfer },
        { label: '充值积分', amount: recharged },
      ].filter((item) => item.amount > 0)
    }
    const map = new Map<string, number>()
    for (const lot of items) {
      const label = lotLabel(lot.source_type)
      map.set(label, (map.get(label) ?? 0) + (lot.remaining_amount || 0))
    }
    return Array.from(map.entries()).map(([label, amount]) => ({
      label,
      amount,
    }))
  }, [lotsQuery.data, creditQuery.data, creditBalance, frozenBalance])

  const assets = assetsQuery.data?.items ?? []
  const imageCount = assets.filter((item) => item.asset_type === 'image').length
  const videoCount = assets.filter((item) => item.asset_type === 'video').length
  const fileTotal = assetsQuery.data?.total ?? assets.length
  const usedBytes = assets.reduce((sum, item) => sum + (item.file_size || 0), 0)
  const usedLabel = formatAssetBytes(usedBytes)
  const storagePercent = Math.min(
    100,
    Math.round((usedBytes / STORAGE_QUOTA_BYTES) * 100)
  )
  const personalRoots =
    directoriesQuery.data?.roots.filter((root) => root.scope === 'personal') ??
    []
  const folderCount = countDirectories(personalRoots)

  const weekTrendItems = (dashboardTrendQuery.data?.items ?? []).map((item) => ({
    ...item,
    label: item.date.slice(8),
  }))
  const weekTotal = dashboardTrendQuery.data?.total_generated ?? 0
  const activeDays = weekTrendItems.filter((item) => item.count > 0).length
  const dailyAvg = dashboardTrendQuery.data
    ? dashboardTrendQuery.data.daily_avg.toFixed(1)
    : '0'
  const maxWeekCount = Math.max(1, ...weekTrendItems.map((item) => item.count))

  const isRefreshing =
    (!isEnterpriseMember && creditQuery.isFetching) ||
    assetsQuery.isFetching ||
    draftsQuery.isFetching ||
    runningQuery.isFetching ||
    queuedQuery.isFetching ||
    dashboardTrendQuery.isFetching ||
    (isEnterpriseMember && dashboardSummaryQuery.isFetching)

  const refreshAll = async () => {
    const tasks: Array<Promise<unknown>> = [
      assetsQuery.refetch(),
      directoriesQuery.refetch(),
      draftsQuery.refetch(),
      runningQuery.refetch(),
      queuedQuery.refetch(),
      dashboardTrendQuery.refetch(),
    ]
    if (isEnterpriseMember) {
      await Promise.all([...tasks, dashboardSummaryQuery.refetch()])
      return
    }
    await Promise.all([creditQuery.refetch(), lotsQuery.refetch(), ...tasks])
  }

  return (
    <>
      <Header fixed className='border-b bg-white dark:bg-card'>
        <LayoutDashboard className='text-primary size-5 shrink-0' />
        <span className='truncate font-medium'>
          {isEnterpriseMember ? '企业工作台' : '工作台'}
        </span>
        <Badge
          variant='outline'
          className='bg-primary/5 text-primary border-primary/20 hidden text-[10px] font-normal sm:inline-flex'
        >
          {isEnterpriseMember
            ? '企业概览 · 素材与创作'
            : '积分素材一览 · 继续你的创作'}
        </Badge>
        <div className='ms-auto flex items-center gap-1.5 sm:gap-2'>
          <ThemeSwitch />
          <WorkbenchHeaderActions className='ms-0' />
        </div>
      </Header>

      <Main className='space-y-8'>
        <section className='flex items-start justify-between gap-4'>
          <div className='min-w-0'>
            <h1 className='text-foreground text-2xl font-bold tracking-tight sm:text-3xl'>
              欢迎回来，{displayName}
              {isEnterpriseMember ? ' 👋' : ''}
            </h1>
            <p className='text-muted-foreground mt-2 text-sm sm:text-base'>
              {isEnterpriseMember
                ? '这里是你的创作工作区，继续推进素材与成片。'
                : '今天想创作点什么?'}
            </p>
          </div>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-10 shrink-0 rounded-full'
            title='刷新数据'
            aria-label='刷新数据'
            onClick={() => void refreshAll()}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn('size-4', isRefreshing && 'animate-spin')}
            />
          </Button>
        </section>

        {isEnterpriseMember ? (
          <section className='grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]'>
            <div className='flex min-w-0 flex-col gap-4'>
              <div className='grid items-stretch gap-4 sm:grid-cols-3'>
                <article className='bg-card flex min-h-42 flex-col rounded-2xl border p-5 shadow-sm'>
                  <div className='mb-4 flex items-center gap-2'>
                    <span className='flex size-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-500'>
                      <Activity className='size-4' />
                    </span>
                    <h3 className='text-foreground text-sm font-medium'>
                      积分消耗
                    </h3>
                  </div>
                  <div className='mt-auto'>
                    <p className='text-foreground text-2xl font-bold tracking-tight tabular-nums'>
                      {totalConsumed == null
                        ? '—'
                        : totalConsumed.toLocaleString('en-US')}{' '}
                      <span className='text-muted-foreground text-base font-medium'>
                        积分
                      </span>
                    </p>
                    <p className='text-muted-foreground mt-5 flex items-center gap-1 text-xs font-medium'>
                      较上月{' '}
                      {memberConsumedChange == null ? (
                        <span>—</span>
                      ) : (
                        <>
                          <Activity
                            className={cn(
                              'size-3.5',
                              memberConsumedChange >= 0
                                ? 'text-rose-500'
                                : 'text-emerald-600'
                            )}
                          />
                          <span
                            className={
                              memberConsumedChange >= 0
                                ? 'text-rose-500'
                                : 'text-emerald-600'
                            }
                          >
                            {memberConsumedChange >= 0 ? '+' : ''}
                            {memberConsumedChange.toFixed(1)}%
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </article>

                <article className='bg-card flex min-h-42 flex-col rounded-2xl border p-5 shadow-sm'>
                  <div className='mb-4 flex items-center gap-2'>
                    <span className='flex size-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-500'>
                      <FolderOpen className='size-4' />
                    </span>
                    <h3 className='text-foreground text-sm font-medium'>
                      本月生成
                    </h3>
                  </div>
                  <div className='mt-auto'>
                    <p className='text-foreground text-2xl font-bold tracking-tight tabular-nums'>
                      {monthGenerated == null ? '—' : monthGenerated}
                    </p>
                    <p className='text-muted-foreground mt-5 text-xs'>
                      按我的数据权限统计
                    </p>
                  </div>
                </article>

                <article className='bg-card flex min-h-42 flex-col rounded-2xl border p-5 shadow-sm'>
                  <div className='mb-4 flex items-center gap-2'>
                    <span className='flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600'>
                      <CloudUpload className='size-4' />
                    </span>
                    <h3 className='text-foreground text-sm font-medium'>
                      本月发布
                    </h3>
                  </div>
                  <div className='mt-auto'>
                    <p className='text-foreground text-2xl font-bold tracking-tight tabular-nums'>
                      {monthPublished}
                    </p>
                    <p className='text-muted-foreground mt-5 text-xs'>
                      一键发布即将上线
                    </p>
                  </div>
                </article>
              </div>

              <div className='grid items-stretch gap-4 sm:grid-cols-3'>
                <article className='bg-card flex min-h-42 flex-col rounded-2xl border p-5 shadow-sm'>
                  <div className='mb-4 flex items-center gap-2'>
                    <span className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full'>
                      <CircleDollarSign className='size-4' />
                    </span>
                    <h3 className='text-foreground text-sm font-medium'>
                      企业积分
                    </h3>
                  </div>
                  <div className='mt-auto'>
                    <p className='text-foreground text-2xl font-bold tracking-tight tabular-nums'>
                      {creditBalance.toLocaleString('en-US')}{' '}
                      <span className='text-muted-foreground text-base font-medium'>
                        积分
                      </span>
                    </p>
                    <p className='text-muted-foreground mt-5 flex items-center gap-1.5 text-xs'>
                      <span className='bg-primary size-1.5 rounded-full' />
                      可用 {creditBalance.toLocaleString('en-US')}
                    </p>
                  </div>
                </article>

                <article className='bg-card flex min-h-42 flex-col rounded-2xl border p-5 shadow-sm'>
                  <div className='mb-4 flex items-center justify-between gap-2'>
                    <h3 className='text-foreground text-sm font-medium'>
                      当前套餐
                    </h3>
                    {isPro ? (
                      <Badge className='bg-primary text-primary-foreground rounded-md px-1.5 py-0 text-[10px]'>
                        PRO
                      </Badge>
                    ) : null}
                  </div>
                  <div className='mt-auto'>
                    <p className='text-foreground text-2xl font-bold tracking-tight'>
                      {planDisplayLabel}
                    </p>
                    <p className='text-muted-foreground mt-5 text-xs'>
                      有效期 {planExpireLabel}
                    </p>
                  </div>
                </article>

                <article className='bg-card flex min-h-42 flex-col rounded-2xl border p-5 shadow-sm'>
                  <div className='mb-4 flex items-center gap-2'>
                    <span className='bg-muted text-foreground flex size-8 items-center justify-center rounded-full'>
                      <FolderOpen className='size-4' />
                    </span>
                    <h3 className='text-foreground text-sm font-medium'>
                      素材库
                    </h3>
                  </div>
                  <div className='mt-auto'>
                    <p className='text-foreground text-2xl font-bold tracking-tight tabular-nums'>
                      {assetsQuery.isLoading
                        ? '—'
                        : fileTotal.toLocaleString('en-US')}{' '}
                      <span className='text-muted-foreground text-base font-medium'>
                        个素材
                      </span>
                    </p>
                    <div className='mt-5 flex items-center justify-between gap-2'>
                      <span className='text-muted-foreground text-xs'>
                        约占 {assetsQuery.isLoading ? '—' : usedLabel}
                      </span>
                      <Button
                        asChild
                        size='sm'
                        variant='outline'
                        className='h-7 rounded-full px-3 text-xs'
                      >
                        <Link to='/asset-library'>进入素材库</Link>
                      </Button>
                    </div>
                  </div>
                </article>
              </div>

              <ContinueCreatingCard
                tab={continueTab}
                onTabChange={setContinueTab}
                drafts={draftsQuery.data?.items ?? []}
                running={runningQuery.data?.items ?? []}
                queued={queuedQuery.data?.items ?? []}
                loading={
                  continueTab === 'drafts'
                    ? draftsQuery.isLoading
                    : continueTab === 'running'
                      ? runningQuery.isLoading
                      : queuedQuery.isLoading
                }
              />

              <RecentGenerations />
            </div>

            <aside className='flex w-full flex-col gap-4'>
              <CreationCalendar days={90} />

              <article className='bg-card rounded-2xl border p-5 shadow-sm'>
                <h2 className='text-base font-semibold'>近7日创作</h2>
                <div className='mt-4 grid grid-cols-3 gap-2 border-b pb-4'>
                  <div>
                    <p className='text-muted-foreground text-xs'>生成视频</p>
                    <p className='mt-1 text-xl font-bold tabular-nums'>
                      {weekTotal}
                      <span className='text-muted-foreground ml-0.5 text-xs font-normal'>
                        个
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-xs'>活跃天数</p>
                    <p className='mt-1 text-xl font-bold tabular-nums'>
                      {activeDays}
                      <span className='text-muted-foreground ml-0.5 text-xs font-normal'>
                        天
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-xs'>日均生成</p>
                    <p className='mt-1 text-xl font-bold tabular-nums'>
                      {dailyAvg}
                      <span className='text-muted-foreground ml-0.5 text-xs font-normal'>
                        个
                      </span>
                    </p>
                  </div>
                </div>
                <div className='mt-3 h-44'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart
                      data={weekTrendItems}
                      barCategoryGap='28%'
                      margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke='var(--border)'
                        strokeDasharray='0'
                      />
                      <XAxis
                        dataKey='label'
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        stroke='var(--muted-foreground)'
                      />
                      <YAxis hide domain={[0, 'auto']} />
                      <Bar dataKey='count' radius={0} maxBarSize={28}>
                        {weekTrendItems.map((item) => (
                          <Cell
                            key={item.date}
                            fill={
                              item.count === maxWeekCount
                                ? 'var(--primary)'
                                : 'color-mix(in oklab, var(--primary) 28%, transparent)'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </aside>
          </section>
        ) : (
        <section className='grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]'>
          <div className='flex min-w-0 flex-col gap-4'>
            <div className='grid items-stretch gap-4 sm:grid-cols-3'>
              <article className='bg-card flex h-full flex-col rounded-2xl border p-5 shadow-sm'>
                    <div className='mb-4 flex items-center gap-2'>
                      <span className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full'>
                        <CircleDollarSign className='size-4' />
                      </span>
                      <h2 className='text-sm font-medium'>我的积分</h2>
                    </div>
                    <p className='text-2xl font-bold tracking-tight tabular-nums'>
                      {creditBalance.toLocaleString('en-US')}{' '}
                      <span className='text-muted-foreground text-base font-medium'>
                        积分
                      </span>
                    </p>
                    <div className='text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs'>
                      <span className='inline-flex items-center gap-1.5'>
                        <span className='bg-primary size-1.5 rounded-full' />
                        可用 {creditBalance.toLocaleString('en-US')}
                      </span>
                      <span className='inline-flex items-center gap-1.5'>
                        <span className='size-1.5 rounded-full bg-slate-400' />
                        冻结 {frozenBalance.toLocaleString('en-US')}
                      </span>
                    </div>
                    <ul className='text-muted-foreground mt-4 space-y-1.5 text-xs'>
                      {lotBreakdown.length > 0 ? (
                        lotBreakdown.map((item) => (
                          <li
                            key={item.label}
                            className='flex items-center justify-between gap-2'
                          >
                            <span>{item.label}</span>
                            <span className='text-foreground tabular-nums'>
                              {item.amount.toLocaleString('en-US')}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li>暂无积分明细</li>
                      )}
                    </ul>
                  </article>

                  <article className='bg-card flex h-full flex-col rounded-2xl border p-5 shadow-sm'>
                    <div className='mb-4 flex items-center justify-between gap-2'>
                      <h2 className='text-sm font-medium'>当前套餐</h2>
                      {isPro ? (
                        <Badge className='bg-primary text-primary-foreground rounded-md px-1.5 py-0 text-[10px]'>
                          PRO
                        </Badge>
                      ) : null}
                    </div>
                    <p className='text-2xl font-bold tracking-tight'>
                      {planDisplayLabel}
                    </p>
                    <p className='text-muted-foreground mt-3 text-xs'>
                      有效期至: {planExpireLabel}
                    </p>
                    <div className='mt-auto pt-6'>
                      <Button asChild className='w-full'>
                        <Link to='/profile'>管理订阅</Link>
                      </Button>
                    </div>
                  </article>

              <article className='bg-card flex h-full flex-col rounded-2xl border p-5 shadow-sm'>
                <div className='mb-4 flex items-center justify-between gap-2'>
                  <h2 className='text-sm font-medium'>我的素材</h2>
                  <Link
                    to='/asset-library'
                    className='text-primary text-xs font-medium hover:underline'
                  >
                    进入
                  </Link>
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <div className='bg-primary/5 rounded-xl px-3 py-2.5'>
                    <p className='text-muted-foreground text-xs'>文件夹</p>
                    <p className='mt-1 text-xl font-bold tabular-nums'>
                      {folderCount}
                    </p>
                  </div>
                  <div className='bg-primary/5 rounded-xl px-3 py-2.5'>
                    <p className='text-muted-foreground text-xs'>总文件</p>
                    <p className='mt-1 text-xl font-bold tabular-nums'>
                      {fileTotal.toLocaleString('en-US')}
                    </p>
                  </div>
                </div>
                <p className='text-muted-foreground mt-3 text-xs'>
                  图片: {imageCount} | 视频: {videoCount} | 数字人: —
                </p>
                <div className='mt-3 space-y-1.5'>
                  <div className='bg-muted h-2 overflow-hidden rounded-full'>
                    <div
                      className='bg-primary h-full rounded-full transition-[width]'
                      style={{ width: `${storagePercent}%` }}
                    />
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    {usedLabel} / 10 GB
                  </p>
                </div>
              </article>
            </div>

            <ContinueCreatingCard
              tab={continueTab}
              onTabChange={setContinueTab}
              drafts={draftsQuery.data?.items ?? []}
              running={runningQuery.data?.items ?? []}
              queued={queuedQuery.data?.items ?? []}
              loading={
                continueTab === 'drafts'
                  ? draftsQuery.isLoading
                  : continueTab === 'running'
                    ? runningQuery.isLoading
                    : queuedQuery.isLoading
              }
            />

            <RecentGenerations />
          </div>

          <aside className='flex w-full flex-col gap-4'>
            <CreationCalendar days={90} />

            <article className='bg-card rounded-2xl border p-5 shadow-sm'>
              <h2 className='text-base font-semibold'>近7日创作</h2>
              <div className='mt-4 grid grid-cols-3 gap-2 border-b pb-4'>
                <div>
                  <p className='text-muted-foreground text-xs'>生成视频</p>
                  <p className='mt-1 text-xl font-bold tabular-nums'>
                    {weekTotal}
                    <span className='text-muted-foreground ml-0.5 text-xs font-normal'>
                      个
                    </span>
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground text-xs'>活跃天数</p>
                  <p className='mt-1 text-xl font-bold tabular-nums'>
                    {activeDays}
                    <span className='text-muted-foreground ml-0.5 text-xs font-normal'>
                      天
                    </span>
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground text-xs'>日均生成</p>
                  <p className='mt-1 text-xl font-bold tabular-nums'>
                    {dailyAvg}
                    <span className='text-muted-foreground ml-0.5 text-xs font-normal'>
                      个
                    </span>
                  </p>
                </div>
              </div>
              <div className='mt-3 h-44'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart
                    data={weekTrendItems}
                    barCategoryGap='28%'
                    margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke='var(--border)'
                      strokeDasharray='0'
                    />
                    <XAxis
                      dataKey='label'
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke='var(--muted-foreground)'
                    />
                    <YAxis hide domain={[0, 'auto']} />
                    <Bar dataKey='count' radius={0} maxBarSize={28}>
                      {weekTrendItems.map((item) => (
                        <Cell
                          key={item.date}
                          fill={
                            item.count === maxWeekCount
                              ? 'var(--primary)'
                              : 'color-mix(in oklab, var(--primary) 28%, transparent)'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </aside>
        </section>
        )}
      </Main>
    </>
  )
}

function ContinueCreatingCard({
  tab,
  onTabChange,
  drafts,
  running,
  queued,
  loading,
}: {
  tab: ContinueTab
  onTabChange: (tab: ContinueTab) => void
  drafts: VideoDraft[]
  running: VideoGenerationTask[]
  queued: VideoGenerationTask[]
  loading: boolean
}) {
  const tabs: Array<{ id: ContinueTab; label: string }> = [
    { id: 'drafts', label: '草稿' },
    { id: 'running', label: '进行中' },
    { id: 'queued', label: '待生成' },
  ]

  const draftItems = drafts.slice(0, 3)
  const runningItems = running.slice(0, 3)
  const queuedItems = queued.slice(0, 3)

  return (
    <article className='bg-card flex h-[586px] w-full flex-col rounded-2xl border p-5 shadow-sm'>
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-3'>
        <h2 className='text-base font-semibold'>继续创作</h2>
        <div className='flex items-center gap-1'>
          {tabs.map((item) => (
            <button
              key={item.id}
              type='button'
              onClick={() => onTabChange(item.id)}
              className={cn(
                'relative px-3 py-1.5 text-sm transition-colors',
                tab === item.id
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
              {tab === item.id ? (
                <span className='bg-primary absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full' />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className='mt-5 min-h-0 flex-1 overflow-y-auto'>
        {loading ? (
          <p className='text-muted-foreground flex h-full items-center justify-center py-10 text-center text-sm'>
            加载中...
          </p>
        ) : tab === 'drafts' ? (
          draftItems.length > 0 ? (
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {draftItems.map((draft) => (
                <Link
                  key={draft.id}
                  to='/create'
                  search={{ draftId: draft.id }}
                  className='hover:border-primary/40 group overflow-hidden rounded-xl border transition-colors'
                >
                  <div className='bg-muted relative aspect-video overflow-hidden'>
                    <div className='text-muted-foreground flex h-full items-center justify-center'>
                      <Folder className='size-8' />
                    </div>
                    <span className='bg-primary text-primary-foreground absolute top-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-medium'>
                      草稿
                    </span>
                  </div>
                  <div className='space-y-1 p-3'>
                    <p className='truncate text-sm font-semibold'>
                      {draft.project_title?.trim() || '未命名草稿'}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {formatRelativeTime(draft.updated_at)} 更新
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyContinue hint='还没有草稿，去创建一个吧' />
          )
        ) : tab === 'running' ? (
          runningItems.length > 0 ? (
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {runningItems.map((task) => (
                <ContinueTaskCard key={task.id} task={task} badge='进行中' />
              ))}
            </div>
          ) : (
            <EmptyContinue hint='暂无进行中的生成任务' />
          )
        ) : queuedItems.length > 0 ? (
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {queuedItems.map((task) => (
              <ContinueTaskCard key={task.id} task={task} badge='待生成' />
            ))}
          </div>
        ) : (
          <EmptyContinue hint='暂无排队中的生成任务' />
        )}
      </div>

      <div className='mt-4 flex shrink-0 justify-center'>
        <Link
          to='/tasks'
          className='text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline'
        >
          查看全部
          <ArrowRight className='size-3.5' />
        </Link>
      </div>
    </article>
  )
}

function ContinueTaskCard({
  task,
  badge,
}: {
  task: VideoGenerationTask
  badge: string
}) {
  const poster = task.first_frame_url || task.last_frame_url
  return (
    <Link
      to='/tasks'
      search={{ task: task.id }}
      className='hover:border-primary/40 group overflow-hidden rounded-xl border transition-colors'
    >
      <div className='bg-muted relative aspect-video overflow-hidden'>
        {poster ? (
          <img
            src={poster}
            alt=''
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
          />
        ) : (
          <div className='text-muted-foreground flex h-full items-center justify-center'>
            <Film className='size-8' />
          </div>
        )}
        <span className='bg-background/90 absolute top-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-medium'>
          {badge}
        </span>
      </div>
      <div className='space-y-1 p-3'>
        <p className='truncate text-sm font-semibold'>
          {task.title?.trim() || '未命名任务'}
        </p>
        <p className='text-muted-foreground text-xs'>
          {formatRelativeTime(task.updated_at || task.created_at)} 更新
        </p>
      </div>
    </Link>
  )
}

function EmptyContinue({ hint }: { hint: string }) {
  return (
    <div className='text-muted-foreground flex h-full min-h-40 flex-col items-center justify-center gap-3 text-sm'>
      <p>{hint}</p>
      <Button asChild size='sm'>
        <Link to='/create'>去创作</Link>
      </Button>
    </div>
  )
}
