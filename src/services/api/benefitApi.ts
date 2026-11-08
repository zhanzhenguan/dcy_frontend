import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export type BenefitDefinition = {
  id: string
  code: string
  name: string
  status: 'ACTIVE' | 'DISABLED'
  created_at: string
  updated_at: string
}

export type TenantBenefit = {
  id: string
  tenant_id: string
  benefit_definition_id: string
  benefit_code: string
  benefit_name: string
  source_type: string
  source_id: string
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  effective_at: string
  expires_at: string
  revoked_at: string
  created_at: string
}

export async function listBenefitDefinitions() {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: BenefitDefinition[] }>
  >('/v1/admin/benefits/definitions', { params: { page: 1, page_size: 100 } })
  return unwrap(data)
}

export async function createBenefitDefinition(
  input: Pick<BenefitDefinition, 'code' | 'name' | 'status'>
) {
  const { data } = await request.post<ApiResponse<BenefitDefinition>>(
    '/v1/admin/benefits/definitions',
    input
  )
  return unwrap(data)
}

export async function updateBenefitDefinition(
  id: string,
  input: Pick<BenefitDefinition, 'name' | 'status'>
) {
  const { data } = await request.put<ApiResponse<BenefitDefinition>>(
    `/v1/admin/benefits/definitions/${id}`,
    input
  )
  return unwrap(data)
}

export async function deleteBenefitDefinition(id: string) {
  const { data } = await request.delete<ApiResponse<null>>(
    `/v1/admin/benefits/definitions/${id}`
  )
  return unwrap(data)
}

export async function grantTenantBenefit(input: {
  tenant_id: string
  benefit_definition_id: string
  expires_at?: string
}) {
  const { data } = await request.post<ApiResponse<TenantBenefit>>(
    '/v1/admin/benefits/grants',
    input
  )
  return unwrap(data)
}

export async function revokeTenantBenefit(id: string) {
  const { data } = await request.post<ApiResponse<TenantBenefit>>(
    `/v1/admin/benefits/grants/${id}/revoke`
  )
  return unwrap(data)
}
