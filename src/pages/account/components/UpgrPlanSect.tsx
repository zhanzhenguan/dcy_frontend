import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { resolveTenantPlanDisplay } from '@/utils/subscriptionDisplay'
import { canPurchaseSubscription } from '@/utils/tenantAccess'
import { cn } from '@/utils/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  PaymentCheckoutDialog,
  PaymentMethodPicker,
  CouponPicker,
} from '@/components/business'
import { AnimatedTabs, ConfirmDialog } from '@/components/common'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createPaymentAttempt,
  type PaymentAttempt,
  type PaymentMethod,
} from '@/services/api/checkoutApi'
import {
  cancelAutoRenewal,
  getCurrentSubscription,
  listSubscriptionPlans,
  purchaseSubscription,
  type PlanBillingOption,
  type PlanCatalogItem,
  type PlanPurchase,
} from '@/services/api/subscriptionApi'
import {
  refreshSessionTenant,
  applyPlanPurchaseToSession,
} from '@/services/api/tenantApi'

type SelectedOption = {
  plan: PlanCatalogItem
  option: PlanBillingOption
}

type SubscriptionCheckout = {
  attempt: PaymentAttempt
  purchase: PlanPurchase
  item: SelectedOption
}

type PeriodTab = 'TRIAL' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export const UpgradePlansSection = () => {
  const queryClient = useQueryClient()
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const canBuySubscription = canPurchaseSubscription(tenant)
  const [selected, setSelected] = useState<SelectedOption | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [couponId, setCouponId] = useState<string | null>(null)
  const [couponPayableAmount, setCouponPayableAmount] = useState<number | null>(
    null
  )
  const [checkout, setCheckout] = useState<SubscriptionCheckout | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [period, setPeriod] = useState<PeriodTab>(() =>
    periodTabFromBillingPeriod(tenant?.billing_period)
  )
  const [periodTouched, setPeriodTouched] = useState(false)
  const catalogQuery = useQuery({
    queryKey: ['subscription-plans', tenant?.public_id],
    queryFn: listSubscriptionPlans,
    enabled: canBuySubscription && Boolean(tenant?.public_id),
  })
  const currentQuery = useQuery({
    queryKey: ['current-subscription', tenant?.public_id],
    queryFn: getCurrentSubscription,
    enabled: canBuySubscription && Boolean(tenant?.public_id),
  })

  useEffect(() => {
    if (!canBuySubscription || !tenant?.public_id) return
    void refreshSessionTenant().catch(() => undefined)
  }, [canBuySubscription, tenant?.public_id])
  const completePurchase = (purchase: PlanPurchase, item?: SelectedOption) => {
    // 积分乐观展示；入账延迟时由用户手动刷新，不主动拉 /credit/account
    applyPlanPurchaseToSession(purchase, item)
    if (item) {
      const nextPeriod = isTrialOption(item.option)
        ? ('TRIAL' as const)
        : billingOptionPeriod(item.option)
      if (nextPeriod) {
        setPeriodTouched(false)
        setPeriod(nextPeriod)
      }
    }
    void (async () => {
      await refreshSessionTenant().catch(() => undefined)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['subscription-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['current-subscription'] }),
        queryClient.invalidateQueries({ queryKey: ['my-coupons'] }),
      ])
    })()
    toast.success(
      `购买成功，已到账 ${purchase.points_granted.toLocaleString()} 积分`
    )
    setSelected(null)
    setCouponId(null)
    setCouponPayableAmount(null)
  }
  const purchaseMutation = useMutation({
    mutationFn: async ({
      item,
      couponId,
      method,
      paymentWindow,
    }: {
      item: SelectedOption
      couponId: string | null
      method: PaymentMethod | null
      paymentWindow: Window | null
    }) => {
      if (
        !canPurchaseSubscription(useAuthStore.getState().auth.session?.tenant)
      ) {
        throw new Error('企业套餐仅管理员可购买')
      }
      try {
        const purchase = await purchaseSubscription(item.option.id, couponId)
        if (!purchase.payment_required) return { purchase, item }
        if (!method) throw new Error('请选择支付渠道')
        const attempt = await createPaymentAttempt(purchase.order_no, method)
        if (method === 'alipay' && attempt.pay_url && paymentWindow) {
          paymentWindow.opener = null
          paymentWindow.location.replace(attempt.pay_url)
        }
        return { purchase, item, attempt }
      } catch (error) {
        paymentWindow?.close()
        throw error
      }
    },
    onSuccess: (result) => {
      if (result.attempt) {
        setSelected(null)
        setCheckout({
          attempt: result.attempt,
          purchase: result.purchase,
          item: result.item,
        })
        return
      }
      completePurchase(result.purchase, result.item)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '购买失败')),
  })
  const cancelMutation = useMutation({
    mutationFn: cancelAutoRenewal,
    onSuccess: () => {
      toast.success('已取消自动续费，当前套餐权益将在到期前继续生效')
      setCancelOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['current-subscription'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '取消续费失败')),
  })

  const catalog = catalogQuery.data
  const current = currentQuery.data
  const plans = catalog?.items ?? []
  const applicableTenantType: 'PERSONAL' | 'ENTERPRISE' =
    tenant?.tenant_type === 'ENTERPRISE' ? 'ENTERPRISE' : 'PERSONAL'
  const hasActiveSubscription = hasSubscribedPackage(
    current,
    tenant?.plan_level_code,
    tenant?.plan_id,
    plans
  )
  const canPurchase = (option: PlanBillingOption) =>
    option.price_cents === 0 ||
    Boolean(catalog?.development_mode || catalog?.payment_available)
  const isCurrentBillingOption = (
    plan: PlanCatalogItem,
    option: PlanBillingOption
  ) => isTenantCurrentOption(tenant, plan, option, current)
  const tenantPlans = plans.filter(
    (plan) => plan.tenant_type === applicableTenantType
  )
  // 已订阅时隐藏试用 Tab；未订阅且存在试用/免费套餐时展示
  const hasTrialTab =
    !hasActiveSubscription &&
    tenantPlans.some(
      (plan) => billingOptionsForPeriod(plan, 'TRIAL').length > 0
    )
  const tabs = [
    ...(hasTrialTab ? ([['TRIAL', '试用']] as const) : []),
    ['MONTHLY', '月度'],
    ['QUARTERLY', '季度'],
    ['YEARLY', '年度'],
  ] as const
  const displayPeriod: PeriodTab =
    period === 'TRIAL' && !hasTrialTab ? 'MONTHLY' : period
  const displayPlans = tenantPlans.filter(
    (plan) =>
      billingOptionsForPeriod(plan, displayPeriod, {
        includeStandaloneTrials: !hasTrialTab,
      }).length > 0
  )
  const paymentMethods = catalog?.payment_methods ?? []
  const onlinePaymentMethods = paymentMethods.filter(
    (method): method is PaymentMethod => method !== 'bank_transfer'
  )
  const selectOption = (plan: PlanCatalogItem, option: PlanBillingOption) => {
    setSelected({ plan, option })
    setCouponId(null)
    setCouponPayableAmount(null)
    setPaymentMethod(onlinePaymentMethods[0] ?? null)
  }

  // 进入页面时默认切到当前订阅对应的计费周期 Tab
  useEffect(() => {
    if (periodTouched) return
    const resolved = resolveSubscribedPeriod(tenant, current, plans)
    if (!resolved) return
    if (resolved !== period) setPeriod(resolved)
  }, [current, period, periodTouched, plans, tenant])

  // 购买后 / 换购后：以当前订阅接口为准，纠正 session 中的套餐字段
  useEffect(() => {
    if (!tenant || !current || !catalog?.items?.length) return
    if (isPlanExpired(current)) return
    const hasSubscription =
      current.active ||
      current.status === 'ACTIVE' ||
      current.status === 'PAST_DUE' ||
      Boolean(current.plan_billing_option_id || current.plan_version_id)
    if (!hasSubscription) return

    const matched = catalog.items.find(
      (plan) =>
        plan.current_version.id === current.plan_version_id ||
        plan.current_version.billing_options.some(
          (option) => option.id === current.plan_billing_option_id
        )
    )
    if (!matched) return
    const option =
      matched.current_version.billing_options.find(
        (item) => item.id === current.plan_billing_option_id
      ) ?? matched.current_version.billing_options[0]
    const nextBillingPeriod =
      option?.option_type === 'TRIAL'
        ? ('' as const)
        : option?.billing_period || tenant.billing_period
    const nextName = matched.name || tenant.plan_level_name
    const nextLevel = matched.plan_level_code || tenant.plan_level_code

    const needsPatch =
      tenant.plan_id !== matched.id ||
      tenant.plan_level_code !== nextLevel ||
      tenant.plan_level_name !== nextName ||
      tenant.billing_period !== nextBillingPeriod ||
      !resolveTenantPlanDisplay(tenant).active

    if (!needsPatch) return

    useAuthStore.getState().auth.updateTenant({
      ...tenant,
      plan_id: matched.id,
      plan_level_code: nextLevel,
      plan_level_name: nextName,
      billing_period: nextBillingPeriod,
    })
  }, [catalog?.items, current, tenant])

  if (!canBuySubscription) {
    return (
      <div className='text-muted-foreground flex min-h-52 items-center justify-center border text-sm'>
        企业套餐仅管理员可购买，请联系管理员处理
      </div>
    )
  }

  return (
    <section className='bg-surface space-y-4 rounded-2xl border p-6 shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h2 className='text-xl font-bold'>
            {applicableTenantType === 'PERSONAL' ? '个人版订阅' : '企业版订阅'}
          </h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            选择套餐版本与购买方式，自动续费可随时取消。
          </p>
        </div>
        <Button
          variant='outline'
          size='icon'
          title='刷新套餐'
          onClick={() => {
            void queryClient.invalidateQueries({
              queryKey: ['subscription-plans'],
            })
            void queryClient.invalidateQueries({
              queryKey: ['current-subscription'],
            })
          }}
          disabled={catalogQuery.isFetching || currentQuery.isFetching}
        >
          <RefreshCw
            className={
              catalogQuery.isFetching || currentQuery.isFetching
                ? 'animate-spin'
                : ''
            }
          />
        </Button>
      </div>

      <AnimatedTabs
        value={displayPeriod}
        onValueChange={(value) => {
          setPeriodTouched(true)
          setPeriod(value as PeriodTab)
        }}
        items={tabs.map(([value, label]) => ({ value, label }))}
        listClassName='border bg-card shadow-xs'
      />

      {current?.active && (
        <div className='border-primary bg-primary/5 flex flex-wrap items-center justify-between gap-3 border-s-4 px-4 py-3'>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2 text-sm font-medium'>
              当前订阅
              <Badge variant={current.auto_renew ? 'default' : 'secondary'}>
                {current.auto_renew ? '自动续费中' : '已取消续费'}
              </Badge>
            </div>
            <p className='text-muted-foreground mt-1 text-xs'>
              {current.auto_renew && current.next_billing_at
                ? `下次续费：${formatDate(current.next_billing_at)}`
                : `有效期至：${formatDate(current.current_period_end)}`}
            </p>
          </div>
          {current.auto_renew && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setCancelOpen(true)}
            >
              <RotateCcw />
              取消自动续费
            </Button>
          )}
        </div>
      )}

      {catalogQuery.isLoading ? (
        <div className='text-muted-foreground flex min-h-52 items-center justify-center gap-2 border text-sm'>
          <Loader2 className='animate-spin' /> 正在加载套餐
        </div>
      ) : catalogQuery.isError ? (
        <div className='border-destructive/40 text-destructive border p-4 text-sm'>
          {getApiErrorMessage(catalogQuery.error, '套餐加载失败')}
        </div>
      ) : displayPlans.length === 0 ? (
        <div className='text-muted-foreground flex min-h-52 items-center justify-center border text-sm'>
          当前租户暂无{periodLabel(displayPeriod)}套餐
        </div>
      ) : (
        <ul className='grid list-none grid-cols-1 items-stretch gap-5 p-0 lg:grid-cols-2 xl:grid-cols-3'>
          {displayPlans.map((plan) => {
            const version = plan.current_version
            const billingOptions = billingOptionsForPeriod(
              plan,
              displayPeriod,
              {
                includeStandaloneTrials: !hasTrialTab,
              }
            )
            const primaryOption = billingOptions[0]
            if (!primaryOption) return null
            const isPrimaryCurrent = Boolean(
              isCurrentBillingOption(plan, primaryOption)
            )
            const subscribeDisabled =
              isPrimaryCurrent || !canPurchase(primaryOption)
            // 仅当前 billing_period 对应档位展示「当前套餐」角标并置灰；其它周期可换购
            const cardDisabled = isPrimaryCurrent
            const benefits = parseBenefits(version.benefits)
            const popular = isRecommendedPlan(plan, displayPlans)
            const periodSuffix =
              displayPeriod === 'TRIAL'
                ? trialValidityLabel(primaryOption.trial_validity_period) ||
                  '试用'
                : shortPeriodLabel(displayPeriod)
            const creditsPeriodLabel =
              displayPeriod === 'TRIAL'
                ? '积分'
                : `积分 / ${shortPeriodLabel(displayPeriod)}`
            const videoEstimate = estimateVideosFromPoints(
              version.points_amount
            )

            return (
              <li
                key={plan.id}
                className={cn(
                  'relative flex',
                  popular && !cardDisabled && 'z-1',
                  cardDisabled && 'opacity-60'
                )}
              >
                {popular && !cardDisabled ? (
                  <span className='bg-primary text-primary-foreground absolute -top-3 left-1/2 z-1 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm'>
                    推荐
                  </span>
                ) : null}
                {cardDisabled ? (
                  <span className='bg-muted text-muted-foreground absolute -top-3 left-1/2 z-1 -translate-x-1/2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm'>
                    当前套餐
                  </span>
                ) : null}
                <article
                  className={cn(
                    'bg-card flex min-h-[31.25rem] w-full min-w-[19.125rem] flex-col items-center overflow-hidden rounded-2xl border px-6 pt-8 pb-5 shadow-sm transition-shadow',
                    cardDisabled
                      ? 'bg-muted/50 border-muted-foreground/20'
                      : popular
                        ? 'border-primary border-2 shadow-[0_14px_36px_color-mix(in_oklab,var(--primary)_18%,transparent)]'
                        : 'border-border hover:border-primary/30',
                    isPrimaryCurrent && 'ring-primary/20 ring-1'
                  )}
                >
                  <div className='flex w-full shrink-0 flex-col items-center text-center'>
                    <div className='flex min-h-7 flex-wrap items-center justify-center gap-2'>
                      <h3 className='text-foreground text-base font-semibold'>
                        {plan.name}
                      </h3>
                    </div>

                    <p className='mt-3 flex items-end justify-center gap-0.5'>
                      <span className='text-foreground text-4xl font-bold tracking-tight'>
                        {formatPrice(primaryOption)}
                      </span>
                      <span className='text-muted-foreground pb-1 text-sm'>
                        /{periodSuffix}
                      </span>
                    </p>
                    {primaryOption.original_price_cents >
                    primaryOption.price_cents ? (
                      <p className='text-muted-foreground mt-1 text-xs line-through'>
                        {formatPriceCents(
                          primaryOption.original_price_cents,
                          primaryOption.currency
                        )}
                      </p>
                    ) : null}

                    <div className='bg-primary/5 mt-5 w-full rounded-xl px-4 py-4'>
                      <p className='text-primary text-4xl font-bold tracking-tight tabular-nums'>
                        {version.points_amount.toLocaleString('en-US')}
                      </p>
                      <p className='text-muted-foreground mt-1 text-sm'>
                        {creditsPeriodLabel}
                        {primaryOption.bonus_points > 0
                          ? ` · 赠送 ${primaryOption.bonus_points.toLocaleString()}`
                          : ''}
                      </p>
                    </div>

                    {videoEstimate > 0 ? (
                      <p className='text-muted-foreground mt-3 text-sm'>
                        约{' '}
                        <strong className='text-foreground'>
                          {videoEstimate}
                        </strong>{' '}
                        条 <strong className='text-foreground'>15</strong> 秒
                        视频
                      </p>
                    ) : (
                      <div className='mt-3 h-5' />
                    )}
                  </div>

                  <ul className='mt-5 min-h-0 w-full flex-1 space-y-2.5 overflow-y-auto text-left text-sm'>
                    {(benefits.length > 0
                      ? benefits
                      : ['按当前版本提供完整套餐权益']
                    ).map((benefit) => (
                      <li key={benefit} className='flex items-start gap-2'>
                        <Check
                          className='mt-0.5 size-4 shrink-0 text-emerald-500'
                          strokeWidth={2.5}
                          aria-hidden
                        />
                        <span className='text-muted-foreground'>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.description.trim() ? (
                    <p className='text-muted-foreground mt-4 w-full shrink-0 text-left text-sm leading-relaxed break-words whitespace-pre-wrap'>
                      {plan.description.trim()}
                    </p>
                  ) : null}

                  <Button
                    size='lg'
                    variant={
                      cardDisabled
                        ? 'secondary'
                        : popular
                          ? 'default'
                          : 'outline'
                    }
                    disabled={subscribeDisabled}
                    className='mt-6 h-11 w-full shrink-0 rounded-xl text-base font-semibold'
                    onClick={() => {
                      if (subscribeDisabled || !primaryOption) return
                      selectOption(plan, primaryOption)
                    }}
                  >
                    {isPrimaryCurrent
                      ? '已订阅'
                      : displayPeriod === 'TRIAL'
                        ? '立即试用'
                        : '立即订阅'}
                  </Button>

                  {billingOptions.length > 1 ? (
                    <div className='mt-4 w-full space-y-2 border-t pt-4'>
                      <p className='text-muted-foreground text-xs'>
                        其他购买方式
                      </p>
                      {billingOptions.slice(1).map((option) => {
                        const optionCurrent = isCurrentBillingOption(
                          plan,
                          option
                        )
                        return (
                          <Button
                            key={option.id}
                            size='sm'
                            variant='outline'
                            disabled={optionCurrent || !canPurchase(option)}
                            className='w-full justify-between gap-3'
                            onClick={() => {
                              if (optionCurrent) return
                              selectOption(plan, option)
                            }}
                          >
                            <span className='min-w-0 truncate'>
                              {optionCurrent
                                ? '已订阅'
                                : `${billingLabel(option)}${option.auto_renew ? ' · 自动续费' : ''}`}
                            </span>
                            <span className='shrink-0 font-semibold'>
                              {formatPrice(option)}
                            </span>
                          </Button>
                        )
                      })}
                    </div>
                  ) : null}
                </article>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
            setCouponId(null)
            setCouponPayableAmount(null)
          }
        }}
        title={
          selected &&
          tenant?.plan_id &&
          !isTenantCurrentOption(tenant, selected.plan, selected.option)
            ? `升级至 ${selected.plan.name}`
            : `购买 ${selected?.plan.name ?? ''}`
        }
        desc={
          selected ? (
            <div className='space-y-4'>
              <p>
                {billingLabel(selected.option)}，应付{' '}
                {formatPrice(selected.option)}，到账{' '}
                {(
                  selected.plan.current_version.points_amount +
                  selected.option.bonus_points
                ).toLocaleString()}{' '}
                积分。
                {selected.option.auto_renew ? '将按同一方案自动续费。' : ''}
              </p>
              {selected.option.price_cents > 0 &&
                !catalog?.development_mode && (
                  <PaymentMethodPicker
                    methods={paymentMethods}
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    bankTransferContent={catalog?.bank_transfer_content ?? ''}
                  />
                )}
              <CouponPicker
                open={Boolean(selected)}
                purchaseType='PACKAGE'
                purchaseId={selected.option.id}
                value={couponId}
                onChange={setCouponId}
                onPayableAmountChange={setCouponPayableAmount}
              />
            </div>
          ) : (
            ''
          )
        }
        cancelBtnText='取消'
        confirmText={
          selected &&
          tenant?.plan_id &&
          !isTenantCurrentOption(tenant, selected.plan, selected.option)
            ? '确认升级'
            : '确认购买'
        }
        isLoading={purchaseMutation.isPending}
        handleConfirm={() => {
          if (!selected) return
          const requiresPayment =
            (couponPayableAmount ?? selected.option.price_cents) > 0 &&
            !catalog?.development_mode
          if (requiresPayment && !paymentMethod) {
            toast.error('请选择支付渠道')
            return
          }
          const paymentWindow =
            requiresPayment && paymentMethod === 'alipay'
              ? window.open('about:blank', '_blank')
              : null
          purchaseMutation.mutate({
            item: selected,
            couponId,
            method: paymentMethod,
            paymentWindow,
          })
        }}
      />
      <PaymentCheckoutDialog
        attempt={checkout?.attempt ?? null}
        onOpenChange={(open) => !open && setCheckout(null)}
        onPaid={() => {
          if (checkout) {
            completePurchase(checkout.purchase, checkout.item)
          } else {
            void refreshSessionTenant().catch(() => undefined)
            toast.success('支付成功，套餐权益正在生效')
            void queryClient.invalidateQueries({
              queryKey: ['subscription-plans'],
            })
            void queryClient.invalidateQueries({
              queryKey: ['current-subscription'],
            })
          }
          setCheckout(null)
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title='取消自动续费'
        desc='取消后不会再自动扣款，当前套餐权益将持续到本周期结束。'
        cancelBtnText='保留续费'
        confirmText='确认取消'
        destructive
        isLoading={cancelMutation.isPending}
        handleConfirm={() => cancelMutation.mutate()}
      />
    </section>
  )
}

function estimateVideosFromPoints(points: number) {
  // 与官网口径一致：约 15 积分 / 条 15 秒视频
  if (!Number.isFinite(points) || points <= 0) return 0
  return Math.max(0, Math.floor(points / 15))
}

function isRecommendedPlan(plan: PlanCatalogItem, plans: PlanCatalogItem[]) {
  if (plans.length === 0) return false
  const byName = plans.find((item) =>
    /标准|standard/i.test(`${item.name} ${item.code}`)
  )
  if (byName) return byName.id === plan.id
  const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order)
  const mid = sorted[Math.floor((sorted.length - 1) / 2)]
  return mid?.id === plan.id
}

function parseBenefits(value: string) {
  if (!value.trim()) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string')
    }
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).map(
        ([key, item]) => `${key}：${String(item)}`
      )
    }
  } catch {
    // 兼容早期按换行保存的权益文案。
  }
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function billingLabel(option: PlanBillingOption) {
  if (option.option_type === 'TRIAL') {
    return (
      option.description ||
      `试用 · ${trialValidityLabel(option.trial_validity_period)}`
    )
  }
  return (
    option.description || `${billingPeriodLabel(option.billing_period)}方案`
  )
}

function formatPrice(option: PlanBillingOption) {
  return formatPriceCents(option.price_cents, option.currency)
}

function formatPriceCents(priceCents: number, currency: string) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100)
}

