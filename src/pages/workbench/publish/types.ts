export type PlatformId =
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'amazon_live'
  | 'shopee'
  | 'xiaohongshu'
  | 'douyin'

export interface PlatformItem {
  id: PlatformId
  name: string
  accountHandle: string
  accountName: string
  accountAvatar?: string
  connected: boolean
  lastActiveTime?: string
  supportedFormats: string[]
  maxVideoDuration: string
  recommendedRatio: string
  description?: string
  badgeText?: string
}

export type PublishStep = 1 | 2 | 3 | 4

export interface ComplianceCheckItem {
  id: string
  title: string
  category: 'sensitive' | 'spec' | 'copyright' | 'policy'
  status: 'pending' | 'checking' | 'passed' | 'warning' | 'failed'
  message: string
  suggestion?: string
}

export interface VideoPublishContent {
  id: string
  title: string
  description: string
  tags: string[]
  coverUrl: string
  videoUrl: string
  duration: string
  resolution: string
  ratio: string
  fileSize: string
  createdAt: string
}

export interface PlatformPublishProgress {
  platformId: PlatformId
  platformName: string
  status:
    | 'queued'
    | 'session_check'
    | 'uploading'
    | 'submitting'
    | 'success'
    | 'failed'
  progress: number
  logs: string[]
  postUrl?: string
  postId?: string
  errorMessage?: string
}

export interface PublishHistoryRecord {
  id: string
  title: string
  coverUrl: string
  platforms: {
    platformId: PlatformId
    platformName: string
    status: 'success' | 'failed'
    postUrl?: string
  }[]
  publishedAt: string
  totalPlatforms: number
}
