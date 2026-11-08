import { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { canPurchaseSubscription } from '@/utils/tenantAccess'
import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }
type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

export type PlanLevel = {
  id: string
  code: string
  name: string
  level_value: number
  description: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export type PlanBillingOption = {
  id: string
  option_type: 'NORMAL' | 'TRIAL'
  billing_period: 'MONTH' | 'QUARTER' | 'YEAR' | ''
  trial_validity_period: 'MONTH' | 'QUARTER' | 'YEAR' | 'FOREVER' | ''
  auto_renew: boolean
  price_cents: number
  original_price_cents: number
  bonus_points: number
  currency: string
  enabled: boolean
  description: string
  sort_order: number
}

export type PlanVersion = {
  id: string
  version_no: string
  plan_level_code: string
  points_amount: number
  benefits: string
  resource_config: PlanResourcePolicy
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED'
  published_at: string
  billing_options: PlanBillingOption[]
}

export type ResourceRestriction = {
  key: 'video_model' | 'video_resolution' | 'delivery_platform'
  mode: 'all' | 'allowlist'
  values: string[]
}

export type PlanResourcePolicy = {
  schema_version: number
  resources: ResourceRestriction[]
  limits: { key: string; value: number }[]
  features: { key: string; enabled: boolean }[]
}

export type PlanCatalogItem = {
  id: string
  code: string
  name: string
  tenant_type: 'PERSONAL' | 'ENTERPRISE'
  plan_level_code: string
  enabled: boolean
  description: string
  sort_order: number
  current_version: PlanVersion
}

export type PlanCatalog = {
  items: PlanCatalogItem[]
  development_mode: boolean
  payment_available: boolean
  payment_methods: ('wechat' | 'alipay' | 'bank_transfer')[]
  bank_transfer_content: string
}

export type CurrentSubscription = {
  id: string
  plan_version_id: string
  plan_billing_option_id: string
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE' | ''
  auto_renew: boolean
  current_period_start: string
  current_period_end: string
  next_billing_at: string
  cancelled_at: string
  active: boolean
  /** 以下为订阅详情可选回写字段，用于展示当前套餐 */
  plan_code?: string
  plan_name?: string
  plan_level_code?: string
  plan_level_name?: string
  billing_period?: 'MONTH' | 'QUARTER' | 'YEAR' | ''
}

export type PlanPurchase = {
  order_no: string
  plan_code: string
  plan_name: string
  points_granted: number
  credit_balance: number
  plan_level_code: string
  subscription_expires_at: string
  auto_renew: boolean
  next_billing_at: string
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED'
  payable_amount: number
  payment_required: boolean
  payment_available: boolean
}

export type PlanLevelInput = Pick<
  PlanLevel,
  'code' | 'name' | 'level_value' | 'description' | 'enabled'
>

export type PlanInput = {
  code: string
  name: string
  tenant_type: 'PERSONAL' | 'ENTERPRISE'
  plan_level_code: string
  enabled: boolean
  sort_order: number
  description: string
}

export type PlanVersionInput = {
  plan_id: string
  version_no: string
  points_amount: number
  benefits: string
  resource_config: PlanResourcePolicy
}

export type BillingOptionInput = {
  plan_version_id: string
  option_type: 'NORMAL' | 'TRIAL'
  billing_period: 'MONTH' | 'QUARTER' | 'YEAR' | ''
  trial_validity_period: 'MONTH' | 'QUARTER' | 'YEAR' | 'FOREVER' | ''
  auto_renew: boolean
  price_cents: number
  original_price_cents: number
  bonus_points: number
  currency: string
  enabled: boolean
  sort_order: number
  description: string
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

async function remove(url: string) {
  const { data } = await request.delete<ApiBaseResponse>(url)
  if (data.code !== 0) throw new Error(data.msg || '删除失败')
}

/** 企业非 owner 不得请求套餐购买相关接口 */
function assertCanPurchaseSubscription() {
  const tenant = useAuthStore.getState().auth.session?.tenant
  if (!canPurchaseSubscription(tenant)) {
    throw new Error('当前角色无权购买或查看套餐')
  }
}

export async function listSubscriptionPlans() {
  assertCanPurchaseSubscription()
  try {
    const { data } = await request.get<ApiResponse<PlanCatalog>>(
      '/v1/subscriptions/plans'
    )
    return unwrap(data)
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status ?? 0
      if (status === 401 || status === 403) throw error
      // 转成普通 Error，避免全局 QueryCache 因 Axios 5xx 跳 /500
      const msg =
        typeof error.response?.data === 'object' &&
        error.response.data &&
        'msg' in error.response.data &&
        typeof (error.response.data as { msg?: unknown }).msg === 'string'
          ? (error.response.data as { msg: string }).msg
          : status >= 500
            ? '套餐服务暂时不可用，请稍后重试'
            : '套餐加载失败'
      throw new Error(msg)
    }
    throw error
  }
}

export async function purchaseSubscription(
  billingOptionId: string,
  couponId?: string | null
) {
  assertCanPurchaseSubscription()
  const { data } = await request.post<ApiResponse<PlanPurchase>>(
    '/v1/subscriptions/purchases',
    {
      billing_option_id: billingOptionId,
      idempotency_key: crypto.randomUUID(),
      coupon_id: couponId || undefined,
    }
  )
  return unwrap(data)
}

export async function grantSubscription(
  tenantPublicId: string,
  billingOptionId: string
) {
  const { data } = await request.post<ApiResponse<PlanPurchase>>(
    '/v1/admin/subscriptions/grants',
    {
      tenant_public_id: tenantPublicId,
      billing_option_id: billingOptionId,
      idempotency_key: crypto.randomUUID(),
    }
  )
  return unwrap(data)
}

/**
 * 当前订阅详情。后端 5xx / 业务失败时返回 null（不抛错），
 * 避免全局 QueryCache 因该接口 toast / 跳 /500，展示侧回退到 tenants/current。
 */
export async function getCurrentSubscription(): Promise<CurrentSubscription | null> {
  assertCanPurchaseSubscription()
  try {
    const { data } = await request.get<ApiResponse<CurrentSubscription>>(
      '/v1/subscriptions/current'
    )
    return unwrap(data)
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status ?? 0
      // 交给全局 QueryCache 处理登录失效
      if (status === 401 || status === 403) throw error
      // 5xx / 4xx（如暂无订阅）均按无详情处理，展示回退租户摘要
      return null
    }
    // unwrap 业务码失败等
    return null
  }
}

