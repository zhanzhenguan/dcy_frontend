import { useAuthStore } from '@/stores/authStore'
import { canManageAccountBilling } from '@/utils/tenantAccess'
import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }
type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

export type CreditRechargePlan = {
  id: string
  code: string
  name: string
  description: string
  price_cents: number
  original_price_cents: number
  currency: string
  credits: number
  bonus_credits: number
  badge_text: string
  is_featured: boolean
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type CreditRechargePlanInput = Pick<
  CreditRechargePlan,
  | 'code'
  | 'name'
  | 'description'
  | 'price_cents'
  | 'original_price_cents'
  | 'currency'
  | 'credits'
  | 'bonus_credits'
  | 'badge_text'
  | 'is_featured'
  | 'enabled'
  | 'sort_order'
>

export type CreditRechargePurchase = {
  order_no: string
  plan: CreditRechargePlan
  credits_granted: number
  credit_balance: number
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED'
  payable_amount: number
  payment_required: boolean
  payment_available: boolean
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

function assertCanManageBilling() {
  const tenant = useAuthStore.getState().auth.session?.tenant
  if (!canManageAccountBilling(tenant)) {
    throw new Error('当前角色无权充值积分')
  }
}

export async function listCreditRechargePlans() {
  assertCanManageBilling()
  const { data } = await request.get<
    ApiResponse<{
      items: CreditRechargePlan[]
      development_mode: boolean
      payment_available: boolean
      payment_methods: ('wechat' | 'alipay' | 'bank_transfer')[]
      bank_transfer_content: string
    }>
  >('/v1/credits/recharge-plans')
  return unwrap(data)
}

export async function purchaseCreditRecharge(
  planId: string,
  couponId?: string | null
) {
  assertCanManageBilling()
  const { data } = await request.post<ApiResponse<CreditRechargePurchase>>(
    '/v1/credits/recharge-purchases',
    {
      plan_id: planId,
      idempotency_key: crypto.randomUUID(),
      coupon_id: couponId || undefined,
    }
  )
  return unwrap(data)
}

export async function listAdminCreditRechargePlans() {
  const { data } = await request.get<
    ApiResponse<{ items: CreditRechargePlan[] }>
  >('/v1/admin/credits/recharge-plans')
  return unwrap(data)
}

export async function createCreditRechargePlan(input: CreditRechargePlanInput) {
  const { data } = await request.post<ApiResponse<CreditRechargePlan>>(
    '/v1/admin/credits/recharge-plans',
    input
  )
  return unwrap(data)
}

export async function updateCreditRechargePlan(
  id: string,
  input: CreditRechargePlanInput
) {
  const { data } = await request.put<ApiResponse<CreditRechargePlan>>(
    `/v1/admin/credits/recharge-plans/${id}`,
    input
  )
  return unwrap(data)
}

export async function deleteCreditRechargePlan(id: string) {
  const { data } = await request.delete<ApiBaseResponse>(
    `/v1/admin/credits/recharge-plans/${id}`
  )
  if (data.code !== 0) throw new Error(data.msg || '删除失败')
}
