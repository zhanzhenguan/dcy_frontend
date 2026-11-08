import type { Tenant } from '@/services/api/tenantApi'
import {
  isEnterpriseTenant,
  isSuperAdmin,
  normalizeTenantRole,
  normalizeTenantType,
  canViewTenantOrderAndInvoice,
} from '@/utils/tenantAccess'
import type { NavGroup, NavItem, NavLink } from './types'

/** 菜单可见性判定上下文（当前用户 + 当前租户） */
export type NavAccessContext = {
  user: { is_super_admin?: boolean | number | string } | null | undefined
  tenant: Tenant | null | undefined
  superAdmin: boolean
  isEnterpriseStaff: boolean
  isEnterpriseManager: boolean
}

export const buildNavAccessContext = (input: {
  user: NavAccessContext['user']
  tenant: Tenant | null | undefined
  isEnterpriseStaff: boolean
  isEnterpriseManager: boolean
}): NavAccessContext => {
  return {
    user: input.user,
    tenant: input.tenant,
    superAdmin: isSuperAdmin(input.user),
    isEnterpriseStaff: input.isEnterpriseStaff,
    isEnterpriseManager: input.isEnterpriseManager,
  }
}

/** 单条菜单是否对当前角色可见（无角色标记 = 公共入口） */
export const canSeeNavItem = (
  item: NavItem,
  ctx: NavAccessContext
): boolean => {
  if (item.superAdminOnly && !ctx.superAdmin) return false

  if (item.tenantManagerOnly) {
    const allowed = item.includeLeader
      ? ctx.isEnterpriseStaff
      : ctx.isEnterpriseManager
    if (!allowed) return false
  }

  if (item.tenantOwnerOnly) {
    if (
      !isEnterpriseTenant(ctx.tenant) ||
      normalizeTenantRole(ctx.tenant?.role) !== 'owner'
    ) {
      return false
    }
  }

  if (item.tenantOrderHistoryOnly) {
    if (ctx.superAdmin) return false
    if (!canViewTenantOrderAndInvoice(ctx.tenant)) return false
  }

  if (item.tenantInvoiceOnly) {
    const tenantType = normalizeTenantType(ctx.tenant?.tenant_type)
    if (tenantType === 'PERSONAL') return true
    if (ctx.superAdmin) return false
    if (!canViewTenantOrderAndInvoice(ctx.tenant)) return false
  }

  return true
}

const filterNavItems = (items: NavItem[], ctx: NavAccessContext) =>
  items.filter((item) => canSeeNavItem(item, ctx))

/**
 * 侧栏：公共模块 + 按角色过滤后的权限模块合并。
 * 空分组会去掉。
 */
export const resolveSidebarNavGroups = (
  commonGroups: NavGroup[],
  roleGroups: NavGroup[],
  ctx: NavAccessContext
): NavGroup[] => {
  const merge = [...commonGroups, ...roleGroups]
    .map((group) => ({
      ...group,
      items: filterNavItems(group.items, ctx),
    }))
    .filter((group) => group.items.length > 0)

  return merge
}

/**
 * 头像下拉「账户中心 / 个人中心」等：
 * - 公共项始终可见
 * - 角色项按权限合并
 * - 非企业 owner 时「账户中心」文案改为「个人中心」
 */
export const resolveAccountNavItems = (
  commonItems: NavItem[],
  roleItems: NavItem[],
  ctx: NavAccessContext
): NavLink[] => {
  const isPersonal =
    normalizeTenantType(ctx.tenant?.tenant_type) === 'PERSONAL'

  return [...commonItems, ...roleItems]
    .filter(
      (item): item is NavLink =>
        Boolean(item.url) && canSeeNavItem(item, ctx)
    )
    .map((item) => {
      if (item.url === '/profile') {
        return { ...item, title: isPersonal ? '个人中心' : '账户中心' }
      }
      // 个人用户：入口即「我的订单」（当前登录账号）
      if (item.url === '/orders' && isPersonal) {
        return { ...item, title: '我的订单' }
      }
      if (item.url === '/orders' && !isPersonal) {
        return { ...item, title: '企业订单' }
      }
      return item
    })
}
