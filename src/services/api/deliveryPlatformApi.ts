import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }
type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

/** 投放平台可选的推荐视频比例，需与后端 deliveryplatform.AllowedRatios 保持一致。 */
export const DELIVERY_PLATFORM_RATIOS = [
  '9:16',
  '16:9',
  '1:1',
  '3:4',
  '4:3',
] as const

export type DeliveryPlatform = {
  id: string
  name: string
  short_name: string
  icon_url: string
  region: 'domestic' | 'overseas'
  recommended_ratios: string[]
  status: 'listed' | 'unlisted'
  sort_order: number
  created_at: string
  updated_at: string
}

export type DeliveryPlatformInput = Pick<
  DeliveryPlatform,
  | 'name'
  | 'short_name'
  | 'icon_url'
  | 'region'
  | 'recommended_ratios'
  | 'status'
  | 'sort_order'
>

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function listDeliveryPlatforms() {
  const { data } = await request.get<
    ApiResponse<{ items: DeliveryPlatform[]; total: number }>
  >('/v1/delivery-platforms')
  return unwrap(data)
}

export async function listAdminDeliveryPlatforms() {
  const { data } = await request.get<
    ApiResponse<{ items: DeliveryPlatform[]; total: number }>
  >('/v1/admin/delivery-platforms', { params: { page: 1, page_size: 100 } })
  return unwrap(data)
}

export async function createDeliveryPlatform(input: DeliveryPlatformInput) {
  const { data } = await request.post<ApiResponse<DeliveryPlatform>>(
    '/v1/admin/delivery-platforms',
    input
  )
  return unwrap(data)
}

export async function updateDeliveryPlatform(
  id: string,
  input: DeliveryPlatformInput
) {
  const { data } = await request.put<ApiResponse<DeliveryPlatform>>(
    `/v1/admin/delivery-platforms/${id}`,
    input
  )
  return unwrap(data)
}

export async function deleteDeliveryPlatform(id: string) {
  const { data } = await request.delete<ApiBaseResponse>(
    `/v1/admin/delivery-platforms/${id}`
  )
  if (data.code !== 0) throw new Error(data.msg || '删除失败')
}

export async function uploadDeliveryPlatformAsset(file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await request.post<ApiResponse<{ url: string }>>(
    '/v1/admin/delivery-platforms/assets',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return unwrap(data)
}
