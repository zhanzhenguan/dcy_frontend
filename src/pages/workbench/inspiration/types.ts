export type Platform =
  | 'TikTok'
  | 'Instagram'
  | 'Amazon'
  | 'Facebook'
  | 'YouTube'

export type Industry = string

export interface ScriptTimelineStep {
  timeframe: string
  title: string
  description: string
  technique: string
}

export interface ScriptBreakdown {
  hook: string
  targetAudience: string
  visualStyle: string
  sellingPoints: string[]
  timeline: ScriptTimelineStep[]
  fullScript: string
  aiPrompt: string
}

export interface InspirationItem {
  id: string
  brand: string
  brandCode: string
  brandBgColor?: string
  industry: Industry
  platform: Platform
  title: string
  creativeStrategy: string
  tags: string[]
  metrics: {
    views: string
    ctr: string
    duration: string
  }
  coverImage: string
  videoUrl?: string
  scriptBreakdown: ScriptBreakdown
}

export type SortOption = 'popular' | 'ctr' | 'latest'