export async function cancelAutoRenewal() {
  assertCanPurchaseSubscription()
  const { data } = await request.post<ApiResponse<CurrentSubscription>>(
    '/v1/subscriptions/auto-renewal/cancel'
  )
  return unwrap(data)
}

export async function listPlanLevels() {
  const { data } = await request.get<ApiResponse<PlanLevel[]>>(
    '/v1/admin/subscriptions/levels'
  )
  return unwrap(data)
}

export async function createPlanLevel(input: PlanLevelInput) {
  const { data } = await request.post<ApiResponse<PlanLevel>>(
    '/v1/admin/subscriptions/levels',
    input
  )
  return unwrap(data)
}

export async function updatePlanLevel(id: string, input: PlanLevelInput) {
  const { data } = await request.put<ApiResponse<PlanLevel>>(
    `/v1/admin/subscriptions/levels/${id}`,
    input
  )
  return unwrap(data)
}

export async function deletePlanLevel(id: string) {
  return remove(`/v1/admin/subscriptions/levels/${id}`)
}

export async function listAdminSubscriptionPlans() {
  const { data } = await request.get<ApiResponse<PlanCatalogItem[]>>(
    '/v1/admin/subscriptions/plans'
  )
  return unwrap(data)
}

export async function listGrantableAdminSubscriptionPlans(
  tenantType: PlanCatalogItem['tenant_type']
) {
  const { data } = await request.get<ApiResponse<PlanCatalogItem[]>>(
    '/v1/admin/subscriptions/plans',
    {
      params: {
        tenant_type: tenantType,
        enabled: true,
      },
    }
  )
  return unwrap(data)
}

export async function createSubscriptionPlan(input: PlanInput) {
  const { data } = await request.post<ApiResponse<PlanCatalogItem>>(
    '/v1/admin/subscriptions/plans',
    input
  )
  return unwrap(data)
}

export async function updateSubscriptionPlan(id: string, input: PlanInput) {
  const { data } = await request.put<ApiResponse<PlanCatalogItem>>(
    `/v1/admin/subscriptions/plans/${id}`,
    input
  )
  return unwrap(data)
}

export async function deleteSubscriptionPlan(id: string) {
  return remove(`/v1/admin/subscriptions/plans/${id}`)
}

export async function setPlanCurrentVersion(planId: string, versionId: string) {
  const { data } = await request.put<ApiResponse<PlanCatalogItem>>(
    `/v1/admin/subscriptions/plans/${planId}/current-version`,
    undefined,
    { params: { version_id: versionId } }
  )
  return unwrap(data)
}

export async function listPlanVersions(planId: string) {
  const { data } = await request.get<ApiResponse<PlanVersion[]>>(
    '/v1/admin/subscriptions/plan-versions',
    { params: { plan_id: planId } }
  )
  return unwrap(data)
}

export async function createPlanVersion(input: PlanVersionInput) {
  const { data } = await request.post<ApiResponse<PlanVersion>>(
    '/v1/admin/subscriptions/plan-versions',
    input
  )
  return unwrap(data)
}

export async function updatePlanVersion(id: string, input: PlanVersionInput) {
  const { data } = await request.put<ApiResponse<PlanVersion>>(
    `/v1/admin/subscriptions/plan-versions/${id}`,
    input
  )
  return unwrap(data)
}

export async function deletePlanVersion(id: string) {
  return remove(`/v1/admin/subscriptions/plan-versions/${id}`)
}

export async function listBillingOptions(planVersionId: string) {
  const { data } = await request.get<ApiResponse<PlanBillingOption[]>>(
    '/v1/admin/subscriptions/billing-options',
    { params: { plan_version_id: planVersionId } }
  )
  return unwrap(data)
}

export async function createBillingOption(input: BillingOptionInput) {
  const { data } = await request.post<ApiResponse<PlanBillingOption>>(
    '/v1/admin/subscriptions/billing-options',
    input
  )
  return unwrap(data)
}

export async function updateBillingOption(
  id: string,
  input: BillingOptionInput
) {
  const { data } = await request.put<ApiResponse<PlanBillingOption>>(
    `/v1/admin/subscriptions/billing-options/${id}`,
    input
  )
  return unwrap(data)
}

export async function deleteBillingOption(id: string) {
  return remove(`/v1/admin/subscriptions/billing-options/${id}`)
}

export async function getSubscriptionSettings() {
  const { data } = await request.get<
    ApiResponse<{ development_mode: boolean }>
  >('/v1/admin/subscriptions/settings')
  return unwrap(data)
}

export async function updateSubscriptionSettings(developmentMode: boolean) {
  const { data } = await request.put<
    ApiResponse<{ development_mode: boolean }>
  >('/v1/admin/subscriptions/settings', {
    development_mode: developmentMode,
  })
  return unwrap(data)
}
