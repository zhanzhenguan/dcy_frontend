import { request } from '@/services/request'
import type { ProviderGenerationLimits } from './tenantModelRuleApi'

type ApiResponse<T> = { code: number; msg: string; data: T }
type ApiBaseResponse = Omit<ApiResponse<never>, 'data'>

export type PricingScenario = 'no_input_video' | 'input_video'

export type ModelPricingRule = {
  scenario: PricingScenario
  resolution: string
  coefficient: number
}

export type ModelEnhancementStrategy = {
  target_resolution: string
  source_resolution: string
}

export type ModelProvider = {
  id: string
  code: string
  name: string
  description: string
  base_url: string
  api_key_configured: boolean
  system_prompt: string
  enhancement_enabled: boolean
  enhancement_strategies: ModelEnhancementStrategy[]
  enabled: boolean
  sort_order: number
  model_count: number
  created_at: string
  updated_at: string
}

export type ModelConfig = {
  id: string
  provider_id: string
  provider_code: string
  provider_name: string
  code: string
  name: string
  edition: string
  description: string
  base_credits: number
  pricing_rules: ModelPricingRule[]
  supported_resolutions: string[]
  weight: number
  enabled: boolean
  is_default: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type ModelCatalogProvider = {
  provider: ModelProvider
  generation_limits: ProviderGenerationLimits
  models: ModelConfig[]
}

export type ProviderInput = {
  code: string
  name: string
  description: string
  base_url: string
  api_key: string
  system_prompt: string
  enhancement_enabled: boolean
  enhancement_strategies: ModelEnhancementStrategy[]
  enabled: boolean
  sort_order: number
}

export type ModelInput = Pick<
  ModelConfig,
  | 'provider_id'
  | 'code'
  | 'name'
  | 'edition'
  | 'description'
  | 'base_credits'
  | 'pricing_rules'
  | 'supported_resolutions'
  | 'weight'
  | 'enabled'
  | 'is_default'
  | 'sort_order'
>

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

function toProviderRequestBody(input: ProviderInput) {
  return {
    code: input.code,
    name: input.name,
    description: input.description,
    base_url: input.base_url,
    api_key: input.api_key,
    system_prompt: input.system_prompt,
    enhancement_enabled: input.enhancement_enabled,
    enhancement_strategies: input.enhancement_strategies,
    enabled: input.enabled,
    sort_order: input.sort_order,
  }
}

export async function getModelCatalog() {
  const { data } =
    await request.get<ApiResponse<ModelCatalogProvider[]>>(
      '/v1/models/catalog'
    )
  return unwrap(data)
}

export async function listModelProviders() {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: ModelProvider[] }>
  >('/v1/models/providers', { params: { page: 1, page_size: 100 } })
  return unwrap(data)
}

export async function createModelProvider(input: ProviderInput) {
  const { data } = await request.post<ApiResponse<ModelProvider>>(
    '/v1/models/providers',
    toProviderRequestBody(input)
  )
  return unwrap(data)
}

export async function updateModelProvider(id: string, input: ProviderInput) {
  const { data } = await request.put<ApiResponse<ModelProvider>>(
    `/v1/models/providers/${id}`,
    toProviderRequestBody(input)
  )
  return unwrap(data)
}

export async function deleteModelProvider(id: string) {
  const { data } = await request.delete<ApiBaseResponse>(
    `/v1/models/providers/${id}`
  )
  if (data.code !== 0) throw new Error(data.msg || '删除失败')
}

export async function listModels() {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: ModelConfig[] }>
  >('/v1/models', { params: { page: 1, page_size: 100 } })
  return unwrap(data)
}

export async function createModel(input: ModelInput) {
  const { data } = await request.post<ApiResponse<ModelConfig>>(
    '/v1/models',
    input
  )
  return unwrap(data)
}

export async function updateModel(id: string, input: ModelInput) {
  const { data } = await request.put<ApiResponse<ModelConfig>>(
    `/v1/models/${id}`,
    input
  )
  return unwrap(data)
}

export async function deleteModel(id: string) {
  const { data } = await request.delete<ApiBaseResponse>(`/v1/models/${id}`)
  if (data.code !== 0) throw new Error(data.msg || '删除失败')
}
