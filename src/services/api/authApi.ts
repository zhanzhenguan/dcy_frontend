import { type AuthSession } from '@/stores/authStore'
import { request } from '@/services/request'

type ApiResponse<T> = {
  code: number
  msg: string
  data: T
}

type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

type LoginInput = {
  email: string
  password: string
}

type Captcha = {
  captcha_id: string
  captcha_image: string
  expires_in: number
}

type SmsLoginInput = {
  phone: string
  code: string
}

type TenantInvitationSmsLoginInput = SmsLoginInput & {
  global_invitation_code?: string
}

type RegisterInput = {
  email: string
  email_code?: string
  password: string
  nickname: string
  global_invitation_code?: string
  referral_code?: string
}

type ChangePasswordInput = {
  old_password: string
  new_password: string
  confirm_password: string
}

function unwrapResponse<T>(response: ApiResponse<T>) {
  if (response.code !== 0) {
    throw new Error(response.msg || '请求失败')
  }
  return response.data
}

export async function login(input: LoginInput) {
  const { data } = await request.post<ApiResponse<AuthSession>>(
    '/v1/auth/login',
    {
      ...input,
      client_name: 'video-pipeline-web',
    }
  )
  return unwrapResponse(data)
}

export async function getCaptcha() {
  const { data } = await request.get<ApiResponse<Captcha>>('/v1/auth/captcha')
  return unwrapResponse(data)
}

export async function getGlobalInvitationCodeEnabled() {
  const { data } = await request.get<ApiResponse<{ enabled: boolean }>>(
    '/v1/auth/global-invitation-code-enabled'
  )
  return unwrapResponse(data)
}

export async function getRegistrationEnabled() {
  const { data } = await request.get<
    ApiResponse<{
      enabled: boolean
      require_email_verification: boolean
    }>
  >('/v1/auth/registration-enabled')
  return unwrapResponse(data)
}

export async function sendSmsCode(input: {
  phone: string
  captcha_id: string
  captcha_code: string
}) {
  const { data } = await request.post<ApiResponse<{ retry_after: number }>>(
    '/v1/auth/sms/code',
    input
  )
  return unwrapResponse(data)
}

export async function sendEmailCode(input: {
  email: string
  captcha_id: string
  captcha_code: string
}) {
  const { data } = await request.post<ApiResponse<{ retry_after: number }>>(
    '/v1/auth/email/code',
    input
  )
  return unwrapResponse(data)
}

export async function smsLogin(input: SmsLoginInput) {
  const { data } = await request.post<ApiResponse<AuthSession>>(
    '/v1/auth/sms/login',
    { ...input, client_name: 'video-pipeline-web' }
  )
  return unwrapResponse(data)
}

export async function register(input: RegisterInput) {
  const { data } = await request.post<ApiResponse<AuthSession>>(
    '/v1/auth/register',
    input
  )
  return unwrapResponse(data)
}

/** 邮箱注册并加入企业（邀请码）；返回的 session 已切到该企业 */
export async function registerViaTenantInvitation(
  code: string,
  input: Omit<RegisterInput, 'referral_code'>
) {
  const { data } = await request.post<ApiResponse<AuthSession>>(
    `/v1/auth/tenant-invitations/${code}/register`,
    input
  )
  return unwrapResponse(data)
}

/** 短信登录/首次开户并加入企业（邀请码）；返回的 session 已切到该企业 */
export async function smsLoginViaTenantInvitation(
  code: string,
  input: TenantInvitationSmsLoginInput
) {
  const { data } = await request.post<ApiResponse<AuthSession>>(
    `/v1/auth/tenant-invitations/${code}/sms/login`,
    { ...input, client_name: 'video-pipeline-web' }
  )
  return unwrapResponse(data)
}

export async function logout(refreshToken: string) {
  const { data } = await request.post<ApiBaseResponse>('/v1/auth/logout', {
    refresh_token: refreshToken,
  })

  if (data.code !== 0) throw new Error(data.msg || '退出登录失败')
}

export async function changePassword(input: ChangePasswordInput) {
  const { data } = await request.put<ApiBaseResponse>(
    '/v1/user/password',
    input
  )

  if (data.code !== 0) throw new Error(data.msg || '修改密码失败')
}
