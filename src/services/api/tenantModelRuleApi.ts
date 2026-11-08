import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }
type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

/** 画质增强策略：目标分辨率 -> 源分辨率（源必须低于目标） */
export type TenantRuleEnhancementStrategy = {
  target_resolution: string
  source_resolution: string
}

export type ProviderGenerationLimits = {
  generation_duration_min: number
  generation_duration_max: number
  reference_image_max_count: number
  reference_image_max_mb: number
  reference_video_max_count: number
  reference_video_duration_min: number
  reference_video_duration_max: number
  reference_video_total_duration_max: number
  allowed_ratios: string[]
  allowed_resolutions: string[]
}

/** 供应商内可用模型与路由权重；出现在列表中即表示该模型对该租户可用 */
export type TenantRuleModel = {
  model_id: string
  weight: number
  is_default: boolean
}

/** 供应商级规则；出现在列表中即表示该供应商对该租户可用（无视全局 enabled） */
export type TenantRuleProvider = {
  provider_code: string
  enhancement_enabled: boolean
  enhancement_strategies: TenantRuleEnhancementStrategy[]
  generation_limits: ProviderGenerationLimits
  models: TenantRuleModel[]
}

/** 租户模型规则文档；整体替代全局规则 */
export type TenantRuleDoc = {
  schema_version: number
  providers: TenantRuleProvider[]
}

export type TenantModelRule = {
  tenant_public_id: string
  display_name: string
  tenant_type: 'PERSONAL' | 'ENTERPRISE'
  rules: TenantRuleDoc
  updated_at: string
}

export type TenantModelRuleList = {
  total: number
  items: TenantModelRule[]
}

/** 生效规则预览：解析后的最终供应商与模型 */
export type TenantEffectiveRuleModel = {
  model_id: string
  model_code: string
  name: string
  weight: number
  is_default: boolean
}

export type TenantEffectiveRuleProvider = {
  provider_code: string
  provider_name: string
  enhancement_enabled: boolean
  enhancement_strategies: TenantRuleEnhancementStrategy[]
  generation_limits: ProviderGenerationLimits
  models: TenantEffectiveRuleModel[]
}

export type TenantEffectiveRule = {
  rule_source: 'tenant' | 'global'
  providers: TenantEffectiveRuleProvider[]
}

export type GlobalModelRuleModel = {
  model_id: string
  model_code: string
  model_name: string
  base_credits: number
  pricing_rules: {
    scenario: 'no_input_video' | 'input_video'
    resolution: string
    coefficient: number
  }[]
  supported_resolutions: string[]
  weight: number
  enabled: boolean
  is_default: boolean
}

export type GlobalModelRuleProvider = {
  provider_id: string
  provider_code: string
  provider_name: string
  enabled: boolean
  enhancement_enabled: boolean
  enhancement_strategies: TenantRuleEnhancementStrategy[]
  generation_limits: ProviderGenerationLimits
  models: GlobalModelRuleModel[]
}

export type GlobalModelRule = { providers: GlobalModelRuleProvider[] }

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function listTenantModelRules(params: {
  page?: number
  page_size?: number
  keyword?: string
}) {
  const { data } = await request.get<ApiResponse<TenantModelRuleList>>(
    '/v1/admin/tenant-model-rules',
    { params }
  )
  return unwrap(data)
}

export async function getTenantModelRule(tenantPublicId: string) {
  const { data } = await request.get<ApiResponse<TenantModelRule>>(
    `/v1/admin/tenant-model-rules/${tenantPublicId}`
  )
  return unwrap(data)
}

export async function upsertTenantModelRule(
  tenantPublicId: string,
  rules: TenantRuleDoc
) {
  const { data } = await request.put<ApiResponse<TenantModelRule>>(
    `/v1/admin/tenant-model-rules/${tenantPublicId}`,
    { rules }
  )
  return unwrap(data)
}

export async function deleteTenantModelRule(tenantPublicId: string) {
  const { data } = await request.delete<ApiBaseResponse>(
    `/v1/admin/tenant-model-rules/${tenantPublicId}`
  )
  if (data.code !== 0) throw new Error(data.msg || '删除失败')
}

export async function getTenantEffectiveRule(tenantPublicId: string) {
  const { data } = await request.get<ApiResponse<TenantEffectiveRule>>(
    `/v1/admin/tenant-model-rules/${tenantPublicId}/effective`
  )
  return unwrap(data)
}

export async function getGlobalModelRule() {
  const { data } = await request.get<ApiResponse<GlobalModelRule>>(
    '/v1/admin/tenant-model-rules/global'
  )
  return unwrap(data)
}

export async function updateGlobalModelRule(rules: GlobalModelRule) {
  const { data } = await request.put<ApiResponse<GlobalModelRule>>(
    '/v1/admin/tenant-model-rules/global',
    { rules }
  )
  return unwrap(data)
}
