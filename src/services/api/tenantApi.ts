import { useAuthStore } from '@/stores/authStore'
import type {
  PlanBillingOption,
  PlanCatalogItem,
  PlanPurchase,
} from '@/services/api/subscriptionApi'
import { request } from '@/services/request'

type ApiResponse<T> = {
  code: number
  msg: string
  data: T
}

export type Tenant = {
  public_id: string
  tenant_type: 'PERSONAL' | 'ENTERPRISE'
  company_name: string
  logo_url: string
  industry: string
  plan_id: string
  plan_level_code: string
  plan_level_name: string
  /** 当前套餐计费周期：MONTH / QUARTER / YEAR；试用或未购买时为空 */
  billing_period: 'MONTH' | 'QUARTER' | 'YEAR' | ''
  status: string
  role: 'owner' | 'manager' | 'leader' | 'member'
  /** 是否开启加入企业审核；仅企业租户有意义 */
  join_approval_required?: boolean
}

export type AdminTenantPreview = {
  id: string
  public_id: string
  display_name: string
  tenant_type: 'PERSONAL' | 'ENTERPRISE'
  /** Owner 邮箱；占位邮箱时为空 */
  email: string
  /** Owner 手机号；未绑定时为空 */
  phone: string
  industry: string
  status: string
  plan_level_code: string
  plan_level_name: string
  plan_expires_at: string
  credit_balance: number
  available_credit: number
  created_at: string
  /** Owner 用户资料最近更新时间 */
  updated_at: string
}

export type TenantRole = {
  public_id: string
  code: 'owner' | 'manager' | 'leader' | 'member'
  name: string
  data_scope: 'all' | 'group' | 'self'
}

export type TenantMember = {
  public_id: string
  user_public_id: string
  email: string
  nickname: string
  avatar_url: string
  role: TenantRole
}

export type TenantMemberList = {
  current_role: Tenant['role']
  roles: TenantRole[]
  items: TenantMember[]
}

export type TenantGroup = {
  public_id: string
  name: string
  leader: TenantMember | null
  members: TenantMember[]
}

export type TenantGroupList = {
  current_role: Tenant['role']
  leader_candidates: TenantMember[]
  items: TenantGroup[]
}

export type OffboardingGroupSuccessor = {
  group_public_id: string
  member_public_id: string
}

export type OffboardingMember = {
  public_id: string
  nickname: string
  role_code: TenantRole['code']
}

export type OffboardingPreview = {
  credential: string
  expires_at: string
  fingerprint: string
  departing_member: OffboardingMember
  recipient_member: OffboardingMember
  recipient_candidates: {
    member: OffboardingMember
    eligible: boolean
    reasons: string[]
  }[]
  group_requirements: {
    group_public_id: string
    group_name: string
    successor: OffboardingMember
  }[]
  resource_counts: {
    video_tasks: number
    video_drafts: number
    enterprise_assets: number
    enterprise_dirs: number
    personal_assets: number
    protected_personal_assets: number
    personal_directories: number
  }
  retention_days: number
}

export type OffboardingCleanupDetails = {
  pending: number
  protected: number
  processing: number
  completed: number
  failed: number
  retry_count: number
  failure_details: string[] | null
}

export type OffboardingAudit = {
  public_id: string
  initiator: OffboardingMember
  departing_member: OffboardingMember
  recipient_member: OffboardingMember
  resource_counts: OffboardingPreview['resource_counts']
  retention_days: number
  purge_after: string
  personal_assets_cleanup_status: string
  personal_directories_cleanup_status: string
  personal_assets_cleanup: OffboardingCleanupDetails
  personal_directories_cleanup: OffboardingCleanupDetails
  confirmed_at: string
}

export type TenantInvitation = {
  code: string
  expires_at: string
}

export type TenantInvitationPreview = {
  company_name: string
  logo_url: string
  role: TenantRole
  expires_at: string
  /** 若后端返回，用于判断当前用户是否已是该企业成员 */
  tenant_public_id?: string
}

export type CreateTenantInput = {
  company_name: string
  logo_url?: string
  industry?: string
}

export type UpdateTenantInput = CreateTenantInput

export type SwitchTenantData = {
  token_type: string
  access_token: string
  access_token_expire_at: number
  credit_balance: number
  tenant: Tenant
}

