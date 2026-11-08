import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }

/** 平台全部视频生成记录（超管视角）。 */
export type AdminVideoGeneration = {
  id: string
  title: string
  creator_nickname: string
  tenant_name: string
  provider_name: string
  model_name: string
  status: string
  resolution: string
  ratio: string
  duration: number
  enhancement_used: boolean
  enhancement_source_resolution: string
  created_at: number
}

export type AdminVideoGenerationQuery = {
  page?: number
  page_size?: number
  /** 租户名称 / 租户 ID / Owner 昵称 / 创建者昵称 */
  tenant_keyword?: string
  status?: string
  created_from?: number
  created_to?: number
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function listAdminVideoGenerations(
  params: AdminVideoGenerationQuery = {}
) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: AdminVideoGeneration[] }>
  >('/v1/admin/video/generations', { params })
  return unwrap(data)
}

export type AdminVideoGenerationStats = {
  total: number
  succeeded: number
  processing: number
  failed: number
  queued: number
  running: number
  cancelled: number
  expired: number
}

export async function getAdminVideoGenerationStats(params: {
  tenant_keyword?: string
  created_from?: number
  created_to?: number
} = {}) {
  const { data } = await request.get<ApiResponse<AdminVideoGenerationStats>>(
    '/v1/admin/video/generations/stats',
    { params }
  )
  return unwrap(data)
}
