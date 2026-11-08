import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }

export type GlobalInvitationCode = {
  id: string
  code: string
  status: 'available' | 'occupied' | 'expired'
  expires_at: string
  occupied_by_user_id: string
  occupied_by_user_nickname: string
  occupied_at: string
  created_at: string
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function listGlobalInvitationCodes(params: {
  page: number
  page_size: number
}) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: GlobalInvitationCode[] }>
  >('/v1/admin/global-invitation-codes', { params })
  return unwrap(data)
}

export async function generateGlobalInvitationCodes(input: {
  count: number
  expires_at?: string
}) {
  const { data } = await request.post<ApiResponse<GlobalInvitationCode[]>>(
    '/v1/admin/global-invitation-codes',
    input
  )
  return unwrap(data)
}

export async function getGlobalInvitationCodeEnabled() {
  const { data } = await request.get<ApiResponse<{ enabled: boolean }>>(
    '/v1/admin/global-invitation-codes/settings'
  )
  return unwrap(data)
}

export async function updateGlobalInvitationCodeEnabled(enabled: boolean) {
  const { data } = await request.put<ApiResponse<{ enabled: boolean }>>(
    '/v1/admin/global-invitation-codes/settings',
    { enabled }
  )
  return unwrap(data)
}
