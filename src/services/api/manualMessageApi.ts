import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }
export type ManualAudience = 'USER' | 'TENANT' | 'GLOBAL'

export type ManualAudiencePreview = {
  audience_type: ManualAudience
  audience_id: string
  target_name: string
  estimated_recipients: number
}

export type ManualMessageHistoryItem = {
  id: string
  audience_type: ManualAudience
  audience_id: string
  target_name: string
  estimated_recipients: number
  title: string
  content: string
  sender_user_id: string
  sender_name: string
  created_at: string
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function previewManualMessageAudience(input: {
  audience_type: ManualAudience
  audience_id?: string
}) {
  const { data } = await request.post<ApiResponse<ManualAudiencePreview>>(
    '/v1/admin/manual-in-app-messages/audience-preview',
    input
  )
  return unwrap(data)
}

export async function sendManualMessage(input: {
  audience_type: ManualAudience
  audience_id?: string
  title: string
  content: string
}) {
  const { data } = await request.post<ApiResponse<null>>(
    '/v1/admin/manual-in-app-messages',
    input
  )
  return unwrap(data)
}

export async function listManualMessages(params: {
  audience_type?: ManualAudience
  sender_user_id?: string
  start_at?: string
  end_at?: string
  page?: number
  page_size?: number
}) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: ManualMessageHistoryItem[] }>
  >('/v1/admin/manual-in-app-messages', { params })
  return unwrap(data)
}
