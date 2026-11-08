import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  ChevronRight,
  CircleDollarSign,
  FolderOpen,
  Info,
  LayoutDashboard,
  Medal,
  RefreshCw,
} from 'lucide-react'
import { type ReactNode } from 'react'
import { getDashboardSummary } from '@/services/api/dashboardApi'
import {
  creditAccountQueryKey,
  refreshSessionCreditBalance,
} from '@/services/api/creditApi'
import {
  formatSubscriptionExpireLabel,
  resolveTenantPlanDisplay,
} from '@/utils/subscriptionDisplay'
import {
  canManageAccountBilling,
  canViewCreditDetails,
} from '@/utils/tenantAccess'
import { useAuthStore } from '@/stores/authStore'
import { getUserDisplayName } from '@/utils/user'
import { cn } from '@/utils/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { WorkbenchHeaderActions } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import { WorkbenchExtras } from './WorkbenchExtras'
import { formatAssetBytes } from './workbenchShared'

/** 企业工作台 */
export const EnterpriseWorkbench = () => {
  const user = useAuthStore((state) => state.auth.user)
  const session = useAuthStore((state) => state.auth.session)
  const canManageBilling = canManageAccountBilling(session?.tenant)
  const canViewCredits = canViewCreditDetails(session?.tenant)
  const tenantId = session?.tenant?.public_id

  const creditQuery = useQuery({
    queryKey: creditAccountQueryKey(tenantId),
    queryFn: () => refreshSessionCreditBalance(tenantId),
    enabled: canViewCredits && Boolean(tenantId),
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  })

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', tenantId],
    queryFn: getDashboardSummary,
  })

  const displayName = user ? getUserDisplayName(user) : '创作者'
  const creditBalance =
    creditQuery.data?.available_balance ??
    creditQuery.data?.balance ??
    session?.credit_balance ??
    0
  // 积分消耗卡：本月消耗与环比（上月为 0 时环比无意义，显示 —）
  const monthConsumed = summaryQuery.data?.credit_consumed
  const prevConsumed = summaryQuery.data?.credit_consumed_prev
  const consumedChangePercent =
    monthConsumed == null || prevConsumed == null || prevConsumed === 0
      ? null
      : ((monthConsumed - prevConsumed) / prevConsumed) * 100
  // 当前套餐卡片取 tenants/current（session）
  const { displayLabel: planDisplayLabel } = resolveTenantPlanDisplay(
    session?.tenant
  )
  const planExpireLabel = formatSubscriptionExpireLabel()
  const assetTotal = summaryQuery.data?.asset_total
  const assetUsedLabel = summaryQuery.data
    ? formatAssetBytes(summaryQuery.data.asset_total_bytes)
    : '—'
  const isRefreshing = creditQuery.isFetching || summaryQuery.isFetching

  const refreshAll = async () => {
    await Promise.all([
      canViewCredits ? creditQuery.refetch() : Promise.resolve(null),
      summaryQuery.refetch(),
    ])
  }

  return (
    <>
      <Header fixed className='border-b bg-white dark:bg-card'>
        <LayoutDashboard className='text-primary size-5 shrink-0' />
        <span className='truncate font-medium'>企业工作台</span>
        <Badge
          variant='outline'
          className='bg-primary/5 text-primary border-primary/20 hidden text-[10px] font-normal sm:inline-flex'
        >
          企业创作中心 · 掌握团队脉搏
        </Badge>
        <div className='ms-auto flex items-center gap-0.5 sm:gap-1'>
          <ThemeSwitch />
          <WorkbenchHeaderActions className='ms-0' />
        </div>
      </Header>

      <Main className='space-y-8'>
        <section className='flex items-start justify-between gap-4'>
          <div className='min-w-0'>
            <h1 className='text-foreground text-2xl font-bold tracking-tight sm:text-3xl'>
              欢迎回来，{displayName} 👋
            </h1>
            <p className='text-muted-foreground mt-2 text-sm sm:text-base'>
              这里是你的企业创作中心，掌握团队脉搏。
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

        {/* 转化数据 / 内容数据暂隐藏 */}

        <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <AccountCard
            title='企业积分'
            icon={
              <span className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full'>
                <CircleDollarSign className='size-4' />
              </span>
            }
            titleExtra={
              <Info className='text-muted-foreground size-3.5' aria-hidden />
            }
            headerAction={
              canViewCredits ? (
                <Link
                  to='/credits'
                  className='text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 text-xs transition-colors'
                >
                  明细
                  <ChevronRight className='size-3.5' aria-hidden />
                </Link>
              ) : null
            }
          >
            <p className='text-foreground text-2xl font-bold tracking-tight tabular-nums'>
              {creditBalance.toLocaleString('en-US')}{' '}
              <span className='text-muted-foreground text-base font-medium'>
                积分
              </span>
            </p>
            <div className='mt-5 flex items-center justify-between gap-2'>
              <span className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                <span className='bg-primary size-1.5 rounded-full' />
                可用 {creditBalance.toLocaleString('en-US')}
              </span>
              {canManageBilling ? (
                <Button
                  asChild
                  size='sm'
                  className='h-7 rounded-full px-3 text-xs'
                >
                  <Link to='/profile'>充值</Link>
                </Button>
              ) : null}
            </div>
          </AccountCard>

          <AccountCard
            title='当前套餐'
            icon={
              <span className='flex size-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600'>
                <Medal className='size-4' />
              </span>
            }
          >
            <p className='text-foreground text-2xl font-bold tracking-tight'>
              {planDisplayLabel}
            </p>
            <div className='mt-5 flex items-center justify-between gap-2'>
              <span className='text-muted-foreground text-xs'>
                有效期 {planExpireLabel}
              </span>
              {canManageBilling ? (
                <Button
                  asChild
                  size='sm'
                  className='h-7 rounded-full px-3 text-xs'
                >
                  <Link to='/profile'>管理订阅</Link>
                </Button>
              ) : null}
            </div>
          </AccountCard>

          <AccountCard
            title='积分消耗'
            icon={
              <span className='flex size-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-500'>
                <Activity className='size-4' />
              </span>
            }
          >
            <p className='text-foreground text-2xl font-bold tracking-tight tabular-nums'>
              {(monthConsumed ?? 0).toLocaleString('en-US')}{' '}
              <span className='text-muted-foreground text-base font-medium'>
                积分
              </span>
            </p>
            <p className='text-muted-foreground mt-5 flex items-center gap-1 text-xs font-medium'>
              较上月{' '}
              {consumedChangePercent == null ? (
                <span>—</span>
              ) : (
                <>
                  <Activity
                    className={cn(
                      'size-3.5',
                      consumedChangePercent >= 0
                        ? 'text-rose-500'
                        : 'text-emerald-600'
                    )}
                  />
                  <span
                    className={
                      consumedChangePercent >= 0
                        ? 'text-rose-500'
                        : 'text-emerald-600'
                    }
                  >
                    {consumedChangePercent >= 0 ? '+' : ''}
                    {consumedChangePercent.toFixed(1)}%
                  </span>
                </>
              )}
            </p>
          </AccountCard>

          <AccountCard
            title='素材库'
            icon={
              <span className='bg-muted text-foreground flex size-8 items-center justify-center rounded-full'>
                <FolderOpen className='size-4' />
              </span>
            }
          >
            <p className='text-foreground text-2xl font-bold tracking-tight tabular-nums'>
              {assetTotal == null ? '—' : assetTotal.toLocaleString('en-US')}{' '}
              <span className='text-muted-foreground text-base font-medium'>
                个素材
              </span>
            </p>
            <div className='mt-5 flex items-center justify-between gap-2'>
              <span className='text-muted-foreground text-xs'>
                共 {assetUsedLabel}
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
          </AccountCard>
        </section>

        <WorkbenchExtras />
      </Main>
    </>
  )
}

function AccountCard({
  title,
  icon,
  titleExtra,
  headerAction,
  children,
}: {
  title: string
  icon: ReactNode
  titleExtra?: ReactNode
  headerAction?: ReactNode
  children: ReactNode
}) {
  return (
    <article className='bg-card flex min-h-42 flex-col rounded-2xl border p-5 shadow-sm'>
      <div className='mb-4 flex items-center gap-2'>
        {icon}
        <h3 className='text-foreground text-sm font-medium'>{title}</h3>
        {titleExtra}
        {headerAction ? <div className='ms-auto shrink-0'>{headerAction}</div> : null}
      </div>
      <div className='mt-auto'>{children}</div>
    </article>
  )
}