function unwrapResponse<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

function isPersonalTenantType(tenantType: unknown) {
  return (
    typeof tenantType === 'string' &&
    tenantType.trim().toUpperCase() === 'PERSONAL'
  )
}

/** 个人租户不走 /tenants/current（后端仅企业），从列表对齐套餐与 role */
async function getPersonalTenantSnapshot(
  sessionTenant: Tenant
): Promise<Tenant> {
  const tenants = await listTenants()
  return (
    tenants.find((item) => item.public_id === sessionTenant.public_id) ??
    sessionTenant
  )
}

export async function listTenants() {
  const { data } =
    await request.get<ApiResponse<Tenant[] | { items: Tenant[] }>>(
      '/v1/tenants'
    )
  const payload = unwrapResponse(data)
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.items)) return payload.items
  return []
}

export async function searchAdminTenants(
  params: {
    keyword?: string
    page?: number
    page_size?: number
    tenant_type?: 'PERSONAL' | 'ENTERPRISE'
  } = {}
) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: AdminTenantPreview[] }>
  >('/v1/admin/tenants', { params })
  return unwrapResponse(data)
}

export type AdminTenantStats = {
  total: number
  personal: number
  enterprise: number
  active: number
  personal_active: number
  enterprise_active: number
}

export async function getAdminTenantStats(params: { keyword?: string } = {}) {
  const { data } = await request.get<ApiResponse<AdminTenantStats>>(
    '/v1/admin/tenants/stats',
    { params }
  )
  return unwrapResponse(data)
}

export type AdminTenantMember = {
  user_id: string
  public_id: string
  email: string
  nickname: string
  role_code: 'owner' | 'manager' | 'leader' | 'member'
  role_name: string
}

export async function listAdminTenantMembers(
  tenantPublicId: string,
  params: {
    keyword?: string
    page?: number
    page_size?: number
  } = {}
) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: AdminTenantMember[] }>
  >(`/v1/admin/tenants/${tenantPublicId}/members`, { params })
  return unwrapResponse(data)
}

export async function createTenant(input: CreateTenantInput) {
  const { data } = await request.post<ApiResponse<Tenant>>('/v1/tenants', input)
  return unwrapResponse(data)
}

export async function switchTenant(tenantPublicId: string) {
  const { data } = await request.post<ApiResponse<SwitchTenantData>>(
    '/v1/tenants/switch',
    { tenant_public_id: tenantPublicId }
  )
  return unwrapResponse(data)
}

export async function getCurrentTenant() {
  const sessionTenant = useAuthStore.getState().auth.session?.tenant
  if (sessionTenant && isPersonalTenantType(sessionTenant.tenant_type)) {
    return getPersonalTenantSnapshot(sessionTenant)
  }
  const { data } = await request.get<ApiResponse<Tenant>>('/v1/tenants/current')
  return unwrapResponse(data)
}

/** 拉取当前租户最新套餐等信息并写入 auth session（购买/支付后调用）。 */
export async function refreshSessionTenant() {
  const previous = useAuthStore.getState().auth.session?.tenant
  if (!previous) {
    throw new Error('未登录')
  }

  const tenant = isPersonalTenantType(previous.tenant_type)
    ? await getPersonalTenantSnapshot(previous)
    : await getCurrentTenant()

  const merged = mergeTenantPlanFields(tenant, previous)
  useAuthStore.getState().auth.updateTenant(merged)
  return merged
}

/**
 * 购买成功后立即用订单结果写入 session，避免仅积分到账而套餐字段仍为「未开通」。
 * 随后仍应调用 refreshSessionTenant 与后端对齐。
 */
