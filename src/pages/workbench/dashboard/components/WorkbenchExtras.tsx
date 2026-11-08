import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  CloudUpload,
  FolderOpen,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getDashboardSummary,
  getDashboardTrend,
  type DashboardRankMember,
} from '@/services/api/dashboardApi'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/utils/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreationCalendar } from './CreationCalendar'

// const reminders = [
//   {
//     tone: 'rose' as const,
//     title: '企业积分即将不足',
//     body: '可用积分低于 10%，可能影响团队创作。',
//     action: { label: '立即充值', to: '/profile' as const },
//   },
//   {
//     tone: 'amber' as const,
//     title: '套餐将在 15 天后到期',
//     body: '专业版套餐将于 2026-12-31 到期，请及时续费。',
//   },
//   {
//     tone: 'sky' as const,
//     title: '3 个视频生成失败',
//     body: '成员李四的任务因参数错误失败，积分已退回。',
//   },
// ]

// const toneClass = {
//   rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300',
//   amber:
//     'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
//   sky: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300',
// }

const TREND_RANGES = [
  { value: '7', days: 7 },
  { value: '14', days: 14 },
  { value: '30', days: 30 },
] as const

/** 工作台补充模块：运营概览、趋势、活跃、创作日历、企业提醒 */
export const WorkbenchExtras = () => {
  const tenantPublicId = useAuthStore(
    (state) => state.auth.session?.tenant?.public_id
  )
  const [range, setRange] = useState<string>('7')
  const [activityTab, setActivityTab] = useState<'rank' | 'consume'>('rank')

  const rangeDays = Number(range) as 7 | 14 | 30
  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', tenantPublicId],
    queryFn: getDashboardSummary,
  })
  const trendQuery = useQuery({
    queryKey: ['dashboard', 'trend', tenantPublicId, rangeDays],
    queryFn: () => getDashboardTrend(rangeDays),
  })

  const summary = summaryQuery.data
  const trend = trendQuery.data
  const trendItems = (trend?.items ?? []).map((item) => ({
    ...item,
    label: item.date.slice(5).replace('-', '/'),
  }))
  const maxTrendCount = Math.max(1, ...trendItems.map((item) => item.count))
  const peakDate = trendItems.find((item) => item.count === maxTrendCount)?.label
  const ranking = trend?.ranking ?? []
  const maxGenerated = Math.max(1, ...ranking.map((row) => row.generated))
  const maxConsumed = Math.max(1, ...ranking.map((row) => row.consumed))

  const cards = [
    {
      title: '本月生成',
      value: summary ? String(summary.month_generated) : '—',
      suffix: '',
      detail: '',
      loading: summaryQuery.isLoading,
      action: null as null | { label: string; to: '/tasks' },
      icon: FolderOpen,
      iconClass: 'bg-rose-500/10 text-rose-500',
    },
    {
      title: '本月发布',
      // 一键发布功能未上线，后端预留字段恒为 0
      value: summary ? String(summary.month_published) : '0',
      suffix: '',
      detail: '',
      loading: false,
      action: null,
      icon: CloudUpload,
      iconClass: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      title: '团队成员',
      value: summary ? String(summary.team_member_total) : '—',
      suffix: '人',
      detail: summary
        ? `${summary.team_group_total} 分组, ${summary.active_member_total} 近7日活跃`
        : '',
      loading: summaryQuery.isLoading,
      action: { label: '管理成员', to: '/organization-team' as const },
      icon: Users,
      iconClass: 'bg-sky-500/10 text-sky-600',
    },
    {
      title: '待处理任务',
      value: summary ? String(summary.pending_task_total) : '—',
      suffix: '个',
      detail: summary
        ? `排队中 ${summary.pending_queued}, 生成中 ${summary.pending_running}`
        : '',
      loading: summaryQuery.isLoading,
      action: { label: '查看队列', to: '/tasks' as const },
      icon: ClipboardList,
      iconClass: 'bg-amber-500/10 text-amber-600',
    },
  ]

  return (
    <div className='space-y-8'>
      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {cards.map((card) => (
          <article
            key={card.title}
            className='bg-card rounded-2xl border p-5 shadow-sm'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='text-muted-foreground text-sm'>{card.title}</p>
                <p className='mt-3 flex items-baseline gap-1 text-3xl font-bold tracking-tight tabular-nums'>
                  {card.value}
                  {card.suffix ? (
                    <span className='text-foreground text-base font-semibold'>
                      {card.suffix}
                    </span>
                  ) : (
                    <ArrowUpRight className='text-muted-foreground size-4' />
                  )}
                </p>
              </div>
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-xl',
                  card.iconClass
                )}
              >
                <card.icon className='size-5' />
              </span>
            </div>
            <div className='mt-4 flex items-center justify-between gap-2'>
              {card.detail ? (
                <p className='text-muted-foreground text-xs'>{card.detail}</p>
              ) : (
                <span />
              )}
              {card.action ? (
                <Link
                  to={card.action.to}
                  className='text-primary inline-flex shrink-0 items-center gap-0.5 text-xs font-medium hover:underline'
                >
                  {card.action.label}
                  <ArrowRight className='size-3' />
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]'>
        <div className='flex flex-col gap-8'>
          <article className='bg-card rounded-2xl border p-5 shadow-sm'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <h2 className='text-base font-semibold'>团队创作趋势</h2>
                <p className='text-muted-foreground mt-1 text-sm'>
                  近{rangeDays}日视频生成量与活跃度分析
                </p>
              </div>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className='h-8 w-[6.5rem] rounded-lg text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TREND_RANGES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      近{item.days}日
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='mt-5 flex w-full border-b pb-4'>
              <TrendStat
                label='生成视频 (个)'
                value={trend ? String(trend.total_generated) : '—'}
                className='min-w-0 flex-1'
              />
              <TrendStat
                label='活跃成员 (人)'
                value={trend ? String(trend.active_members) : '—'}
                className='min-w-0 flex-1 border-l px-4 sm:px-8'
              />
              <TrendStat
                label='日均生成 (个)'
                value={trend ? trend.daily_avg.toFixed(1) : '—'}
                className='min-w-0 flex-1 border-l px-4 sm:px-8'
              />
            </div>

            <div className='mt-4 h-60'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={trendItems}
                  barCategoryGap='28%'
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke='var(--border)'
                    strokeDasharray='0'
                  />
                  <XAxis dataKey='label' hide />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={28}
                    domain={[0, 'auto']}
                    allowDecimals={false}
                    stroke='var(--muted-foreground)'
                  />
                  <Bar dataKey='count' radius={0} maxBarSize={56}>
                    {trendItems.map((item) => (
                      <Cell
                        key={item.date}
                        fill={
                          item.label === peakDate
                            ? 'var(--primary)'
                            : 'color-mix(in oklab, var(--primary) 28%, transparent)'
                        }
                      />
                    ))}
                    <LabelList
                      dataKey='label'
                      content={({ x, y, width, height, value, index }) => {
                        if (
                          typeof x !== 'number' ||
                          typeof y !== 'number' ||
                          typeof width !== 'number' ||
                          typeof height !== 'number'
                        ) {
                          return null
                        }
                        const isPeak = trendItems[Number(index)]?.label === peakDate
                        return (
                          <text
                            x={x + width / 2}
                            y={y + height - 10}
                            textAnchor='middle'
                            dominantBaseline='auto'
                            fill={
                              isPeak
                                ? 'var(--primary-foreground)'
                                : 'var(--foreground)'
                            }
                            fontSize={11}
                          >
                            {String(value)}
                          </text>
                        )
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className='bg-card rounded-2xl border p-5 shadow-sm'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <h2 className='text-base font-semibold'>团队活跃情况</h2>
              <div className='bg-muted inline-flex rounded-lg p-1'>
                <button
                  type='button'
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    activityTab === 'rank'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setActivityTab('rank')}
                >
                  生成排行
                </button>
                <button
                  type='button'
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    activityTab === 'consume'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setActivityTab('consume')}
                >
                  积分消耗
                </button>
              </div>
            </div>

            <div className='mt-4 overflow-x-auto'>
              <table className='w-full min-w-[32rem] text-sm'>
                <thead>
                  <tr className='text-muted-foreground border-b bg-muted/40 text-left text-xs'>
                    <th className='px-2 py-2.5 font-medium'>排名</th>
                    <th className='px-2 py-2.5 font-medium'>成员</th>
                    <th className='px-2 py-2.5 font-medium'>
                      {activityTab === 'rank' ? '生成数量' : '消耗积分'}
                    </th>
                    <th className='px-2 py-2.5 font-medium'>趋势</th>
                  </tr>
                </thead>
                <tbody>
                  {trendQuery.isLoading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className='text-muted-foreground px-2 py-8 text-center text-sm'
                      >
                        加载中…
                      </td>
                    </tr>
                  ) : ranking.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className='text-muted-foreground px-2 py-8 text-center text-sm'
                      >
                        本月暂无创作数据
                      </td>
                    </tr>
                  ) : (
                    ranking.map((row) => (
                      <RankRow
                        key={row.rank}
                        row={row}
                        activityTab={activityTab}
                        maxGenerated={maxGenerated}
                        maxConsumed={maxConsumed}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className='mt-4 flex justify-center'>
              <Link
                to='/organization-team'
                search={{ tab: 'members' }}
                className='text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline'
              >
                查看完整名单
                <ArrowRight className='size-3.5' />
              </Link>
            </div>
          </article>
        </div>

        <div className='flex flex-col gap-4'>
          <CreationCalendar days={90} />

          {/* <article className='bg-card rounded-2xl border p-5 shadow-sm'>
            <div className='flex items-center gap-2'>
              <h2 className='text-base font-semibold'>企业提醒</h2>
              <span className='inline-flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white'>
                {reminders.length}
              </span>
            </div>
            <div className='mt-4 space-y-3'>
              {reminders.map((item) => (
                <div
                  key={item.title}
                  className={cn(
                    'rounded-xl border px-3.5 py-3',
                    toneClass[item.tone]
                  )}
                >
                  <p className='text-sm font-semibold'>{item.title}</p>
                  <p className='mt-1 text-xs leading-5 opacity-90'>{item.body}</p>
                  {item.action ? (
                    <Link
                      to={item.action.to}
                      className='text-primary mt-2 inline-flex text-xs font-medium hover:underline'
                    >
                      {item.action.label}
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </article> */}
        </div>
      </section>
    </div>
  )
}

function RankRow({
  row,
  activityTab,
  maxGenerated,
  maxConsumed,
}: {
  row: DashboardRankMember
  activityTab: 'rank' | 'consume'
  maxGenerated: number
  maxConsumed: number
}) {
  const barPercent =
    activityTab === 'rank'
      ? Math.round((row.generated / maxGenerated) * 100)
      : Math.round((row.consumed / maxConsumed) * 100)
  const initial = (row.nickname || row.email || '?').trim().charAt(0).toUpperCase()

  return (
    <tr className='border-b last:border-0'>
      <td className='px-2 py-3'>
        <span
          className={cn(
            'inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold',
            row.rank === 1 && 'bg-amber-400 text-white',
            row.rank === 2 && 'bg-zinc-300 text-zinc-800',
            row.rank === 3 && 'bg-orange-300 text-orange-900',
            row.rank > 3 && 'bg-muted text-muted-foreground'
          )}
        >
          {row.rank}
        </span>
      </td>
      <td className='px-2 py-3'>
        <div className='flex items-center gap-2.5'>
          <Avatar className='size-8'>
            <AvatarFallback className='bg-primary/10 text-primary text-xs font-semibold'>
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0'>
            <p className='truncate font-medium'>{row.nickname || '未命名成员'}</p>
            <p className='text-muted-foreground truncate text-xs'>{row.email}</p>
          </div>
        </div>
      </td>
      <td className='px-2 py-3 font-semibold tabular-nums'>
        {activityTab === 'rank'
          ? row.generated
          : row.consumed.toLocaleString('en-US')}
      </td>
      <td className='px-2 py-3'>
        <div className='bg-muted h-2 w-24 overflow-hidden rounded-full'>
          <div
            className='bg-primary h-full rounded-full'
            style={{ width: `${barPercent}%` }}
          />
        </div>
      </td>
    </tr>
  )
}

function TrendStat({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn(className)}>
      <p className='text-muted-foreground text-xs'>{label}</p>
      <p className='mt-1 text-2xl font-bold tracking-tight tabular-nums'>
        {value}
      </p>
    </div>
  )
}
