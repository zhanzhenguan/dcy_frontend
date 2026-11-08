import type { Tenant } from '@/services/api/tenantApi'

export const normalizeTenantRole = (role: unknown): string => {
  if (typeof role === 'string') return role.trim().toLowerCase()
  if (role && typeof role === 'object') {
    if ('code' in role) {
      return String((role as { code: unknown }).code ?? '')
        .trim()
        .toLowerCase()
    }
    if ('name' in role) {
      return String((role as { name: unknown }).name ?? '')
        .trim()
        .toLowerCase()
    }
  }
  return ''
}

export const normalizeTenantType = (tenantType: unknown): string => {
  return typeof tenantType === 'string' ? tenantType.trim().toUpperCase() : ''
}

/** 兼容 tenant_type / tenantType */
export const getTenantType = (
  tenant: Pick<Tenant, 'tenant_type'> | null | undefined
): string => {
  if (!tenant) return ''
  const raw =
    tenant.tenant_type ??
    (tenant as { tenantType?: unknown }).tenantType
  return normalizeTenantType(raw)
}

/** 兼容 role / current_role、字符串与对象 */
export const getTenantRole = (tenant: Tenant | null | undefined): string => {
  if (!tenant) return ''
  const raw =
    tenant.role ?? (tenant as { current_role?: unknown }).current_role
  return normalizeTenantRole(raw)
}

export const isEnterpriseTenant = (
  tenant: Pick<Tenant, 'tenant_type'> | null | undefined
) => {
  return getTenantType(tenant) === 'ENTERPRISE'
}

/** owner / manager / leader — 可进企业成员、企业分组（须当前已切到企业） */
export const isEnterpriseStaffRole = (role: unknown) => {
  const code = normalizeTenantRole(role)
  return code === 'owner' || code === 'manager' || code === 'leader'
}

/** 企业普通成员（非 owner / manager / leader） */
export const isEnterpriseMemberRole = (role: unknown) => {
  return !isEnterpriseStaffRole(role)
}

/** owner / manager — 企业管理完整权限 */
export const isEnterpriseManagerRole = (role: unknown) => {
  const code = normalizeTenantRole(role)
  return code === 'owner' || code === 'manager'
}

/** 平台超级管理员（兼容接口返回 true / 1 / "1"） */
export const isSuperAdmin = (
  user: { is_super_admin?: boolean | number | string } | null | undefined
) => {
  const value = user?.is_super_admin
  return value === true || value === 1 || value === '1'
}

/** 仅看当前租户：个人账户看不到企业入口 */
export const isCurrentEnterpriseStaff = (
  tenant: Tenant | null | undefined
) => {
  return isEnterpriseTenant(tenant) && isEnterpriseStaffRole(tenant?.role)
}

/** 当前为企业普通成员 */
export const isCurrentEnterpriseMember = (
  tenant: Tenant | null | undefined
) => {
  return isEnterpriseTenant(tenant) && isEnterpriseMemberRole(tenant?.role)
}

export const isCurrentEnterpriseManager = (
  tenant: Tenant | null | undefined
) => {
  return isEnterpriseTenant(tenant) && isEnterpriseManagerRole(tenant?.role)
}

/** 当前是否为企业租户的 owner */
export const isCurrentEnterpriseOwner = (
  tenant: Tenant | null | undefined
) => {
  return isEnterpriseTenant(tenant) && getTenantRole(tenant) === 'owner'
}

/** session / 列表对齐后，当前上下文是否为企业 owner */
export const isEnterpriseOwnerInContext = (
  sessionTenant: Tenant | null | undefined,
  tenant: Tenant | null | undefined,
  tenants: Tenant[] | undefined
): boolean => {
  if (isCurrentEnterpriseOwner(sessionTenant)) return true
  if (isCurrentEnterpriseOwner(tenant)) return true
  const publicId = sessionTenant?.public_id ?? tenant?.public_id
  if (publicId && tenants?.length) {
    const fromList = tenants.find((item) => item.public_id === publicId)
    if (isCurrentEnterpriseOwner(fromList)) return true
  }
  return false
}

/** 订单历史 / 发票管理：个人租户均可；企业仅 owner */
export const canViewTenantOrderAndInvoice = (
  tenant: Tenant | null | undefined
) => {
  if (!tenant) return false
  if (!isEnterpriseTenant(tenant)) return true
  return isCurrentEnterpriseOwner(tenant)
}

/**
 * 发票管理页访问权限。
 * - 个人租户：始终允许（与 session 是否带 public_id、是否超管无关）
 * - 企业租户：仅 owner；超管不走租户发票页
 * 返回 null 表示企业权限仍依赖租户列表加载中。
 */
export const canViewInvoiceManagement = (
  user: { is_super_admin?: boolean | number | string } | null | undefined,
  sessionTenant: Tenant | null | undefined,
  tenants: Tenant[] | undefined,
  tenantsLoading = false
): boolean | null => {
  return canViewAccountBillingTabs(
    user,
    sessionTenant,
    tenants,
    tenantsLoading
  )
}

/**
 * 租户列表为权威来源，补全 session 中缺失或陈旧的 tenant_type / role。
 */