export function applyPlanPurchaseToSession(
  purchase: PlanPurchase,
  item?: { plan: PlanCatalogItem; option: PlanBillingOption }
) {
  const auth = useAuthStore.getState().auth
  const currentBalance = auth.session?.credit_balance ?? 0
  const granted = Math.max(0, purchase.points_granted || 0)
  const reported = purchase.credit_balance
  // 支付完成回调仍可能带着下单时的旧 credit_balance；优先用更大的到账余额，否则按赠送积分乐观累加
  const nextBalance =
    typeof reported === 'number' && reported > currentBalance
      ? reported
      : granted > 0
        ? currentBalance + granted
        : typeof reported === 'number'
          ? reported
          : currentBalance
  auth.setCreditBalance(nextBalance)

  const tenant = auth.session?.tenant
  if (!tenant) return

  const planLevelCode = (
    purchase.plan_level_code ||
    item?.plan.plan_level_code ||
    tenant.plan_level_code
  ).trim()
  const planLevelName = (
    purchase.plan_name ||
    item?.plan.name ||
    tenant.plan_level_name
  ).trim()
  const billingPeriod =
    item?.option.option_type === 'TRIAL'
      ? ('' as const)
      : item?.option.billing_period || tenant.billing_period

  auth.updateTenant({
    ...tenant,
    plan_id: item?.plan.id || tenant.plan_id,
    plan_level_code: planLevelCode || tenant.plan_level_code,
    plan_level_name: planLevelName || tenant.plan_level_name,
    billing_period: billingPeriod,
  })
}

function mergeTenantPlanFields(next: Tenant, previous?: Tenant | null): Tenant {
  const nextName = next.plan_level_name?.trim() ?? ''
  const prevName = previous?.plan_level_name?.trim() ?? ''
  const nextId = next.plan_id?.trim() ?? ''
  const prevId = previous?.plan_id?.trim() ?? ''
  const nextCode = next.plan_level_code?.trim() ?? ''
  const prevCode = previous?.plan_level_code?.trim() ?? ''

  // 服务端尚未回写时，保留本地刚写入的购买结果，避免换购后被旧值盖回
  const keepPrevId = !nextId && Boolean(prevId)
  const keepPrevCode =
    (!nextCode || nextCode.toUpperCase() === 'FREE') &&
    Boolean(prevCode && prevCode.toUpperCase() !== 'FREE')
  const keepPrevName =
    (!nextName || nextName === '未开通') &&
    Boolean(prevName && prevName !== '未开通')

  const role =
    typeof next.role === 'string' && next.role.trim()
      ? next.role
      : (previous?.role ?? next.role)

  return {
    ...next,
    role,
    plan_id: keepPrevId ? prevId : nextId || prevId,
    plan_level_code: keepPrevCode ? prevCode : nextCode || prevCode,
    plan_level_name: keepPrevName ? prevName : nextName || prevName,
    billing_period: next.billing_period || previous?.billing_period || '',
  }
}

export async function updateCurrentTenant(input: UpdateTenantInput) {
  const sessionTenant = useAuthStore.getState().auth.session?.tenant
  if (sessionTenant && isPersonalTenantType(sessionTenant.tenant_type)) {
    throw new Error('个人租户不支持修改企业信息')
  }
  const { data } = await request.put<ApiResponse<Tenant>>(
    '/v1/tenants/current',
    input
  )
  return unwrapResponse(data)
}

export async function transferCurrentTenant(memberPublicId: string) {
  const { data } = await request.post<ApiResponse<Tenant>>(
    '/v1/tenants/current/transfer',
    { member_public_id: memberPublicId }
  )
  return unwrapResponse(data)
}

export async function deactivateCurrentTenant(companyName: string) {
  const { data } = await request.post<ApiResponse<SwitchTenantData>>(
    '/v1/tenants/current/deactivate',
    { company_name: companyName }
  )
  return unwrapResponse(data)
}

export async function listTenantMembers() {
  const { data } = await request.get<ApiResponse<TenantMemberList>>(
    '/v1/tenants/current/members'
  )
  return unwrapResponse(data)
}

export async function updateTenantMemberRole(
  memberPublicId: string,
  rolePublicId: string
) {
  const { data } = await request.put<ApiResponse<TenantMember>>(
    `/v1/tenants/current/members/${memberPublicId}/role`,
    { role_public_id: rolePublicId }
  )
  return unwrapResponse(data)
}

export async function createOffboardingPreview(input: {
  departing_member_public_id: string
  recipient_member_public_id: string
  group_successors: OffboardingGroupSuccessor[]
}) {
  const { data } = await request.post<ApiResponse<OffboardingPreview>>(
    '/v1/tenants/current/offboarding/preview',
    input
  )
  return unwrapResponse(data)
}

