import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }

export type MarketingCampaignStatus =
  'DRAFT' | 'RUNNING' | 'PAUSED' | 'ENDED' | 'ARCHIVED'
export type MarketingActionType =
  'GRANT_POINTS' | 'ISSUE_COUPON' | 'GRANT_BENEFIT' | 'SEND_MESSAGE'
export type MarketingParticipationRule = 'UNLIMITED' | 'ONCE' | 'DAILY'

export type MarketingCampaign = {
  id: string
  campaign_code: string
  name: string
  status: MarketingCampaignStatus
  trigger_type: string
  schema_version: string
  flow_config: string
  flow_version: string
  trigger_end_at: string
  execute_end_at: string
  archived_at: string
  participation_rule: MarketingParticipationRule
  budget_amount: number
  used_amount: number
  exclusive_group: string
  priority: number
  budget_exceeded_count: number
  created_at: string
  updated_at: string
}

export type MarketingCampaignInput = {
  campaign_code: string
  name: string
  schema_version: number
  flow_config: string
  trigger_end_at?: string
  execute_end_at?: string
  participation_rule: MarketingParticipationRule
  budget_amount?: number
  exclusive_group?: string
  priority?: number
}

export type MarketingEventField = {
  code: string
  path: string
  name: string
  description: string
  value_type: 'STRING' | 'INTEGER' | 'BOOLEAN' | 'ENUM'
  optional: boolean
  example: string
  sensitivity: 'PUBLIC' | 'SENSITIVE'
  operators: Array<{ code: string; name: string }>
  enum_values: Array<{ code: string; name: string }>
}

export type MarketingEventCatalog = {
  events: Array<{
    event_type: string
    schema_version: number
    name: string
    description: string
    fields: MarketingEventField[]
  }>
  common_variables: MarketingEventField[]
  message_variables?: MarketingEventField[]
}

export type MarketingDryRunOption = {
  id: string
  name: string
}

export type MarketingDryRunEventOption = {
  event_id: string
  event_type: string
  tenant_id: string
  tenant_name: string
  operator_user_id: string
  operator_user_nickname: string
  occurred_at: string
}

export type MarketingDryRunOptions = {
  events: MarketingDryRunEventOption[]
  tenants: MarketingDryRunOption[]
  users: MarketingDryRunOption[]
}

export type MarketingDryRunInput = {
  mode: 'REAL' | 'SIMULATED'
  event_id: string
  event_type?: string
  tenant_id?: string
  operator_user_id?: string
  occurred_at?: string
  event_data?: string
  fact_overrides?: string
}

export type MarketingNodeTrace = {
  node_id: string
  node_type: string
  attempt: number
  input_summary: string
  condition_result: string
  selected_edge: string
  resume_at: string
  action_type: string
  action_result: string
  redaction_summary: string
  created_at: string
}

export type MarketingDryRunMatch = {
  campaign_id: string
  campaign_code: string
  matched: boolean
  reason: string
  reward_type: string
  reward_points: number
  trace: MarketingNodeTrace[]
}

export type MarketingExecution = {
  id: string
  campaign_id: string
  campaign_code: string
  campaign_name: string
  tenant_id: string
  operator_user_id: string
  event_id: string
  event_type: string
  flow_version: string
  current_node_id: string
  next_execute_at: string
  retry_count: number
  last_failed_node_id: string
  status: string
  termination_reason: string
  error_message: string
  created_at: string
  updated_at: string
}

export type MarketingReward = {
  id: string
  campaign_id: string
  execution_id: string
  tenant_id: string
  user_id: string
  recipient_nickname: string
  tenant_name: string
  source_type: string
  source_id: string
  source_event_id: string
  reward_type: string
  reward_amount: number
  reward_content: string
  status: string
  status_label: string
  created_at: string
  updated_at: string
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function listMarketingCampaigns(params: {
  page: number
  page_size: number
  status?: MarketingCampaignStatus
}) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: MarketingCampaign[] }>
  >('/v1/admin/marketing/campaigns', { params })
  return unwrap(data)
}

export async function getMarketingCampaign(id: string) {
  const { data } = await request.get<ApiResponse<MarketingCampaign>>(
    `/v1/admin/marketing/campaigns/${id}`
  )
  return unwrap(data)
}

export async function getMarketingEventCatalog() {
  const { data } = await request.get<ApiResponse<MarketingEventCatalog>>(
    '/v1/admin/marketing/event-catalog'
  )
  return unwrap(data)
}

export async function getMarketingDryRunOptions() {
  const { data } = await request.get<ApiResponse<MarketingDryRunOptions>>(
    '/v1/admin/marketing/dry-run-options'
  )
  return unwrap(data)
}

export async function createMarketingCampaign(input: MarketingCampaignInput) {
  const { data } = await request.post<ApiResponse<MarketingCampaign>>(
    '/v1/admin/marketing/campaigns',
    input
  )
  return unwrap(data)
}

export async function updateMarketingCampaign(
  id: string,
  input: Omit<MarketingCampaignInput, 'campaign_code'>
) {
  const { data } = await request.put<ApiResponse<MarketingCampaign>>(
    `/v1/admin/marketing/campaigns/${id}`,
    input
  )
  return unwrap(data)
}

export async function publishMarketingCampaign(id: string) {
  const { data } = await request.post<ApiResponse<MarketingCampaign>>(
    `/v1/admin/marketing/campaigns/${id}/publish`
  )
  return unwrap(data)
}

export async function updateMarketingCampaignStatus(
  id: string,
  status: 'RUNNING' | 'PAUSED'
) {
  const { data } = await request.put<ApiResponse<MarketingCampaign>>(
    `/v1/admin/marketing/campaigns/${id}/status`,
    { status }
  )
  return unwrap(data)
}

export async function archiveMarketingCampaign(id: string) {
  const { data } = await request.delete<ApiResponse<Record<string, never>>>(
    `/v1/admin/marketing/campaigns/${id}`
  )
  return unwrap(data)
}

export async function dryRunMarketingCampaigns(input: MarketingDryRunInput) {
  const { data } = await request.post<ApiResponse<MarketingDryRunMatch[]>>(
    '/v1/admin/marketing/campaigns/dry-run',
    input
  )
  return unwrap(data)
}

export async function listMarketingExecutions(params: {
  page: number
  page_size: number
  campaign_id?: string
  tenant_id?: string
  status?: string
}) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: MarketingExecution[] }>
  >('/v1/admin/marketing/executions', { params })
  return unwrap(data)
}

export async function getMarketingExecution(id: string) {
  const { data } = await request.get<
    ApiResponse<{
      execution: MarketingExecution
      trace: MarketingNodeTrace[]
    }>
  >(`/v1/admin/marketing/executions/${id}`)
  return unwrap(data)
}

export async function retryMarketingExecution(id: string) {
  const { data } = await request.post<
    ApiResponse<{ execution: MarketingExecution }>
  >(`/v1/admin/marketing/executions/${id}/retry`)
  return unwrap(data).execution
}

export async function listMarketingRewards(params: {
  page: number
  page_size: number
  campaign_id?: string
  tenant_id?: string
  source_type?: string
}) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: MarketingReward[] }>
  >('/v1/admin/marketing/rewards', { params })
  return unwrap(data)
}
