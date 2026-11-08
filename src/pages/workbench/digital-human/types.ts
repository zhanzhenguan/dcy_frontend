export type Gender = '全部' | '女' | '男' | '宠物'

export type Region = '全部' | '欧美' | '东南亚' | '东亚' | '拉美' | '中东/非洲'

export type Style =
  | '全部'
  | '商务'
  | '休闲'
  | '生活'
  | '运动'
  | '美妆'
  | '科技'
  | '电商'

export type SortOption = 'hot' | 'uses' | 'newest'

export interface AvatarItem {
  id: string
  name: string
  gender: 'female' | 'male' | 'pet'
  genderLabel: '女' | '男' | '宠物'
  region: '欧美' | '东南亚' | '东亚' | '拉美' | '中东/非洲'
  ageGroup: string
  avatarUrl?: string
  assetId?: string
  source?: 'seedance' | 'other'
  gradientBg: string
  avatarInitial: string
  styles: string[]
  languages: string[]
  isHot?: boolean
  isPro?: boolean
  isNew?: boolean
  description: string
  useCount: number
  rating: number
  sampleVoiceUrl?: string
  /** 订阅权限：当前用户是否可使用，false 时需要订阅升级。 */
  accessible?: boolean
  /** 最低订阅套餐的展示名称，为空表示免费全员可用。 */
  requiredPlanName?: string
}