function formatDate(value: string) {
  if (!value) return '待确认'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(date)
}

function hasSubscribedPackage(
  current: Awaited<ReturnType<typeof getCurrentSubscription>> | undefined,
  tenantPlanLevelCode: string | undefined,
  tenantPlanId: string | undefined,
  plans: PlanCatalogItem[]
) {
  if (isPlanExpired(current)) return false
  if (tenantPlanId?.trim()) return true
  if (current?.active) return true
  if (current?.status === 'ACTIVE' || current?.status === 'PAST_DUE')
    return true
  if (
    current?.status === 'CANCELLED' &&
    current.current_period_end &&
    !Number.isNaN(new Date(current.current_period_end).getTime()) &&
    new Date(current.current_period_end).getTime() > Date.now()
  ) {
    return true
  }
  if (current?.id && current.plan_version_id) return true

  const tenantPlan = plans.find((plan) => plan.id === tenantPlanId)
  if (tenantPlan && tenantPlan.plan_level_code !== 'FREE') return true

  const levelCode = (tenantPlanLevelCode ?? '').trim().toUpperCase()
  return Boolean(levelCode && levelCode !== 'FREE')
}

function isPlanExpired(
  current: Awaited<ReturnType<typeof getCurrentSubscription>> | undefined
) {
  if (!current) return false
  if (
    current.current_period_end &&
    !Number.isNaN(new Date(current.current_period_end).getTime()) &&
    new Date(current.current_period_end).getTime() <= Date.now()
  ) {
    return true
  }
  if (current.id && current.active === false) return true
  return current.status === 'EXPIRED'
}

