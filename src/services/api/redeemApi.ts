import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }

export type RedeemRewardData = {
  points?: number
  coupon_template_id?: string
}

export type RedeemBatch = {
  id: string
  channel: string
  quantity: number
  reward_type: 'POINTS' | 'COUPON'
  reward_data: RedeemRewardData
  used_quantity: number
  valid_start_at: string
  valid_end_at: string
  remark: string
  created_at: string
}

export type CreateRedeemBatchInput = {
  channel: string
  quantity: number
  reward_type: RedeemBatch['reward_type']
  reward_data: RedeemRewardData
  valid_start_at: string
  valid_end_at: string
  remark?: string
}

export type RedeemResult = {
  reward_type: 'POINTS' | 'COUPON'
  points: number
  coupon_id: string
}

export type RedeemCodeDetail = {
  id: string
  code: string
  status: 'UNUSED' | 'USED'
  redeemed_tenant_id: string
  redeemed_tenant_name: string
  redeemed_user_id: string
  redeemed_user_name: string
  redeemed_user_nickname: string
  redeemed_at: string
  reward_id: string
  created_at: string
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

/** 用户兑换：输入兑换码立即获得积分或优惠券 */
export async function redeemCode(code: string) {
  const { data } = await request.post<ApiResponse<RedeemResult>>('/v1/redeem', {
    code,
  })
  return unwrap(data)
}

export async function createRedeemBatch(input: CreateRedeemBatchInput) {
  const { data } = await request.post<
    ApiResponse<{ batch: RedeemBatch; codes: string[] }>
  >('/v1/admin/redeem/batches', input)
  return unwrap(data)
}

export async function listRedeemBatches(params: {
  page: number
  page_size: number
}) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: RedeemBatch[] }>
  >('/v1/admin/redeem/batches', { params })
  return unwrap(data)
}

export async function exportRedeemBatch(id: string) {
  const { data } = await request.get<
    ApiResponse<{ batch: RedeemBatch; codes: string[] }>
  >(`/v1/admin/redeem/batches/${id}/export`)
  return unwrap(data)
}

export async function listRedeemBatchCodes(params: {
  id: string
  status: 'UNUSED' | 'USED'
  page: number
  page_size: number
}) {
  const { id, ...query } = params
  const { data } = await request.get<
    ApiResponse<{ total: number; items: RedeemCodeDetail[] }>
  >(`/v1/admin/redeem/batches/${id}/codes`, { params: query })
  return unwrap(data)
}
