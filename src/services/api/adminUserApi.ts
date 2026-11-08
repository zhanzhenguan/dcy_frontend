import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }
// type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

export const ADMIN_USER_ROLES = ['user', 'admin'] as const
export const ADMIN_USER_STATUSES = ['active', 'disabled'] as const

export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number]
export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number]

export type AdminUser = {
  id: string
  email: string
  nickname: string
  role: AdminUserRole
  status: AdminUserStatus
  subscription_plan: string
  login_count: number
  last_login_at: string
  last_login_ip: string
  created_at: string
  updated_at: string
}

export type AdminUserList = {
  total: number
  items: AdminUser[]
}

export type AdminUserListParams = {
  page?: number
  page_size?: number
  keyword?: string
  role?: '' | AdminUserRole
  status?: '' | AdminUserStatus
}

export type CreateAdminUserInput = {
  email: string
  password: string
  nickname: string
  role: AdminUserRole
  status?: AdminUserStatus
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function listAdminUsers(params: AdminUserListParams = {}) {
  const { data } = await request.get<ApiResponse<AdminUserList>>(
    '/v1/admin/users',
    {
      params: {
        page: 1,
        page_size: 20,
        ...params,
      },
    }
  )
  return unwrap(data)
}

export async function getAdminUser(id: string) {
  const { data } = await request.get<ApiResponse<AdminUser>>(
    `/v1/admin/users/${id}`
  )
  return unwrap(data)
}

export async function createAdminUser(input: CreateAdminUserInput) {
  const { data } = await request.post<ApiResponse<AdminUser>>(
    '/v1/admin/users',
    input
  )
  return unwrap(data)
}

export async function updateAdminUserStatus(
  id: string,
  status: AdminUserStatus
) {
  const { data } = await request.put<ApiResponse<AdminUser>>(
    `/v1/admin/users/${id}/status`,
    { status }
  )
  return unwrap(data)
}

export async function updateAdminUserRole(id: string, role: AdminUserRole) {
  const { data } = await request.put<ApiResponse<AdminUser>>(
    `/v1/admin/users/${id}/role`,
    { role }
  )
  return unwrap(data)
}
