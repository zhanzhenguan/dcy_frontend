import type { CurrentSubscription, PlanCatalogItem } from '@/services/api/subscriptionApi'
import type { Tenant } from '@/services/api/tenantApi'

export type TenantBillingPeriod = Tenant['billing_period']

export type TenantPlanDisplay = {
  /** 是否已开通有效付费/试用套餐（非 FREE） */
  active: boolean
  /** 套餐名：专业版 / 未开通 … */
  label: string
  /** 含周期的展示名：专业版 · 月付 */
  displayLabel: string
  /** 计费周期文案：月付 / 季付 / 年付 / 试用；无则空 */
  periodLabel: string
  planLevelCode: string
  billingPeriod: TenantBillingPeriod
  /** 侧栏按钮文案：已开通 → 升级套餐；否则 → 未开通 */
  ctaLabel: string
  /** 当前周期结束时间（来自订阅详情） */
  periodEnd?: string
}

type TenantPlanFields = Pick<
  Tenant,
  'plan_level_code' | 'plan_level_name' | 'plan_id' | 'billing_period'
>

/**
 * 侧栏升级入口、账户/个人中心徽章、工作台「当前套餐」：以 session 租户为准
 * （个人租户从 /v1/tenants 同步，企业租户从 /v1/tenants/current 同步）。
 * 个人/企业订阅区块另拉 `/v1/subscriptions/current`，购买/换购后写回 session。
 * 可选传入 subscription / catalog：仅在租户摘要缺字段时补齐名称/周期/有效期。
 */
export const resolveTenantPlanDisplay = (
  tenant: TenantPlanFields | null | undefined,
  subscription?: CurrentSubscription | null,
  catalogPlans?: PlanCatalogItem[]
): TenantPlanDisplay => {
  const fromTenant = resolveFromTenant(tenant)
  const fromSubscription = resolveFromSubscription(subscription, catalogPlans)

  if (!fromSubscription) return fromTenant

  // 租户已有有效套餐：保留租户标签，仅补齐缺省字段与有效期
  if (fromTenant.active) {
    return {
      ...fromTenant,
      label:
        fromTenant.label !== '未开通' && fromTenant.label !== '已开通'
          ? fromTenant.label
          : fromSubscription.label !== '已开通'
            ? fromSubscription.label
            : fromTenant.label,
      periodLabel: fromTenant.periodLabel || fromSubscription.periodLabel,
      displayLabel: (() => {
        const label =
          fromTenant.label !== '未开通' && fromTenant.label !== '已开通'
            ? fromTenant.label
            : fromSubscription.label !== '已开通'
              ? fromSubscription.label
              : fromTenant.label
        const periodLabel =
          fromTenant.periodLabel || fromSubscription.periodLabel
        return periodLabel ? `${label} · ${periodLabel}` : label
      })(),
      planLevelCode: fromTenant.planLevelCode || fromSubscription.planLevelCode,
      billingPeriod: fromTenant.billingPeriod || fromSubscription.billingPeriod,
      periodEnd: fromSubscription.periodEnd || fromTenant.periodEnd,
    }
  }

  // 租户摘要未开通但订阅详情有效：用订阅补齐（购买后 session 尚未刷新的窗口）
  if (fromSubscription.active) {
    return {
      ...fromSubscription,
      label:
        fromSubscription.label !== '已开通'
          ? fromSubscription.label
          : fromTenant.label !== '未开通'
            ? fromTenant.label
            : fromSubscription.label,
      displayLabel: (() => {
        const label =
          fromSubscription.label !== '已开通'
            ? fromSubscription.label
            : fromTenant.label !== '未开通'
              ? fromTenant.label
              : fromSubscription.label
        const periodLabel =
          fromSubscription.periodLabel || fromTenant.periodLabel
        return periodLabel ? `${label} · ${periodLabel}` : label
      })(),
      periodLabel: fromSubscription.periodLabel || fromTenant.periodLabel,
      planLevelCode:
        fromSubscription.planLevelCode || fromTenant.planLevelCode,
      billingPeriod:
        fromSubscription.billingPeriod || fromTenant.billingPeriod,
    }
  }

  return fromTenant
}