function resolveSubscribedPeriod(
  tenant:
    | {
        plan_id?: string
        billing_period?: 'MONTH' | 'QUARTER' | 'YEAR' | ''
      }
    | null
    | undefined,
  current: Awaited<ReturnType<typeof getCurrentSubscription>> | undefined,
  plans: PlanCatalogItem[]
): PeriodTab | null {
  if (isPlanExpired(current)) return null

  if (current?.plan_billing_option_id) {
    for (const plan of plans) {
      const option = plan.current_version.billing_options.find(
        (item) => item.id === current.plan_billing_option_id
      )
      if (!option) continue
      if (isTrialOption(option)) return 'TRIAL'
      return billingOptionPeriod(option)
    }
  }

  if (tenant?.billing_period) {
    return periodTabFromBillingPeriod(tenant.billing_period)
  }

  if (tenant?.plan_id) {
    const plan = plans.find((item) => item.id === tenant.plan_id)
    const option = plan?.current_version.billing_options.find(
      (item) => !isTrialOption(item) && item.enabled
    )
    if (option) {
      if (isTrialOption(option)) return 'TRIAL'
      return billingOptionPeriod(option)
    }
  }

  return null
}

function isTenantCurrentOption(
  tenant:
    | {
        plan_id?: string
        billing_period?: 'MONTH' | 'QUARTER' | 'YEAR' | ''
      }
    | null
    | undefined,
  plan: PlanCatalogItem,
  option: PlanBillingOption,
  current?: Awaited<ReturnType<typeof getCurrentSubscription>>
) {
  if (isPlanExpired(current)) return false

  // 优先用当前订阅接口的精确购买方案匹配（一人/一企仅一档）
  if (
    current?.plan_billing_option_id &&
    current.plan_billing_option_id === option.id
  ) {
    return true
  }

  const subscribedPeriod = (
    current?.billing_period ||
    tenant?.billing_period ||
    ''
  )
    .trim()
    .toUpperCase()
  const optionPeriod = (option.billing_period ?? '').trim().toUpperCase()

  const samePlan =
    (tenant?.plan_id?.trim() && tenant.plan_id === plan.id) ||
    Boolean(
      current?.plan_version_id &&
      current.plan_version_id === plan.current_version.id
    )

  if (!samePlan) return false

  // 试用：billing_period 为空，只标记试用档
  if (!subscribedPeriod) {
    return isTrialOption(option) || !optionPeriod
  }

  // 用 billing_period 区分月/季/年角标所在 Tab
  return optionPeriod === subscribedPeriod
}