export const enrichTenantFromList = (
  tenant: Tenant | null | undefined,
  tenants: Tenant[] | undefined
): Tenant | null | undefined => {
  if (!tenant) return tenant
  const match = tenants?.find((item) => item.public_id === tenant.public_id)
  if (!match) return tenant

  const mergedType = getTenantType(match) ? getTenantType(match) : getTenantType(tenant)
  const mergedRole = getTenantRole(match) ? getTenantRole(match) : getTenantRole(tenant)

  return {
    ...tenant,
    ...match,
    tenant_type: (mergedType === 'ENTERPRISE'
      ? 'ENTERPRISE'
      : mergedType === 'PERSONAL'
        ? 'PERSONAL'
        : tenant.tenant_type) as Tenant['tenant_type'],
    role: (mergedRole === 'owner' ||
    mergedRole === 'manager' ||
    mergedRole === 'leader' ||
    mergedRole === 'member'
      ? mergedRole
      : tenant.role) as Tenant['role'],
    plan_id: tenant.plan_id || match.plan_id,
    plan_level_code: tenant.plan_level_code || match.plan_level_code,
    plan_level_name: tenant.plan_level_name || match.plan_level_name,
    billing_period: tenant.billing_period || match.billing_period,
  }
}

/** session 租户与 /v1/tenants 列表对齐（type、role 以列表为准） */
export const resolveActiveTenant = (
  sessionTenant: Tenant | null | undefined,
  tenants: Tenant[] | undefined
): Tenant | null | undefined => {
  return enrichTenantFromList(sessionTenant, tenants) ?? sessionTenant
}

export const resolveActiveTenantType = (
  sessionTenant: Tenant | null | undefined,
  tenants: Tenant[] | undefined
) => {
  const tenant = resolveActiveTenant(sessionTenant, tenants)
  return getTenantType(tenant) || getTenantType(sessionTenant)
}

export const findPersonalTenantInList = (tenants: Tenant[] | undefined) => {
  return tenants?.find(
    (item) => normalizeTenantType(item.tenant_type) === 'PERSONAL'
  )
}

/** 租户列表中用户为 owner 的企业租户（用于个人空间下提示切换） */
export const findEnterpriseOwnerTenantInList = (
  tenants: Tenant[] | undefined
) => {
  return tenants?.find(
    (item) => isEnterpriseTenant(item) && getTenantRole(item) === 'owner'
  )
}

/**
 * 账户中心 Tab（企业概览 / 企业订单 / 发票管理）是否可见。
 * 个人租户：始终允许；企业租户：仅 owner。
 */
export const canViewAccountBillingTabs = (
  _user: { is_super_admin?: boolean | number | string } | null | undefined,
  sessionTenant: Tenant | null | undefined,
  tenants: Tenant[] | undefined,
  tenantsLoading = false
): boolean | null => {
  const tenantType = resolveActiveTenantType(sessionTenant, tenants)

  if (tenantType === 'PERSONAL') return true

  const tenant = resolveActiveTenant(sessionTenant, tenants) ?? sessionTenant

  if (isEnterpriseOwnerInContext(sessionTenant, tenant, tenants)) return true

  if (!tenant && !sessionTenant) {
    return tenantsLoading ? null : false
  }

  if (tenantsLoading && !tenants) return null

  return false
}

export const findEnterpriseTenantInList = (
  tenants: Tenant[] | undefined,
  publicId?: string
) => {
  if (!tenants?.length) return undefined
  if (publicId) {
    const match = tenants.find(
      (item) =>
        item.public_id === publicId &&
        normalizeTenantType(item.tenant_type) === 'ENTERPRISE'
    )
    if (match) return match
  }
  return tenants.find(
    (item) => normalizeTenantType(item.tenant_type) === 'ENTERPRISE'
  )
}

/** @deprecated 请用 enrichTenantFromList */
export const enrichTenantRole = enrichTenantFromList

/**
 * 账户中心套餐 / 积分充值等计费能力：
 * 个人租户均可；企业租户仅 owner。
 * 企业其他角色仍可进个人中心，但仅设置资料 + 分享赚积分。
 */
export const canManageAccountBilling = (
  tenant: Tenant | null | undefined
) => {
  if (!tenant) return false
  if (!isEnterpriseTenant(tenant)) return true
  return getTenantRole(tenant) === 'owner'
}

/**
 * 企业非 owner 不可调用：积分明细、套餐购买 / 当前订阅等计费相关接口。
 * 个人租户均可。
 */
export const canAccessTenantBillingApis = (
  tenant: Tenant | null | undefined
) => {
  return canManageAccountBilling(tenant)
}

/** 套餐购买（目录、下单、当前订阅、取消续费） */
export const canPurchaseSubscription = (
  tenant: Tenant | null | undefined
) => {
  return canAccessTenantBillingApis(tenant)
}

/** 当前订阅详情 */
export const canViewCurrentSubscription = (
  tenant: Tenant | null | undefined
) => {
  return canAccessTenantBillingApis(tenant)
}

/** 积分账户 / 明细 / 批次 */
export const canViewCreditDetails = (
  tenant: Tenant | null | undefined
) => {
  return canAccessTenantBillingApis(tenant)
}