const resolveFromSubscription = (
  subscription: CurrentSubscription | null | undefined,
  catalogPlans?: PlanCatalogItem[]
): TenantPlanDisplay | null => {
  if (!subscription) return null
  if (isSubscriptionExpired(subscription)) {
    return {
      active: false,
      label: '未开通',
      displayLabel: '未开通',
      periodLabel: '',
      planLevelCode: '',
      billingPeriod: '',
      ctaLabel: '未开通',
      periodEnd: subscription.current_period_end,
    }
  }

  const hasSubscriptionRecord = Boolean(
    subscription.active ||
      subscription.status === 'ACTIVE' ||
      subscription.status === 'PAST_DUE' ||
      subscription.status === 'CANCELLED' ||
      subscription.id ||
      subscription.plan_billing_option_id ||
      subscription.plan_version_id
  )
  if (!hasSubscriptionRecord) return null

  const catalogMatch = resolveCatalogMatch(subscription, catalogPlans)
  const billingPeriod = (subscription.billing_period ||
    catalogMatch?.billingPeriod ||
    '') as TenantBillingPeriod
  const planLevelCode = (
    subscription.plan_level_code ||
    catalogMatch?.planLevelCode ||
    ''
  )
    .trim()
    .toUpperCase()
  const label = (
    subscription.plan_level_name ||
    subscription.plan_name ||
    catalogMatch?.label ||
    ''
  ).trim()
  const resolvedLabel = label || planLevelCode || '已开通'
  const periodLabel = formatBillingPeriodLabel(billingPeriod)
  const displayLabel = periodLabel
    ? `${resolvedLabel} · ${periodLabel}`
    : resolvedLabel

  return {
    active: true,
    label: resolvedLabel,
    displayLabel,
    periodLabel,
    planLevelCode,
    billingPeriod,
    ctaLabel: '升级套餐',
    periodEnd: subscription.current_period_end,
  }
}

const resolveFromTenant = (
  tenant: TenantPlanFields | null | undefined
): TenantPlanDisplay => {
  const planLevelCode = (tenant?.plan_level_code ?? '').trim().toUpperCase()
  const name = (tenant?.plan_level_name ?? '').trim()
  const planId = (tenant?.plan_id ?? '').trim()
  const billingPeriod = (tenant?.billing_period ?? '') as TenantBillingPeriod
  const hasPaidLevel = Boolean(planLevelCode && planLevelCode !== 'FREE')
  const hasNamedPlan = Boolean(name && name !== '未开通')
  const active = hasPaidLevel || (Boolean(planId) && hasNamedPlan)
  const label = hasNamedPlan
    ? name
    : active
      ? planLevelCode || '已开通'
      : '未开通'
  const periodLabel = active ? formatBillingPeriodLabel(billingPeriod) : ''
  const displayLabel =
    active && periodLabel ? `${label} · ${periodLabel}` : label

  return {
    active,
    label,
    displayLabel,
    periodLabel,
    planLevelCode,
    billingPeriod,
    ctaLabel: active ? '升级套餐' : '未开通',
  }
}

const resolveCatalogMatch = (
  subscription: CurrentSubscription,
  catalogPlans?: PlanCatalogItem[]
) => {
  if (!catalogPlans?.length) return null
  for (const plan of catalogPlans) {
    const option = plan.current_version.billing_options.find(
      (item) => item.id === subscription.plan_billing_option_id
    )
    if (option) {
      return {
        label: plan.name,
        planLevelCode: plan.plan_level_code,
        billingPeriod: option.billing_period,
      }
    }
    if (
      subscription.plan_version_id &&
      plan.current_version.id === subscription.plan_version_id
    ) {
      return {
        label: plan.name,
        planLevelCode: plan.plan_level_code,
        billingPeriod: plan.current_version.billing_options.find(
          (item) => item.option_type !== 'TRIAL'
        )?.billing_period,
      }
    }
  }
  return null
}

const isSubscriptionExpired = (subscription: CurrentSubscription) => {
  if (subscription.status === 'EXPIRED') return true
  if (
    subscription.current_period_end &&
    !Number.isNaN(new Date(subscription.current_period_end).getTime()) &&
    new Date(subscription.current_period_end).getTime() <= Date.now()
  ) {
    return true
  }
  if (subscription.id && subscription.active === false) return true
  return false
}

/** 月付 / 季付 / 年付；billing_period 为空（试用档）不追加「试用」，避免与套餐名叠成「旗舰版 · 试用」 */
export const formatBillingPeriodLabel = (
  period: TenantBillingPeriod | string | null | undefined,
  options?: { trialWhenEmpty?: boolean }
) => {
  const key = (period ?? '').trim().toUpperCase()
  if (key === 'MONTH') return '月付'
  if (key === 'QUARTER') return '季付'
  if (key === 'YEAR') return '年付'
  // 仅订阅选档等显式场景需要「试用」文案时开启
  if (options?.trialWhenEmpty && !key) return '试用'
  return ''
}

/** 套餐有效期展示；无有效日期时不编造占位日 */
export const formatSubscriptionExpireLabel = (expiresAt?: string | null) => {
  if (!expiresAt?.trim()) return '—'
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toISOString().slice(0, 10)
}
