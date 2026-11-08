import { request } from '@/services/request'
import { getApiErrorMessage } from '@/services/api/apiError'

type ApiResponse<T> = { code: number; msg: string; data: T }
type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

export type InspirationTimelineStep = {
  timeframe: string
  title: string
  description: string
  technique: string
}

export type Inspiration = {
  id: string
  brand: string
  brand_code: string
  brand_bg_color: string
  industry: string
  platform: string
  title: string
  creative_strategy: string
  tags: string[]
  views: number
  ctr: number
  duration: number
  cover_image: string
  video_url: string
  hook: string
  target_audience: string
  visual_style: string
  selling_points: string[]
  timeline: InspirationTimelineStep[]
  full_script: string
  ai_prompt: string
  status: 'listed' | 'unlisted'
  sort_order: number
  created_at: string
  updated_at: string
}

export type InspirationInput = Omit<
  Inspiration,
  'id' | 'created_at' | 'updated_at'
>

export type InspirationListParams = {
  page?: number
  page_size?: number
  industry?: string
  platform?: string
  keyword?: string
  sort?: 'popular' | 'ctr' | 'latest'
  status?: '' | 'listed' | 'unlisted'
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function listInspirations(params: InspirationListParams = {}) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: Inspiration[] }>
  >('/v1/inspirations', { params })
  return unwrap(data)
}

export async function listAdminInspirations(
  params: InspirationListParams = {}
) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: Inspiration[] }>
  >('/v1/admin/inspirations', {
    params: { page: 1, page_size: 100, sort: 'latest', ...params },
  })
  return unwrap(data)
}

export async function createInspiration(input: InspirationInput) {
  const { data } = await request.post<ApiResponse<Inspiration>>(
    '/v1/admin/inspirations',
    input
  )
  return unwrap(data)
}

export async function updateInspiration(id: string, input: InspirationInput) {
  const { data } = await request.put<ApiResponse<Inspiration>>(
    `/v1/admin/inspirations/${id}`,
    input
  )
  return unwrap(data)
}

export async function updateInspirationStatus(
  id: string,
  status: Inspiration['status']
) {
  const { data } = await request.put<ApiResponse<Inspiration>>(
    `/v1/admin/inspirations/${id}/status`,
    { status }
  )
  return unwrap(data)
}

export async function deleteInspiration(id: string) {
  const { data } = await request.delete<ApiBaseResponse>(
    `/v1/admin/inspirations/${id}`
  )
  if (data.code !== 0) throw new Error(data.msg || '删除失败')
}

export async function uploadInspirationAsset(file: File) {
  const form = new FormData()
  form.append('file', file)
  try {
    const { data } = await request.post<ApiResponse<{ url: string }>>(
      '/v1/admin/inspirations/assets',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return unwrap(data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '素材上传失败'))
  }
}
