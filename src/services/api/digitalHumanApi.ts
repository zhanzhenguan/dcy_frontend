import { request } from '@/services/request'
import { getApiErrorMessage } from '@/services/api/apiError'

type ApiResponse<T> = { code: number; msg: string; data: T }
type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

export type DigitalHuman = {
  id: string
  code: string
  name: string
  description: string
  avatar_url: string
  asset_id: string
  source: 'seedance' | 'other'
  gradient_bg: string
  avatar_initial: string
  gender: string
  region: string
  age_group: string
  styles: string[]
  languages: string[]
  required_plan_code: string
  required_plan_name: string
  accessible: boolean
  sample_voice_url: string
  rating: number
  use_count: number
  is_hot: boolean
  is_new: boolean
  is_pro: boolean
  status: string
  sort_order: number
  created_at: string
  updated_at: string
}

export type DigitalHumanInput = Pick<
  DigitalHuman,
  | 'code'
  | 'name'
  | 'description'
  | 'avatar_url'
  | 'asset_id'
  | 'source'
  | 'gradient_bg'
  | 'avatar_initial'
  | 'gender'
  | 'region'
  | 'age_group'
  | 'styles'
  | 'languages'
  | 'required_plan_code'
  | 'sample_voice_url'
  | 'rating'
  | 'is_hot'
  | 'is_new'
  | 'is_pro'
  | 'status'
  | 'sort_order'
>

export type DigitalHumanStatusInput = {
  status: 'listed' | 'unlisted'
}

export type DigitalHumanListParams = {
  page?: number
  page_size?: number
  gender?: string
  region?: string
  style?: string
  keyword?: string
  sort?: string
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

// 查询数字人目录（用户视角，含订阅门槛可访问性）
export async function listDigitalHumans(params: DigitalHumanListParams = {}) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: DigitalHuman[] }>
  >('/v1/digital-humans', { params })
  return unwrap(data)
}

// 管理员查询全部数字人
export async function listAdminDigitalHumans() {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: DigitalHuman[] }>
  >('/v1/admin/digital-humans', { params: { page: 1, page_size: 100 } })
  return unwrap(data)
}

export async function createDigitalHuman(input: DigitalHumanInput) {
  const { data } = await request.post<ApiResponse<DigitalHuman>>(
    '/v1/admin/digital-humans',
    input
  )
  return unwrap(data)
}

export async function updateDigitalHuman(id: string, input: DigitalHumanInput) {
  const { data } = await request.put<ApiResponse<DigitalHuman>>(
    `/v1/admin/digital-humans/${id}`,
    input
  )
  return unwrap(data)
}

export async function updateDigitalHumanStatus(
  id: string,
  input: DigitalHumanStatusInput
) {
  const { data } = await request.put<ApiResponse<DigitalHuman>>(
    `/v1/admin/digital-humans/${id}/status`,
    input
  )
  return unwrap(data)
}

export async function deleteDigitalHuman(id: string) {
  const { data } = await request.delete<ApiBaseResponse>(
    `/v1/admin/digital-humans/${id}`
  )
  if (data.code !== 0) throw new Error(data.msg || '删除失败')
}

// 上传数字人头像/封面素材到 OSS
export async function uploadDigitalHumanAsset(file: File) {
  const form = new FormData()
  form.append('file', file)
  try {
    const { data } = await request.post<ApiResponse<{ url: string }>>(
      '/v1/admin/digital-humans/assets',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return unwrap(data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '素材上传失败'))
  }
}
