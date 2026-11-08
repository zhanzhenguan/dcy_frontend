import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { canPurchaseSubscription } from '@/utils/tenantAccess'
import { cn } from '@/utils/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog, AnimatedTabs } from '@/components/common'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createPaymentAttempt,
  type PaymentAttempt,
  type PaymentMethod,
} from '@/services/api/checkoutApi'
import {
  getCurrentSubscription,
  listSubscriptionPlans,
  purchaseSubscription,
  type PlanBillingOption,
  type PlanCatalogItem,
  type PlanPurchase,
} from '@/services/api/subscriptionApi'
import {
  applyPlanPurchaseToSession,
  refreshSessionTenant,
} from '@/services/api/tenantApi'
import { CouponPicker } from './CouponPicker'
import {
  PaymentCheckoutDialog,
  PaymentMethodPicker,
} from './PaymentCheckoutDialog'
import './plansPickerDialog.scss'

type PeriodTab = 'TRIAL' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

type SelectedOption = {
  plan: PlanCatalogItem
  option: PlanBillingOption
}

type SubscriptionCheckout = {
  attempt: PaymentAttempt
  purchase: PlanPurchase
  item: SelectedOption
}

type PlansPickerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EMPTY_PLANS: PlanCatalogItem[] = []

export const PlansPickerDialog = ({
  open,
  onOpenChange,
}: PlansPickerDialogProps) => {
  const queryClient = useQueryClient()
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const canBuySubscription = canPurchaseSubscription(tenant)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [period, setPeriod] = useState<PeriodTab | null>(null)
  const [selected, setSelected] = useState<SelectedOption | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [couponId, setCouponId] = useState<string | null>(null)
  const [couponPayableAmount, setCouponPayableAmount] = useState<number | null>(
    null
  )
  const [checkout, setCheckout] = useState<SubscriptionCheckout | null>(null)

  const catalogQuery = useQuery({
    queryKey: ['subscription-plans', tenant?.public_id],
    queryFn: listSubscriptionPlans,
    enabled: open && canBuySubscription && Boolean(tenant?.public_id),
  })
  const currentQuery = useQuery({
    queryKey: ['current-subscription', tenant?.public_id],
    queryFn: getCurrentSubscription,
    enabled: open && canBuySubscription && Boolean(tenant?.public_id),
  })

  const completePurchase = (purchase: PlanPurchase, item?: SelectedOption) => {
    // 积分乐观展示；入账延迟时由用户手动刷新，不主动拉 /credit/account
    applyPlanPurchaseToSession(purchase, item)
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
    onOpenChange(false)
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

  const catalog = catalogQuery.data
  const current = currentQuery.data
  const plans = catalog?.items ?? EMPTY_PLANS
  const applicableTenantType: 'PERSONAL' | 'ENTERPRISE' =
    tenant?.tenant_type === 'ENTERPRISE' ? 'ENTERPRISE' : 'PERSONAL'
  const tenantPlans = useMemo(
    () => plans.filter((plan) => plan.tenant_type === applicableTenantType),
    [plans, applicableTenantType]
  )
  const hasActiveSubscription = Boolean(
    tenant?.plan_id?.trim() || (current?.active && current.status !== 'EXPIRED')
  )
  const hasTrialTab =
    !hasActiveSubscription &&
    tenantPlans.some(
      (plan) => billingOptionsForPeriod(plan, 'TRIAL').length > 0
    )

  const tabs = useMemo(() => {
    const next: Array<[PeriodTab, string]> = []
    if (hasTrialTab) next.push(['TRIAL', '试用'])
    next.push(['YEARLY', '年度'], ['MONTHLY', '月度'], ['QUARTERLY', '季度'])
    return next.filter(([value]) =>
      tenantPlans.some(
        (plan) =>
          billingOptionsForPeriod(plan, value, {
            includeStandaloneTrials: !hasTrialTab && value === 'MONTHLY',
          }).length > 0
      )
    )
  }, [hasTrialTab, tenantPlans])

  const displayPeriod: PeriodTab =
    period && tabs.some(([value]) => value === period)
      ? period
      : (tabs[0]?.[0] ?? 'MONTHLY')

  useEffect(() => {
    if (!open) {
      setPeriod(null)
      return
    }
    if (!tabs[0]) return
    // 打开后默认第一个；用户手动切换后保留，仅在当前项失效时回退
    setPeriod((prev) => {
      if (prev == null) return tabs[0][0]
      if (!tabs.some(([value]) => value === prev)) return tabs[0][0]
      return prev
    })
  }, [open, tabs])

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
  const canPurchase = (option: PlanBillingOption) =>
    option.price_cents === 0 ||
    Boolean(catalog?.development_mode || catalog?.payment_available)

  const isCurrentOption = (
    plan: PlanCatalogItem,
    option: PlanBillingOption
  ) => {
    if (current?.plan_billing_option_id) {
      return current.plan_billing_option_id === option.id
    }
    const samePlan =
      (tenant?.plan_id?.trim() && tenant.plan_id === plan.id) ||
      Boolean(
        current?.plan_version_id &&
        current.plan_version_id === plan.current_version?.id
      )
    if (!samePlan) return false
    const subscribedPeriod = (
      current?.billing_period ||
      tenant?.billing_period ||
      ''
    )
      .trim()
      .toUpperCase()
    if (!subscribedPeriod) return option.option_type === 'TRIAL'
    return (
      (option.billing_period ?? '').trim().toUpperCase() === subscribedPeriod
    )
  }

  const yearlyDiscountBadge = useMemo(() => {
    if (displayPeriod !== 'YEARLY') return null
    const discounts = displayPlans
      .map((plan) => {
        const option = billingOptionsForPeriod(plan, 'YEARLY')[0]
        return option ? discountFold(option) : null
      })
      .filter((value): value is number => value != null)
    if (discounts.length === 0) return null
    return Math.min(...discounts)
  }, [displayPeriod, displayPlans])

  const scrollByCard = (direction: -1 | 1) => {
    const node = scrollRef.current
    if (!node) return
    node.scrollBy({ left: direction * 322, behavior: 'smooth' })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className='bg-surface data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 top-0 left-0 flex h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-none sm:max-w-none'
        >
          <div className='relative shrink-0'>
            <div className='from-primary via-primary to-primary/85 relative bg-gradient-to-br pb-14 text-white sm:pb-16'>
              <button
                type='button'
                aria-label='关闭'
                onClick={() => onOpenChange(false)}
                className='bg-surface text-muted-foreground hover:bg-surface/90 absolute top-4 right-4 z-20 flex size-9 items-center justify-center rounded-lg shadow-sm transition-colors'
              >
                <X className='size-4' />
              </button>
              <div className='relative z-10 flex min-h-28 flex-col justify-center px-6 py-6 pr-14 sm:min-h-32 sm:px-8'>
                <DialogTitle className='text-xl font-bold tracking-tight sm:text-2xl'>
                  开通套餐，解锁完整创作能力
                </DialogTitle>
                <DialogDescription className='mt-2 text-sm text-white/80'>
                  选择适合你的计划，支持试用、月付、季付与年付
                </DialogDescription>
              </div>
            </div>

            {/* 底部圆弧 */}
            <div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 sm:h-16'>
              <div className='plans-header-flow absolute inset-x-0 bottom-2 h-8 w-[200%] opacity-40'>
                <svg
                  aria-hidden
                  className='h-full w-full'
                  viewBox='0 0 2880 32'
                  preserveAspectRatio='none'
                >
                  <path
                    fill='color-mix(in srgb, var(--primary) 40%, var(--surface))'
                    d='M0 16 C240 4 480 28 720 16 C960 4 1200 28 1440 16 C1680 4 1920 28 2160 16 C2400 4 2640 28 2880 16 L2880 32 L0 32 Z'
                  />
                </svg>
              </div>
              <div className='plans-header-flow-slow absolute inset-x-0 bottom-1 h-8 w-[200%] opacity-30'>
                <svg
                  aria-hidden
                  className='h-full w-full'
                  viewBox='0 0 2880 32'
                  preserveAspectRatio='none'
                >
                  <path
                    fill='color-mix(in srgb, var(--primary) 25%, var(--surface))'
                    d='M0 18 C200 28 440 8 720 18 C1000 28 1240 8 1440 18 C1720 28 1960 8 2160 18 C2440 28 2680 8 2880 18 L2880 32 L0 32 Z'
                  />
                </svg>
              </div>
              <svg
                aria-hidden
                className='text-surface absolute inset-x-0 bottom-0 h-full w-full'
                viewBox='0 0 1440 64'
                preserveAspectRatio='none'
              >
                <path
                  fill='currentColor'
                  d='M0 20 Q720 64 1440 20 L1440 64 L0 64 Z'
                />
              </svg>
            </div>
          </div>

          <div className='bg-surface relative z-20 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-4 pb-6 sm:px-8 sm:pt-5'>
            {!canBuySubscription ? (
              <div className='text-muted-foreground flex min-h-52 items-center justify-center text-sm'>
                企业套餐仅管理员可购买，请联系管理员处理
              </div>
            ) : (
              <>
                <div className='flex flex-wrap items-center gap-3'>
                  <AnimatedTabs
                    value={displayPeriod}
                    onValueChange={(next) => setPeriod(next as PeriodTab)}
                    items={tabs.map(([value, label]) => ({
                      value,
                      label,
                      badge:
                        value === 'YEARLY' && yearlyDiscountBadge != null
                          ? `${yearlyDiscountBadge}折`
                          : undefined,
                    }))}
                  />
                </div>

                {catalogQuery.isLoading ? (
                  <div className='text-muted-foreground flex min-h-72 items-center justify-center gap-2 text-sm'>
                    <Loader2 className='size-4 animate-spin' />
                    正在加载套餐
                  </div>
                ) : catalogQuery.isError ? (
                  <div className='text-destructive flex min-h-72 items-center justify-center text-sm'>
                    {getApiErrorMessage(catalogQuery.error, '套餐加载失败')}
                  </div>
                ) : displayPlans.length === 0 ? (
                  <div className='text-muted-foreground flex min-h-72 items-center justify-center text-sm'>
                    当前租户暂无{periodLabel(displayPeriod)}套餐
                  </div>
                ) : (
                  <div className='flex min-h-0 items-stretch gap-4 sm:gap-6'>
                    <div className='hidden w-28 shrink-0 flex-col justify-center gap-3 sm:flex'>
                      <div>
                        <p className='text-foreground text-base font-bold'>
                          权益对比
                        </p>
                        <p className='text-muted-foreground mt-1 text-xs'>
                          找到最佳计划
                        </p>
                      </div>
                      <div className='flex gap-2'>
                        <button
                          type='button'
                          aria-label='向左滚动'
                          onClick={() => scrollByCard(-1)}
                          className='border-border bg-background text-foreground hover:bg-muted flex size-8 items-center justify-center rounded-full border'
                        >
                          <ChevronLeft className='size-4' />
                        </button>
                        <button
                          type='button'
                          aria-label='向右滚动'
                          onClick={() => scrollByCard(1)}
                          className='border-border bg-background text-foreground hover:bg-muted flex size-8 items-center justify-center rounded-full border'
                        >
                          <ChevronRight className='size-4' />
                        </button>
                      </div>
                    </div>

                    <div
                      ref={scrollRef}
                      className='flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2'
                    >
                      {displayPlans.map((plan) => {
                        const option = billingOptionsForPeriod(
                          plan,
                          displayPeriod,
                          { includeStandaloneTrials: !hasTrialTab }
                        )[0]
                        if (!option) return null
                        const fold = discountFold(option)
                        const benefits = parseBenefits(
                          plan.current_version.benefits
                        )
                        const currentOption = isCurrentOption(plan, option)
                        const periodSuffix =
                          displayPeriod === 'TRIAL'
                            ? trialValidityLabel(
                                option.trial_validity_period
                              ) || '试用'
                            : shortPeriodLabel(
                                displayPeriod as Exclude<PeriodTab, 'TRIAL'>
                              )

                        return (
                          <article
                            key={plan.id}
                            className='border-border bg-card ring-foreground/5 flex h-[31.25rem] min-h-[31.25rem] w-[19.125rem] min-w-[19.125rem] shrink-0 flex-col overflow-hidden rounded-3xl border p-5 shadow-md ring-1'
                          >
                            <h3 className='text-lg font-bold'>{plan.name}</h3>

                            <div className='mt-4 space-y-1'>
                              <div className='flex min-h-5 items-center gap-2'>
                                {option.original_price_cents >
                                option.price_cents ? (
                                  <>
                                    <p className='text-primary text-xs line-through'>
                                      {formatPriceCents(
                                        option.original_price_cents,
                                        option.currency
                                      )}
                                    </p>
                                    {fold != null ? (
                                      <span className='bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold'>
                                        {fold}折
                                      </span>
                                    ) : null}
                                  </>
                                ) : null}
                              </div>
                              <div className='flex items-end gap-0.5'>
                                <span className='text-3xl font-bold tracking-tight'>
                                  {formatPrice(option)}
                                </span>
                                <span className='text-muted-foreground pb-1 text-sm'>
                                  /{periodSuffix}
                                </span>
                              </div>
                            </div>

                            <button
                              type='button'
                              disabled={currentOption || !canPurchase(option)}
                              onClick={() => {
                                if (currentOption) return
                                setSelected({ plan, option })
                                setCouponId(null)
                                setCouponPayableAmount(null)
                                setPaymentMethod(
                                  onlinePaymentMethods[0] ?? null
                                )
                              }}
                              className={cn(
                                'mt-5 w-full rounded-full py-2.5 text-sm font-semibold transition-opacity disabled:opacity-100',
                                currentOption
                                  ? 'bg-muted text-muted-foreground'
                                  : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
                              )}
                            >
                              {currentOption
                                ? '当前'
                                : ctaLabel(displayPeriod, option)}
                            </button>

                            <div className='bg-muted/60 ring-border/60 mt-4 min-h-0 flex-1 overflow-y-auto rounded-2xl px-3.5 py-3 ring-1'>
                              <p className='text-sm font-semibold'>
                                {displayPeriod === 'TRIAL'
                                  ? '试用期内'
                                  : '每期'}{' '}
                                {plan.current_version.points_amount.toLocaleString()}{' '}
                                积分
                                {option.bonus_points > 0
                                  ? ` +${option.bonus_points.toLocaleString()} 赠送`
                                  : ''}
                              </p>
                              <div className='border-border my-3 border-t' />
                              <ul className='space-y-2.5 text-sm'>
                                {(benefits.length > 0
                                  ? benefits.slice(0, 6)
                                  : ['按当前版本提供完整套餐权益']
                                ).map((benefit) => (
                                  <li
                                    key={benefit}
                                    className='text-muted-foreground flex items-start gap-2 leading-snug'
                                  >
                                    <span className='bg-muted-foreground/50 mt-1.5 size-1.5 shrink-0 rounded-full' />
                                    <span>{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(selected)}
        onOpenChange={(next) => {
          if (!next) {
            setSelected(null)
            setCouponId(null)
            setCouponPayableAmount(null)
          }
        }}
        title={`购买 ${selected?.plan.name ?? ''}`}
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
        confirmText='确认购买'
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
        onOpenChange={(next) => !next && setCheckout(null)}
        onPaid={() => {
          if (checkout) {
            completePurchase(checkout.purchase, checkout.item)
          } else {
            void refreshSessionTenant().catch(() => undefined)
            toast.success('支付成功，套餐权益正在生效')
            onOpenChange(false)
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
    </>
  )
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
    // ignore
  }
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function discountFold(option: PlanBillingOption) {
  if (
    !option.original_price_cents ||
    option.original_price_cents <= option.price_cents
  ) {
    return null
  }
  const fold = Math.round(
    (option.price_cents / option.original_price_cents) * 100
  )
  return fold > 0 && fold < 100 ? fold : null
}

function formatPrice(option: PlanBillingOption) {
  return formatPriceCents(option.price_cents, option.currency)
}

function formatPriceCents(priceCents: number, currency: string) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency || 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100)
}

function billingLabel(option: PlanBillingOption) {
  if (option.option_type === 'TRIAL') {
    return (
      option.description ||
      `试用 · ${trialValidityLabel(option.trial_validity_period)}`
    )
  }
  return (
    option.description ||
    `${{ MONTH: '月付', QUARTER: '季付', YEAR: '年付', '': '' }[option.billing_period]}方案`
  )
}

function ctaLabel(period: PeriodTab, option: PlanBillingOption) {
  if (period === 'TRIAL') return '立即试用'
  if (option.auto_renew) {
    if (period === 'YEARLY') return '连续包年订购'
    if (period === 'QUARTERLY') return '连续包季订购'
    return '连续包月订购'
  }
  if (period === 'YEARLY') return '立即订购年度套餐'
  if (period === 'QUARTERLY') return '立即订购季度套餐'
  return '立即订购月度套餐'
}

function isTrialOption(option: PlanBillingOption) {
  return option.option_type === 'TRIAL'
}

function billingOptionsForPeriod(
  plan: PlanCatalogItem,
  period: PeriodTab,
  flags?: { includeStandaloneTrials?: boolean }
) {
  const options = plan.current_version?.billing_options ?? []
  if (period === 'TRIAL') return options.filter(isTrialOption)
  const paid = options.filter((option) => {
    if (isTrialOption(option)) return false
    if (option.billing_period === 'MONTH') return period === 'MONTHLY'
    if (option.billing_period === 'QUARTER') return period === 'QUARTERLY'
    if (option.billing_period === 'YEAR') return period === 'YEARLY'
    return false
  })
  if (paid.length > 0) return paid
  if (
    flags?.includeStandaloneTrials &&
    period === 'MONTHLY' &&
    options.some(isTrialOption) &&
    !options.some((option) => !isTrialOption(option) && option.billing_period)
  ) {
    return options.filter(isTrialOption)
  }
  return paid
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
