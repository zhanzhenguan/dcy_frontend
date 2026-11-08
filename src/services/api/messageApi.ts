import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }

export type InAppMessage = {
  id: string
  message_type: string
  title: string
  content: string
  reference_type: string
  reference_id: string
  read_at: string
  created_at: string
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function listInAppMessages(params: {
  page: number
  page_size: number
}) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: InAppMessage[] }>
  >('/v1/messages', { params })
  return unwrap(data)
}

export async function getUnreadInAppMessageCount() {
  const { data } = await request.get<ApiResponse<{ count: number }>>(
    '/v1/messages/unread-count'
  )
  return unwrap(data)
}

export async function markInAppMessageRead(id: string) {
  const { data } = await request.put<ApiResponse<null>>(
    `/v1/messages/${id}/read`
  )
  return unwrap(data)
}
