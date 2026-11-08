import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }
type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

export type SystemSetting = {
  id: string
  setting_key: string
  setting_value: string
  description: string
  updated_by_user_id: string
  created_at: string
  updated_at: string
}

export type SystemSettingInput = {
  setting_key: string
  setting_value: string
  description?: string
}

export type SystemSettingListParams = {
  page?: number
  page_size?: number
  keyword?: string
}

export type VariantsCount = { count: number }
export type VideoResolutionList = { resolutions: string[] }

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function getVariantsCount() {
  const { data } = await request.get<ApiResponse<VariantsCount>>(
    '/v1/system-settings/variants-count'
  )
  return unwrap(data)
}

export async function getVideoResolutions() {
  const { data } = await request.get<ApiResponse<VideoResolutionList>>(
    '/v1/system-settings/video-resolutions'
  )
  return unwrap(data)
}

export async function listSystemSettings(params: SystemSettingListParams = {}) {
  const { data } = await request.get<
    ApiResponse<{ items: SystemSetting[]; total: number }>
  >('/v1/admin/system-settings', { params })
  return unwrap(data)
}

export async function getSystemSetting(id: string) {
  const { data } = await request.get<ApiResponse<SystemSetting>>(
    `/v1/admin/system-settings/${id}`
  )
  return unwrap(data)
}

export async function createSystemSetting(input: SystemSettingInput) {
  const { data } = await request.post<ApiResponse<SystemSetting>>(
    '/v1/admin/system-settings',
    input
  )
  return unwrap(data)
}

export async function updateSystemSetting(
  id: string,
  input: SystemSettingInput
) {
  const { data } = await request.put<ApiResponse<SystemSetting>>(
    `/v1/admin/system-settings/${id}`,
    input
  )
  return unwrap(data)
}

export async function deleteSystemSetting(id: string) {
  const { data } = await request.delete<ApiBaseResponse>(
    `/v1/admin/system-settings/${id}`
  )
  if (data.code !== 0) throw new Error(data.msg || '删除失败')
}
