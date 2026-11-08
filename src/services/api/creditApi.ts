import type { QueryClient } from '@tanstack/react-query'
import { request } from '@/services/request'
import { canViewCreditDetails } from '@/utils/tenantAccess'
import { useAuthStore } from '@/stores/authStore'

type ApiResponse<T> = { code: number; msg: string; data: T }

export type CreditAccount = {
  balance: number
  frozen_balance: number
  available_balance: number
  total_recharged: number
  total_granted: number
  total_consumed: number
  updated_at: string
}

export type CreditTransaction = {
  transaction_no: string
  type:
    | 'recharge'
    | 'grant'
    | 'consume'
    | 'refund'
    | 'adjust'
    | 'freeze'
    | 'unfreeze'
  amount: number
  balance_after: number
  frozen_after: number
  business_type: string
  business_id: string
  description: string
  /** 操作人昵称；优先流水快照 */
  operator_name?: string
  created_at: string
}

export type CreditLot = {
  source_type: string
  original_amount: number
  remaining_amount: number
  reserved_amount: number
  expire_at: string
  status: string
}

export type AdminCreditAdjustmentInput = {
  tenant_public_id: string
  amount: number
  source_type: 'COMPENSATION' | 'MANUAL_ADJUST'
  remark: string
  idempotency_key: string
}

/** 积分账户 queryKey：与 layout / 工作台 / 积分页共用，避免各处缓存不一致。 */
export function creditAccountQueryKey(tenantId?: string | null) {
  return ['credit-account', tenantId ?? ''] as const
}

export function creditLotsQueryKey(tenantId?: string | null) {
  return ['credit-lots', tenantId ?? ''] as const
}

/** 失效积分相关查询（不含账户本身；账户请用 setQueryData / syncCreditBalance）。 */
export function invalidateCreditQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['credit-lots'] })
  void queryClient.invalidateQueries({ queryKey: ['credit-transactions'] })
  void queryClient.invalidateQueries({ queryKey: ['workbench', 'credit-lots'] })
  void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
}

/** 失效含账户在内的全部积分查询（仅用于不确定余额是否变化时）。 */
export function invalidateAllCreditQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['credit-account'] })
  void queryClient.invalidateQueries({
    queryKey: ['workbench', 'credit-account'],
  })
  invalidateCreditQueries(queryClient)
}

/** 企业非 owner 不得请求积分明细相关接口 */
function assertCanViewCreditDetails() {
  const tenant = useAuthStore.getState().auth.session?.tenant
  if (!canViewCreditDetails(tenant)) {
    throw new Error('当前角色无权查看积分账户')
  }
}

export async function getCreditAccount() {
  assertCanViewCreditDetails()
  const { data } =
    await request.get<ApiResponse<CreditAccount>>('/v1/credit/account')
  return unwrap(data)
}

/**
 * 按当前租户拉取积分并写入 session。
 * - 无权限时不发请求
 * - expectedTenantId：仅当当前租户仍匹配时才写入，避免切换竞态清零
 */
export async function refreshSessionCreditBalance(expectedTenantId?: string) {
  const tenant = useAuthStore.getState().auth.session?.tenant
  if (!canViewCreditDetails(tenant)) {
    return null
  }
  const account = await getCreditAccount()
  const { auth } = useAuthStore.getState()
  if (
    !expectedTenantId ||
    auth.session?.tenant.public_id === expectedTenantId
  ) {
    // 展示「剩余/可用」积分：冻结中的额度不计入可用余额
    auth.setCreditBalance(account.available_balance)
  }
  return account
}

/**
 * 拉取最新积分、写入 session，并更新账户缓存。
 * 创建视频、充值、兑换等变更后应调用；不再额外 invalidate 账户，避免连打 /credit/account。
 */
export async function syncCreditBalance(
  queryClient?: QueryClient,
  expectedTenantId?: string
) {
  const account = await refreshSessionCreditBalance(expectedTenantId)
  if (queryClient) {
    const tenantId =
      expectedTenantId ??
      useAuthStore.getState().auth.session?.tenant.public_id
    if (account && tenantId) {
      queryClient.setQueryData(creditAccountQueryKey(tenantId), account)
    }
    invalidateCreditQueries(queryClient)
  }
  return account
}

export async function listCreditTransactions(params: {
  page: number
  page_size: number
  type?: string
  operator?: string
  created_from?: number
  created_to?: number
}) {
  assertCanViewCreditDetails()
  const { data } = await request.get<
    ApiResponse<{ total: number; items: CreditTransaction[] }>
  >('/v1/credit/transactions', {
    params: {
      page: params.page,
      page_size: params.page_size,
      ...(params.type && params.type !== 'all' ? { type: params.type } : {}),
      ...(params.operator?.trim() ? { operator: params.operator.trim() } : {}),
      ...(params.created_from ? { created_from: params.created_from } : {}),
      ...(params.created_to ? { created_to: params.created_to } : {}),
    },
  })
  return unwrap(data)
}

export async function listCreditLots() {
  assertCanViewCreditDetails()
  const { data } = await request.get<ApiResponse<{ items: CreditLot[] }>>(
    '/v1/credit/lots'
  )
  return unwrap(data)
}

export async function adjustTenantCredits(input: AdminCreditAdjustmentInput) {
  const { data } = await request.post<ApiResponse<CreditAccount>>(
    '/v1/admin/credits/adjustments',
    input
  )
  return unwrap(data)
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}