function periodTabFromBillingPeriod(
  billingPeriod: 'MONTH' | 'QUARTER' | 'YEAR' | '' | undefined
): PeriodTab {
  if (billingPeriod === 'MONTH') return 'MONTHLY'
  if (billingPeriod === 'QUARTER') return 'QUARTERLY'
  if (billingPeriod === 'YEAR') return 'YEARLY'
  if (!billingPeriod) return 'TRIAL'
  return 'MONTHLY'
}

function isTrialOption(option: PlanBillingOption) {
  return option.option_type === 'TRIAL'
}

function billingOptionsForPeriod(
  plan: PlanCatalogItem,
  period: PeriodTab,
  flags?: { includeStandaloneTrials?: boolean }
) {
  const options = plan.current_version.billing_options ?? []
  if (period === 'TRIAL') {
    // 试用页签只能展示试用购买方案，避免免费套餐的普通方案被误购为试用套餐。
    return options.filter(isTrialOption)
  }
  const paid = options.filter(
    (option) => !isTrialOption(option) && billingOptionPeriod(option) === period
  )
  if (paid.length > 0) return paid
  // 体验包等级为 TRIAL、往往只有试用购买方案；已订阅后试用 Tab 会隐藏，挂到月度以免从列表消失
  if (
    flags?.includeStandaloneTrials &&
    period === 'MONTHLY' &&
    options.some(isTrialOption) &&
    !options.some(
      (option) => !isTrialOption(option) && billingOptionPeriod(option)
    )
  ) {
    return options.filter(isTrialOption)
  }
  return paid
}

function billingOptionPeriod(
  option: PlanBillingOption
): Exclude<PeriodTab, 'TRIAL'> | null {
  if (option.billing_period === 'MONTH') return 'MONTHLY'
  if (option.billing_period === 'QUARTER') return 'QUARTERLY'
  if (option.billing_period === 'YEAR') return 'YEARLY'
  return null
}

function billingPeriodLabel(period: PlanBillingOption['billing_period']) {
  return { MONTH: '月付', QUARTER: '季付', YEAR: '年付', '': '' }[period]
}

function trialValidityLabel(
  period: PlanBillingOption['trial_validity_period']
) {
  return {
    MONTH: '一个月',
    QUARTER: '一个季度',
    YEAR: '一年',
    FOREVER: '永不过期',
    '': '',
  }[period]
}

function shortPeriodLabel(period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY') {
  return { MONTHLY: '月', QUARTERLY: '季', YEARLY: '年' }[period]
}

function periodLabel(period: PeriodTab) {
  return { TRIAL: '试用', MONTHLY: '月度', QUARTERLY: '季度', YEARLY: '年度' }[
    period
  ]
}
