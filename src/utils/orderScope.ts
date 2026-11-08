import type { OrderHistoryScope } from '@/services/api/orderApi'
import { normalizeTenantType } from '@/utils/tenantAccess'

/** 订单列表 scope：个人工作空间 PERSONAL；企业工作空间 ENTERPRISE（仅当前会话企业租户） */
export function resolveOrderHistoryScope(
  tenantType: unknown
): OrderHistoryScope {
  return normalizeTenantType(tenantType) === 'PERSONAL'
    ? 'PERSONAL'
    : 'ENTERPRISE'
}

/** /orders 页标题：与 scope 对应 */
export function resolveOrdersPageTitle(tenantType: unknown): string {
  return normalizeTenantType(tenantType) === 'PERSONAL'
    ? '我的订单'
    : '企业订单'
}
