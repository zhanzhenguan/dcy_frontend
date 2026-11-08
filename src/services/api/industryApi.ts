import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }
type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

export type Industry = {
  id: string
  name: string
  status: 'listed' | 'unlisted'
  sort_order: number
  created_at: string
  updated_at: string
}

export type IndustryInput = Pick<Industry, 'name' | 'status' | 'sort_order'>

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function listIndustries() {
  const { data } =
    await request.get<ApiResponse<{ items: Industry[]; total: number }>>(
      '/v1/industries'
    )
  return unwrap(data)
}

export async function listAdminIndustries() {
  const { data } = await request.get<
    ApiResponse<{ items: Industry[]; total: number }>
  >('/v1/admin/industries', { params: { page: 1, page_size: 100 } })
  return unwrap(data)
}

export async function createIndustry(input: IndustryInput) {
  const { data } = await request.post<ApiResponse<Industry>>(
    '/v1/admin/industries',
    input
  )
  return unwrap(data)
}

export async function updateIndustry(id: string, input: IndustryInput) {
  const { data } = await request.put<ApiResponse<Industry>>(
    `/v1/admin/industries/${id}`,
    input
  )
  return unwrap(data)
}

export async function deleteIndustry(id: string) {
  const { data } = await request.delete<ApiBaseResponse>(
    `/v1/admin/industries/${id}`
  )
  if (data.code !== 0) throw new Error(data.msg || '删除失败')
}
