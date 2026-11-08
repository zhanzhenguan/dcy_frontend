import {
  canManageAccountBilling,
  findEnterpriseOwnerTenantInList,
  isEnterpriseOwnerInContext,
  isEnterpriseTenant,
} from '@/utils/tenantAccess'
import { useSessionTenant } from '@/hooks/useSessionTenant'

/** 个人中心 / 订单 / 发票 三页顶部 Tab 的文案与是否展示 */
export function useAccountBillingNav() {
  const { tenant, sessionTenant, isPersonal, tenantsQuery } = useSessionTenant()
  const isEnterprise = isEnterpriseTenant(tenant) || isEnterpriseTenant(sessionTenant)
  const isEnterpriseOwner = isEnterpriseOwnerInContext(
    sessionTenant,
    tenant,
    tenantsQuery.data
  )
  const canManageBilling = canManageAccountBilling(tenant)
  const enterpriseOwnerTenant = findEnterpriseOwnerTenantInList(
    tenantsQuery.data
  )
  /** 个人：三 Tab；企业 owner：企业概览 / 企业订单 / 发票管理 */
  const showTabs = isPersonal || isEnterpriseOwner
  const shellTitle = isEnterprise ? '账户中心' : '个人中心'
  const shellDescription = isEnterprise
    ? isEnterpriseOwner
      ? '企业信息 · 套餐管理 · 积分充值 · 分享赚积分'
      : '设置 · 分享赚积分'
    : canManageBilling
      ? '个人信息 · 套餐管理 · 积分充值 · 分享赚积分'
      : '设置 · 分享赚积分'
  const profileTabLabel = isEnterprise ? '企业概览' : '账户概览'
  const ordersLabel = isPersonal ? '我的订单' : '企业订单'

  return {
    showTabs,
    shellTitle,
    shellDescription,
    profileTabLabel,
    ordersLabel,
    isEnterprise,
    isEnterpriseOwner,
    isPersonal,
    tenant,
    sessionTenant,
    tenantsQuery,
    canManageBilling,
    enterpriseOwnerTenant,
  }
}
