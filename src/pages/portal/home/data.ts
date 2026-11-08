export type DateRange = '7d' | '30d' | '90d'
export type PlatformFilter = 'all' | 'tiktok' | 'instagram' | 'youtube' | 'amazon'
export type IndustryFilter =
  | 'all'
  | 'beauty'
  | 'electronics'
  | 'home'
  | 'fashion'

export type KpiMetric = {
  id: string
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  change: number
  trend: 'up' | 'down'
  description: string
  accent: 'blue' | 'purple' | 'green'
}

export type TrendPoint = {
  date: string
  plays: number
  orders: number
  gmv: number
}

export type ChannelStat = {
  channel: string
  plays: number
  ctr: number
  gmv: number
}

export type PlatformShare = {
  name: string
  value: number
  fill: string
}

export type CampaignRow = {
  id: string
  name: string
  platform: string
  industry: string
  plays: number
  ctr: number
  orders: number
  gmv: number
  roi: number
  status: 'active' | 'paused' | 'ended'
}

const trendByRange: Record<DateRange, TrendPoint[]> = {
  '7d': [
    { date: '03-01', plays: 182000, orders: 420, gmv: 38600 },
    { date: '03-02', plays: 196000, orders: 458, gmv: 41200 },
    { date: '03-03', plays: 210000, orders: 502, gmv: 44800 },
    { date: '03-04', plays: 188000, orders: 441, gmv: 40100 },
    { date: '03-05', plays: 234000, orders: 568, gmv: 51200 },
    { date: '03-06', plays: 256000, orders: 612, gmv: 55800 },
    { date: '03-07', plays: 278000, orders: 655, gmv: 60100 },
  ],
  '30d': [
    { date: 'W1', plays: 820000, orders: 1980, gmv: 178000 },
    { date: 'W2', plays: 910000, orders: 2210, gmv: 198500 },
    { date: 'W3', plays: 1020000, orders: 2480, gmv: 226000 },
    { date: 'W4', plays: 1180000, orders: 2860, gmv: 262000 },
  ],
  '90d': [
    { date: '1月', plays: 2400000, orders: 5800, gmv: 520000 },
    { date: '2月', plays: 2850000, orders: 6900, gmv: 610000 },
    { date: '3月', plays: 3200000, orders: 7800, gmv: 720000 },
  ],
}

const kpiByRange: Record<DateRange, KpiMetric[]> = {
  '7d': [
    {
      id: 'gmv',
      label: '成交额贡献',
      value: 332800,
      prefix: '¥',
      change: 18.4,
      trend: 'up',
      description: '近 7 日带货成交额',
      accent: 'green',
    },
    {
      id: 'plays',
      label: '总播放量',
      value: 1.54,
      suffix: 'M',
      decimals: 2,
      change: 12.7,
      trend: 'up',
      description: '全平台视频播放',
      accent: 'blue',
    },
    {
      id: 'ctr',
      label: '平均点击率',
      value: 5.4,
      suffix: '%',
      decimals: 1,
      change: 0.6,
      trend: 'up',
      description: '点击转化率',
      accent: 'purple',
    },
    {
      id: 'roi',
      label: '投放投产比',
      value: 4.7,
      suffix: 'x',
      decimals: 1,
      change: 8.2,
      trend: 'up',
      description: '投入产出比',
      accent: 'green',
    },
    {
      id: 'orders',
      label: '转化订单',
      value: 3656,
      suffix: '单',
      change: 15.3,
      trend: 'up',
      description: '归因成交订单',
      accent: 'blue',
    },
    {
      id: 'videos',
      label: '生成视频',
      value: 142,
      suffix: '条',
      change: 9.1,
      trend: 'up',
      description: '本周期 AI 出片量',
      accent: 'purple',
    },
  ],
  '30d': [
    {
      id: 'gmv',
      label: '成交额贡献',
      value: 864500,
      prefix: '¥',
      change: 22.1,
      trend: 'up',
      description: '近 30 日带货成交额',
      accent: 'green',
    },
    {
      id: 'plays',
      label: '总播放量',
      value: 3.93,
      suffix: 'M',
      decimals: 2,
      change: 16.8,
      trend: 'up',
      description: '全平台视频播放',
      accent: 'blue',
    },
    {
      id: 'ctr',
      label: '平均点击率',
      value: 5.1,
      suffix: '%',
      decimals: 1,
      change: 0.4,
      trend: 'up',
      description: '点击转化率',
      accent: 'purple',
    },
    {
      id: 'roi',
      label: '投放投产比',
      value: 4.5,
      suffix: 'x',
      decimals: 1,
      change: 6.4,
      trend: 'up',
      description: '投入产出比',
      accent: 'green',
    },
    {
      id: 'orders',
      label: '转化订单',
      value: 9530,
      suffix: '单',
      change: 19.6,
      trend: 'up',
      description: '归因成交订单',
      accent: 'blue',
    },
    {
      id: 'videos',
      label: '生成视频',
      value: 486,
      suffix: '条',
      change: 11.2,
      trend: 'up',
      description: '本周期 AI 出片量',
      accent: 'purple',
    },
  ],
  '90d': [
    {
      id: 'gmv',
      label: '成交额贡献',
      value: 1850000,
      prefix: '¥',
      change: 28.5,
      trend: 'up',
      description: '近 90 日带货成交额',
      accent: 'green',
    },
    {
      id: 'plays',
      label: '总播放量',
      value: 8.45,
      suffix: 'M',
      decimals: 2,
      change: 21.3,
      trend: 'up',
      description: '全平台视频播放',
      accent: 'blue',
    },
    {
      id: 'ctr',
      label: '平均点击率',
      value: 4.9,
      suffix: '%',
      decimals: 1,
      change: -0.2,
      trend: 'down',
      description: '点击转化率',
      accent: 'purple',
    },
    {
      id: 'roi',
      label: '投放投产比',
      value: 4.3,
      suffix: 'x',
      decimals: 1,
      change: 4.1,
      trend: 'up',
      description: '投入产出比',
      accent: 'green',
    },
    {
      id: 'orders',
      label: '转化订单',
      value: 20500,
      suffix: '单',
      change: 24.8,
      trend: 'up',
      description: '归因成交订单',
      accent: 'blue',
    },
    {
      id: 'videos',
      label: '生成视频',
      value: 1280,
      suffix: '条',
      change: 14.6,
      trend: 'up',
      description: '本周期 AI 出片量',
      accent: 'purple',
    },
  ],
}

export const channelStats: ChannelStat[] = [
  { channel: 'TikTok', plays: 1280000, ctr: 6.2, gmv: 286000 },
  { channel: 'Instagram', plays: 860000, ctr: 4.8, gmv: 198000 },
  { channel: 'YouTube', plays: 640000, ctr: 3.9, gmv: 152000 },
  { channel: 'Amazon', plays: 420000, ctr: 5.6, gmv: 228000 },
  { channel: 'Shopee', plays: 310000, ctr: 5.1, gmv: 98000 },
]

export const platformShare: PlatformShare[] = [
  { name: 'TikTok', value: 36, fill: 'var(--portal-blue)' },
  { name: 'Instagram', value: 24, fill: 'var(--portal-purple)' },
  { name: 'YouTube', value: 18, fill: 'var(--portal-green)' },
  { name: 'Amazon', value: 14, fill: 'var(--portal-sky)' },
  { name: '其他', value: 8, fill: 'var(--portal-violet)' },
]

export const campaigns: CampaignRow[] = [
  {
    id: 'c1',
    name: '春季美妆爆款 · EN',
    platform: 'TikTok',
    industry: 'beauty',
    plays: 428000,
    ctr: 6.8,
    orders: 1240,
    gmv: 98600,
    roi: 5.2,
    status: 'active',
  },
  {
    id: 'c2',
    name: '智能耳机对比种草',
    platform: 'YouTube',
    industry: 'electronics',
    plays: 312000,
    ctr: 4.1,
    orders: 680,
    gmv: 152400,
    roi: 4.6,
    status: 'active',
  },
  {
    id: 'c3',
    name: '家居收纳 · 多语言',
    platform: 'Instagram',
    industry: 'home',
    plays: 198000,
    ctr: 5.3,
    orders: 520,
    gmv: 62400,
    roi: 3.9,
    status: 'paused',
  },
  {
    id: 'c4',
    name: '服饰穿搭 Lookbook',
    platform: 'TikTok',
    industry: 'fashion',
    plays: 556000,
    ctr: 7.2,
    orders: 1680,
    gmv: 134200,
    roi: 5.8,
    status: 'active',
  },
  {
    id: 'c5',
    name: 'Amazon PDP 转化片',
    platform: 'Amazon',
    industry: 'electronics',
    plays: 142000,
    ctr: 5.9,
    orders: 890,
    gmv: 186500,
    roi: 6.1,
    status: 'ended',
  },
  {
    id: 'c6',
    name: '护肤成分科普 · ES',
    platform: 'Instagram',
    industry: 'beauty',
    plays: 176000,
    ctr: 4.6,
    orders: 410,
    gmv: 48200,
    roi: 3.4,
    status: 'active',
  },
  {
    id: 'c7',
    name: '快时尚新品上架',
    platform: 'TikTok',
    industry: 'fashion',
    plays: 390000,
    ctr: 6.1,
    orders: 1120,
    gmv: 89200,
    roi: 4.9,
    status: 'active',
  },
  {
    id: 'c8',
    name: '厨房小家电测评',
    platform: 'YouTube',
    industry: 'home',
    plays: 224000,
    ctr: 3.7,
    orders: 360,
    gmv: 71800,
    roi: 3.2,
    status: 'paused',
  },
]

export const industryTabs = [
  { value: 'all' as const, label: '全部行业' },
  { value: 'beauty' as const, label: '美妆个护' },
  { value: 'electronics' as const, label: '消费电子' },
  { value: 'home' as const, label: '家居生活' },
  { value: 'fashion' as const, label: '服饰时尚' },
]

export const platformOptions = [
  { value: 'all' as const, label: '全部平台' },
  { value: 'tiktok' as const, label: 'TikTok' },
  { value: 'instagram' as const, label: 'Instagram' },
  { value: 'youtube' as const, label: 'YouTube' },
  { value: 'amazon' as const, label: 'Amazon' },
]

export const dateRangeOptions = [
  { value: '7d' as const, label: '近 7 日' },
  { value: '30d' as const, label: '近 30 日' },
  { value: '90d' as const, label: '近 90 日' },
]

export const trustLogos = [
  'TikTok Shop',
  'Amazon',
  'Shopee',
  'Instagram',
  'YouTube',
  'Lazada',
]

export function getTrendData(range: DateRange) {
  return trendByRange[range]
}

export function getKpiMetrics(range: DateRange) {
  return kpiByRange[range]
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(value)
}
