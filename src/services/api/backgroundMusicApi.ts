import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }
type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

export type BackgroundMusic = {
  id: string
  code: string
  name: string
  url: string
  content_type: string
  duration_ms: number
  status: 'listed' | 'unlisted'
  sort_order: number
  created_at: string
  updated_at: string
}

export type BackgroundMusicInput = Pick<
  BackgroundMusic,
  | 'code'
  | 'name'
  | 'url'
  | 'content_type'
  | 'duration_ms'
  | 'status'
  | 'sort_order'
>

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function listBackgroundMusics() {
  const { data } = await request.get<
    ApiResponse<{ items: BackgroundMusic[]; total: number }>
  >('/v1/background-musics', { params: { page: 1, page_size: 100 } })
  return unwrap(data)
}

export async function listAdminBackgroundMusics() {
  const { data } = await request.get<
    ApiResponse<{ items: BackgroundMusic[]; total: number }>
  >('/v1/admin/background-musics', { params: { page: 1, page_size: 100 } })
  return unwrap(data)
}

export async function createBackgroundMusic(input: BackgroundMusicInput) {
  const { data } = await request.post<ApiResponse<BackgroundMusic>>(
    '/v1/admin/background-musics',
    input
  )
  return unwrap(data)
}

export async function updateBackgroundMusic(
  id: string,
  input: BackgroundMusicInput
) {
  const { data } = await request.put<ApiResponse<BackgroundMusic>>(
    `/v1/admin/background-musics/${id}`,
    input
  )
  return unwrap(data)
}

export async function deleteBackgroundMusic(id: string) {
  const { data } = await request.delete<ApiBaseResponse>(
    `/v1/admin/background-musics/${id}`
  )
  if (data.code !== 0) throw new Error(data.msg || '删除失败')
}
