import {
  Cpu,
  Folder,
  LayoutDashboard,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Brain,
  Plus,
  // MessageSquareText,
  // Music2,
  Tags,
  Coins,
  Megaphone,
  Languages,
  Settings2,
  UsersRound,
  ContactRound,
  ReceiptText,
  Gift,
  KeyRound,
  Building2,
  Images,
  ChartNoAxesColumnDecreasing,
  Clapperboard,
  Network,
  FileText,
  Ticket
} from 'lucide-react'

import { DEFAULT_USER_AVATAR } from '@/utils/user'
import { type SidebarData, type NavGroup, type NavItem } from '../types'

/**
 * 菜单配置约定：
 * - common*：所有登录角色都可见（图1 创作/资源；图2 账户中心入口）
 * - role*：按角色标记动态过滤后再合并进最终菜单
 * - 系统设置：superAdmin 专用，由 SystemSettingsNav 单独渲染
 * - 401/403/404/500/503：公共错误页路由，不进侧栏
 */

/** 所有人可见：创作 + 资源 */
export const commonNavGroups: NavGroup[] = [
  {
    title: '创作',
    items: [
      {
        title: '工作台',
        url: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: '创建视频',
        url: '/create',
        icon: Plus,
      },
      {
        title: '资产',
        url: '/tasks',
        icon: Folder,
      },
      {
        title: '直连发布',
        url: '/publish',
        icon: ChartNoAxesColumnDecreasing,
        comingSoon: true,
        badge: '敬请期待',
      },
    ],
  },
  {
    title: '资源',
    items: [
      {
        title: '数字人库',
        url: '/digital-human',
        icon: UserRound,
      },
      {
        title: '素材空间',
        url: '/asset-library',
        icon: Images,
      },
      {
        title: '灵感库',
        url: '/inspiration',
        icon: Brain,
        comingSoon: true,
        badge: '敬请期待',
      },
    ],
  }
  
]


/** 按角色动态合并：企业管理 / 团队成员等 */
export const roleNavGroups: NavGroup[] = [
  {
    title: '管理',
    items: [
      {
        title: '账号管理',
        url: '/account-management',
        icon: ContactRound,
      },
      {
        title: '企业设置',
        url: '/organization-settings',
        icon: Building2,
        tenantOwnerOnly: true,
      },
      {
        title: '团队成员',
        url: '/organization-team',
        icon: UsersRound,
        tenantManagerOnly: true,
        includeLeader: true,
      },
    ],
  },
]

/** 头像下拉：所有人可见（文案在 resolver 里按角色切换「账户中心/个人中心」） */
export const commonAccountNavItems: NavItem[] = [
  {
    title: '账户中心',
    url: '/profile',
    icon: UserRound,
  },
  {
    title: '我的优惠券',
    url: '/coupons',
    icon: Ticket,
  },
  {
    title: '兑换码',
    url: '/redeem',
    icon: Ticket,
  },
]

/** 头像下拉：按角色合并（如订单历史） */
export const roleAccountNavItems: NavItem[] = [
  {
    // 个人：我的订单 scope=PERSONAL；企业 owner：企业订单 scope=ENTERPRISE
    title: '企业订单',
    url: '/orders',
    icon: ReceiptText,
    tenantOrderHistoryOnly: true,
  },
]

/** @deprecated 兼容旧引用；请用 commonNavGroups + roleNavGroups + resolveSidebarNavGroups */
export const sidebarData: SidebarData = {
  user: {
    name: '用户',
    email: '',
    avatar: DEFAULT_USER_AVATAR,
  },
  teams: [
    {
      name: '大词源 AI',
      logo: Sparkles,
      plan: 'AI 视频生成平台',
    },
  ],
  navGroups: [...commonNavGroups, ...roleNavGroups],
}

/** @deprecated 请用 commonAccountNavItems + roleAccountNavItems */
export const accountCenterNavItems: NavItem[] = [
  ...commonAccountNavItems,
  ...roleAccountNavItems,
]

/** 超级管理员侧边栏底部「系统设置」菜单项 */
export const systemSettingsNavItems: NavItem[] = [
  {
    title: '模型配置',
    url: '/model-config',
    icon: Cpu,
    superAdminOnly: true,
  },
  {
    title: '租户模型规则',
    url: '/tenant-model-rules',
    icon: Network,
    superAdminOnly: true,
  },
  {
    title: '平台租户',
    url: '/admin-tenants',
    icon: Building2,
    superAdminOnly: true,
  },
  {
    title: '订阅配置',
    url: '/subscription-config',
    icon: SlidersHorizontal,
    superAdminOnly: true,
  },
  {
    title: '积分充值配置',
    url: '/credit-recharge-config',
    icon: Coins,
    superAdminOnly: true,
  },
  {
    title: '租户权益发放',
    url: '/tenant-entitlements',
    icon: Gift,
    superAdminOnly: true,
  },
  {
    title: '人工站内信',
    url: '/manual-messages',
    icon: Megaphone,
    superAdminOnly: true,
  },
  {
    title: '营销活动',
    url: '/marketing-campaigns-admin',
    icon: Gift,
    superAdminOnly: true,
  },
  {
    title: '优惠券中心',
    url: '/coupon-templates-admin',
    icon: Ticket,
    superAdminOnly: true,
  },
  {
    title: '兑换码中心',
    url: '/redeem-batches-admin',
    icon: Ticket,
    superAdminOnly: true,
  },
  {
    title: '全局注册码',
    url: '/global-invitation-codes',
    icon: KeyRound,
    superAdminOnly: true,
  },
  // {
  //   title: '提示词配置',
  //   url: '/prompt-config',
  //   icon: MessageSquareText,
  //   superAdminOnly: true,
  // },
  // {
  //   title: '背景音乐维护',
  //   url: '/background-music-admin',
  //   icon: Music2,
  //   superAdminOnly: true,
  // },
  {
    title: '数字人维护',
    url: '/digital-human-admin',
    icon: UserRound,
    superAdminOnly: true,
  },
  {
    title: '灵感库维护',
    url: '/inspiration-admin',
    icon: Brain,
    superAdminOnly: true,
  },
  {
    title: '行业维护',
    url: '/industry-admin',
    icon: Tags,
    superAdminOnly: true,
  },
  {
    title: '投放平台配置',
    url: '/delivery-platform-admin',
    icon: Megaphone,
    superAdminOnly: true,
  },
  {
    title: '视频语言配置',
    url: '/video-language-admin',
    icon: Languages,
    superAdminOnly: true,
  },
  {
    title: '系统常量维护',
    url: '/system-settings-admin',
    icon: Settings2,
    superAdminOnly: true,
  },
  {
    title: '视频生成记录',
    url: '/admin-video-generations',
    icon: Clapperboard,
    superAdminOnly: true,
  },
  {
    title: '支付订单',
    url: '/admin-payments',
    icon: ReceiptText,
    superAdminOnly: true,
  },
  {
    title: '发票管理',
    url: '/admin-invoices',
    icon: FileText,
    superAdminOnly: true,
  },
]
