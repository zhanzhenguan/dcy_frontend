import { type LinkProps } from '@tanstack/react-router'

type User = {
  name: string
  email: string
  avatar: string
}

type Team = {
  name: string
  logo: React.ElementType
  plan: string
}

type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
  /** 展示入口但不跳转（敬请期待） */
  comingSoon?: boolean
  superAdminOnly?: boolean
  /** 仅企业租户的 owner / manager 可见 */
  tenantManagerOnly?: boolean
  /** 配合 tenantManagerOnly：leader 也可看见 */
  includeLeader?: boolean
  tenantOwnerOnly?: boolean
  tenantOrderHistoryOnly?: boolean
  /** 与订单历史相同权限：个人租户 / 企业 owner */
  tenantInvoiceOnly?: boolean
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to'] | (string & {}) })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  items: NavItem[]
}

type SidebarData = {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink }
