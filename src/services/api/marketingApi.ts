import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

/** 个人中心邀请码（非管理端营销配置） */
export async function getPersonalInvitation() {
  const { data } = await request.get<ApiResponse<{ referral_code: string }>>(
    '/v1/marketing/personal-invitation'
  )
  return unwrap(data)
}
