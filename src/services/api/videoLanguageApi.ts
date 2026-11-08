import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }
type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

/** 表单里的国旗 emoji 快捷选项，覆盖常见的视频投放语种。 */
export const COMMON_FLAG_EMOJIS = [
  '🇨🇳',
  '🇺🇸',
  '🇬🇧',
  '🇯🇵',
  '🇰🇷',
  '🇩🇪',
  '🇫🇷',
  '🇪🇸',
  '🇮🇹',
  '🇷🇺',
  '🇵🇹',
  '🇧🇷',
  '🇹🇭',
  '🇻🇳',
  '🇮🇩',
  '🇸🇦',
] as const

export type VideoLanguage = {
  id: string
  code: string
  name: string
  english_name: string
  flag_emoji: string
  status: 'listed' | 'unlisted'
  sort_order: number
  created_at: string
  updated_at: string
}

export type VideoLanguageInput = Pick<
  VideoLanguage,
  'code' | 'name' | 'english_name' | 'flag_emoji' | 'status' | 'sort_order'
>

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function listVideoLanguages() {
  const { data } = await request.get<
    ApiResponse<{ items: VideoLanguage[]; total: number }>
  >('/v1/video-languages')
  return unwrap(data)
}

export async function listAdminVideoLanguages() {
  const { data } = await request.get<
    ApiResponse<{ items: VideoLanguage[]; total: number }>
  >('/v1/admin/video-languages', { params: { page: 1, page_size: 100 } })
  return unwrap(data)
}

export async function createVideoLanguage(input: VideoLanguageInput) {
  const { data } = await request.post<ApiResponse<VideoLanguage>>(
    '/v1/admin/video-languages',
    input
  )
  return unwrap(data)
}

export async function updateVideoLanguage(
  id: string,
  input: VideoLanguageInput
) {
  const { data } = await request.put<ApiResponse<VideoLanguage>>(
    `/v1/admin/video-languages/${id}`,
    input
  )
  return unwrap(data)
}

export async function deleteVideoLanguage(id: string) {
  const { data } = await request.delete<ApiBaseResponse>(
    `/v1/admin/video-languages/${id}`
  )
  if (data.code !== 0) throw new Error(data.msg || '删除失败')
}
