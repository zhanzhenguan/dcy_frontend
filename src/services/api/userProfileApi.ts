import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }

export type UserProfile = {
  id: string
  email: string
  account_set: boolean
  password_set: boolean
  account_change_allowed_at: string
  phone_country_code: string
  phone: string
  nickname: string
  avatar_url: string
  first_name: string
  last_name: string
  gender: number
  birth_date: string
  locale: string
  timezone: string
  country_code: string
  email_verified: boolean
  phone_verified: boolean
  subscription_plan: string
  subscription_expires_at: string
  referral_code: string
  created_at: string
}

export type UpdateUserProfileInput = {
  account?: string
  new_password?: string
  nickname?: string
  avatar_url?: string
  first_name?: string
  last_name?: string
  gender?: number
  birth_date?: string
  locale?: string
  timezone?: string
  country_code?: string
}

export type BindPhoneInput = {
  phone: string
  code: string
}

export type ChangePhoneInput = {
  old_phone: string
  new_phone: string
  code: string
}

export type RenderingEngineStatus = {
  provider_code: string
  provider_name: string
  active_tasks: number
  max_concurrency: number
  status: 'idle' | 'crowded' | 'busy'
}

export async function getUserProfile() {
  const { data } =
    await request.get<ApiResponse<UserProfile>>('/v1/user/profile')
  if (data.code !== 0) throw new Error(data.msg || '获取个人资料失败')
  return data.data
}

export async function getRenderingEngineStatus() {
  const { data } = await request.get<ApiResponse<RenderingEngineStatus[]>>(
    '/v1/user/rendering-engines/status'
  )
  if (data.code !== 0) throw new Error(data.msg || '获取渲染引擎状态失败')
  return data.data
}

// 更新当前登录用户的个人资料
export async function updateUserProfile(input: UpdateUserProfileInput) {
  const { data } = await request.put<ApiResponse<UserProfile>>(
    '/v1/user/profile',
    input
  )
  if (data.code !== 0) throw new Error(data.msg || '更新资料失败')
  return data.data
}

/** 邮箱账号绑定手机号；手机号已被他人占用时后端返回 409 / code=10017 */
export async function bindUserPhone(input: BindPhoneInput) {
  const { data } = await request.post<ApiResponse<UserProfile>>(
    '/v1/user/phone/bind',
    input
  )
  if (data.code !== 0) throw new Error(data.msg || '绑定手机号失败')
  return data.data
}

/** 校验旧手机号与新号短信验证码后更换绑定；新号已被他人占用时后端返回 409 / code=10017 */
export async function changeUserPhone(input: ChangePhoneInput) {
  const { data } = await request.put<ApiResponse<UserProfile>>(
    '/v1/user/phone',
    input
  )
  if (data.code !== 0) throw new Error(data.msg || '更换手机号失败')
  return data.data
}