export async function confirmOffboarding(credential: string) {
  const { data } = await request.post<ApiResponse<void>>(
    '/v1/tenants/current/offboarding/confirm',
    { credential }
  )
  return unwrapResponse(data)
}

export async function listOffboardingAudits() {
  const { data } = await request.get<ApiResponse<OffboardingAudit[]>>(
    '/v1/tenants/current/offboarding/audits'
  )
  return unwrapResponse(data)
}

export async function listTenantGroups() {
  const { data } = await request.get<ApiResponse<TenantGroupList>>(
    '/v1/tenants/current/groups'
  )
  return unwrapResponse(data)
}

export async function createTenantGroup(name: string) {
  const { data } = await request.post<ApiResponse<TenantGroup>>(
    '/v1/tenants/current/groups',
    { name }
  )
  return unwrapResponse(data)
}

export async function deleteTenantGroup(groupPublicId: string) {
  const { data } = await request.delete<ApiResponse<undefined>>(
    `/v1/tenants/current/groups/${groupPublicId}`
  )
  return unwrapResponse(data)
}

export async function updateTenantGroupName(
  groupPublicId: string,
  name: string
) {
  const { data } = await request.put<ApiResponse<TenantGroup>>(
    `/v1/tenants/current/groups/${groupPublicId}`,
    { name }
  )
  return unwrapResponse(data)
}

export async function addTenantGroupMember(
  groupPublicId: string,
  memberPublicIds: string[]
) {
  // 后端按完整成员列表覆盖；传空数组表示清空该分组成员。
  const { data } = await request.post<ApiResponse<TenantGroup>>(
    `/v1/tenants/current/groups/${groupPublicId}/members`,
    { member_public_ids: memberPublicIds }
  )
  return unwrapResponse(data)
}

export async function setTenantGroupLeader(
  groupPublicId: string,
  memberPublicId: string
) {
  const { data } = await request.put<ApiResponse<TenantGroup>>(
    `/v1/tenants/current/groups/${groupPublicId}/leader`,
    { member_public_id: memberPublicId }
  )
  return unwrapResponse(data)
}

export async function createTenantInvitation(rolePublicId: string) {
  const { data } = await request.post<ApiResponse<TenantInvitation>>(
    '/v1/tenants/current/invitations',
    { role_public_id: rolePublicId }
  )
  return unwrapResponse(data)
}

export async function getTenantInvitation(code: string) {
  const { data } = await request.get<ApiResponse<TenantInvitationPreview>>(
    `/v1/tenant-invitations/${code}`
  )
  return unwrapResponse(data)
}

export async function acceptTenantInvitation(code: string) {
  const { data } = await request.post<ApiResponse<SwitchTenantData>>(
    `/v1/tenant-invitations/${code}/accept`
  )
  return unwrapResponse(data)
}

export type TenantJoinRequestApplicant = {
  user_public_id: string
  nickname: string
  email: string
  avatar_url: string
}

export type TenantJoinRequest = {
  public_id: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | string
  created_at: string
  applicant: TenantJoinRequestApplicant
  role: TenantRole
}

export async function updateTenantJoinSettings(joinApprovalRequired: boolean) {
  const { data } = await request.put<ApiResponse<Tenant>>(
    '/v1/tenants/current/join-settings',
    { join_approval_required: joinApprovalRequired }
  )
  return unwrapResponse(data)
}

export async function listTenantJoinRequests(status = 'pending') {
  const { data } = await request.get<ApiResponse<TenantJoinRequest[]>>(
    '/v1/tenants/current/join-requests',
    { params: { status } }
  )
  return unwrapResponse(data)
}

export async function approveTenantJoinRequest(requestPublicId: string) {
  const { data } = await request.post<ApiResponse<TenantJoinRequest>>(
    `/v1/tenants/current/join-requests/${requestPublicId}/approve`
  )
  return unwrapResponse(data)
}

export async function rejectTenantJoinRequest(
  requestPublicId: string,
  reason = ''
) {
  const { data } = await request.post<ApiResponse<TenantJoinRequest>>(
    `/v1/tenants/current/join-requests/${requestPublicId}/reject`,
    { reason }
  )
  return unwrapResponse(data)
}

export { isJoinApprovalPendingMessage } from '@/utils/invitationJoinMessages'
