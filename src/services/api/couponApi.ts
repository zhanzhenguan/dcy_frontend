import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }

export type CouponTemplate = {
  id: string
  name: string
  coupon_type: 'FULL_REDUCTION' | 'DISCOUNT'
  threshold_amount: number
  discount_amount: number
  discount_rate: number
  cap_amount: number
  scope: 'ALL' | 'PACKAGE' | 'RECHARGE' | 'SPECIFIED'
  valid_type: 'FIXED' | 'AFTER_ISSUE'
  valid_start_at: string
  valid_end_at: string
  valid_duration_days: number
  status: 'ACTIVE' | 'DISABLED'
  items: CouponTemplateItem[]
}

export type CouponTemplateItem = {
  item_type: 'PLAN_VERSION' | 'RECHARGE_OPTION'
  item_id: string
}

export type SaveCouponTemplateInput = {
  name: string
  coupon_type: CouponTemplate['coupon_type']
  threshold_amount: number
  discount_amount?: number
  discount_rate?: number
  cap_amount?: number
  scope: CouponTemplate['scope']
  valid_type: CouponTemplate['valid_type']
  valid_start_at?: string
  valid_end_at?: string
  valid_duration_days?: number
  status: CouponTemplate['status']
  items: CouponTemplateItem[]
}

export type CouponInstance = {
  id: string
  template_id: string
  template_name: string
  coupon_type: 'FULL_REDUCTION' | 'DISCOUNT'
  threshold_amount: number
  discount_amount: number
  discount_rate: number
  cap_amount: number
  scope: string
  status: 'UNUSED' | 'USED' | 'EXPIRED' | 'LOCKED'
  valid_start_at: string
  valid_end_at: string
  created_at: string
}

export type MyCoupons = Record<
  'unused' | 'used' | 'expired' | 'locked',
  CouponInstance[]
>

export type CouponRecord = {
  coupon_id: string
  template_id: string
  template_name: string
  tenant_public_id: string
  tenant_name: string
  user_id: string
  user_name: string
  issued_source: string
  issued_at: string
  status: string
  used_order_no: string
  used_at: string
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function listCouponTemplates(params: {
  page: number
  page_size: number
}) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: CouponTemplate[] }>
  >('/v1/admin/coupons/templates', { params })
  return unwrap(data)
}

export async function listMyCoupons() {
  const { data } = await request.get<ApiResponse<MyCoupons>>('/v1/coupons')
  return unwrap(data)
}

export async function listCouponRecords(params: {
  page: number
  page_size: number
  record_type: 'ISSUED' | 'USED'
  template_id?: string
  tenant_public_id?: string
}) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: CouponRecord[] }>
  >('/v1/admin/coupons/records', { params })
  return unwrap(data)
}

export async function createCouponTemplate(input: SaveCouponTemplateInput) {
  const { data } = await request.post<ApiResponse<CouponTemplate>>(
    '/v1/admin/coupons/templates',
    input
  )
  return unwrap(data)
}

export async function getCouponTemplate(id: string) {
  const { data } = await request.get<ApiResponse<CouponTemplate>>(
    `/v1/admin/coupons/templates/${id}`
  )
  return unwrap(data)
}

export async function updateCouponTemplate(
  id: string,
  input: SaveCouponTemplateInput
) {
  const { data } = await request.put<ApiResponse<CouponTemplate>>(
    `/v1/admin/coupons/templates/${id}`,
    input
  )
  return unwrap(data)
}

export async function deleteCouponTemplate(id: string) {
  const { data } = await request.delete<ApiResponse<null>>(
    `/v1/admin/coupons/templates/${id}`
  )
  return unwrap(data)
}

export async function manualIssueCoupon(input: {
  template_id: string
  tenant_id: string
  user_id: string
}) {
  const { data } = await request.post<ApiResponse<CouponInstance>>(
    '/v1/admin/coupons/issues',
    input
  )
  return unwrap(data)
}
