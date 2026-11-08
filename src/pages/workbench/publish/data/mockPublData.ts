import {
  type PlatformItem,
  type VideoPublishContent,
  type ComplianceCheckItem,
  type PublishHistoryRecord,
} from '../types'

export const mockPlatforms: PlatformItem[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    accountHandle: '@PetGadgets_Official',
    accountName: 'PetGadgets Brand Account',
    connected: true,
    lastActiveTime: '10 分钟前',
    supportedFormats: ['MP4', 'MOV'],
    maxVideoDuration: '10分钟',
    recommendedRatio: '9:16',
    badgeText: '推荐平台',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    accountHandle: '@petgadgets',
    accountName: 'PetGadgets Official',
    connected: true,
    lastActiveTime: '2 小时前',
    supportedFormats: ['MP4', 'MOV'],
    maxVideoDuration: '15分钟',
    recommendedRatio: '9:16',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    accountHandle: 'PetGadgets Page',
    accountName: 'PetGadgets Business Page',
    connected: true,
    lastActiveTime: '昨天',
    supportedFormats: ['MP4', 'MOV'],
    maxVideoDuration: '240分钟',
    recommendedRatio: '9:16 / 16:9',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    accountHandle: '未连接 · 点击登录',
    accountName: 'YouTube Channel',
    connected: false,
    supportedFormats: ['MP4', 'MOV', 'AVI'],
    maxVideoDuration: '12小时',
    recommendedRatio: '16:9 / Shorts 9:16',
  },
  {
    id: 'amazon_live',
    name: 'Amazon Live',
    accountHandle: '未连接 · 点击登录',
    accountName: 'Amazon Storefront',
    connected: false,
    supportedFormats: ['MP4'],
    maxVideoDuration: '2小时',
    recommendedRatio: '16:9',
  },
  {
    id: 'shopee',
    name: 'Shopee 视频',
    accountHandle: '未连接 · 点击登录',
    accountName: 'Shopee Seller Center',
    connected: false,
    supportedFormats: ['MP4'],
    maxVideoDuration: '1分钟',
    recommendedRatio: '9:16',
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    accountHandle: '@PetGadgets极客萌宠',
    accountName: '小红书品牌号',
    connected: true,
    lastActiveTime: '30 分钟前',
    supportedFormats: ['MP4', 'MOV'],
    maxVideoDuration: '15分钟',
    recommendedRatio: '3:4 / 9:16',
  },
  {
    id: 'douyin',
    name: '抖音',
    accountHandle: '@PetGadgets萌宠科技',
    accountName: '抖音企业号',
    connected: true,
    lastActiveTime: '1 小时前',
    supportedFormats: ['MP4'],
    maxVideoDuration: '15分钟',
    recommendedRatio: '9:16',
  },
]

export const mockPresetVideos: VideoPublishContent[] = [
  {
    id: 'vid-001',
    title: '智能宠物饮水机爆款评测｜让爱宠爱上喝水！',
    description:
      '🐱🐶 还在担心宠物不爱喝水吗？这款智能饮水机拥有四重过滤和超静音水泵设计，轻松解决宠物饮水难题！全平台首发体验，快来get同款吧～ #宠物用品 #智能家居 #养宠干货 #萌宠日常',
    tags: ['宠物用品', '智能家居', '养宠干货', '萌宠日常', '新品爆款'],
    coverUrl:
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80',
    videoUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: '00:45',
    resolution: '1080x1920',
    ratio: '9:16',
    fileSize: '34.2 MB',
    createdAt: '2026-07-30 09:30',
  },
  {
    id: 'vid-002',
    title: '全自动猫砂盆开箱实测，解放双手的神器来了',
    description:
      '铲屎官终极福音！自动清理、除臭去味、多猫识别，智能App联动，出差再也不用担心主子！#铲屎官日常 #猫咪神器 #智能猫砂盆',
    tags: ['铲屎官日常', '猫咪神器', '智能猫砂盆', '养猫必备'],
    coverUrl:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop&q=80',
    videoUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: '01:12',
    resolution: '1080x1920',
    ratio: '9:16',
    fileSize: '58.7 MB',
    createdAt: '2026-07-29 16:20',
  },
  {
    id: 'vid-003',
    title: '数字人主播带货场景展示 - 户外智能遛狗绳',
    description:
      'AI数字人高真实感口播带货，高转化词包配置，智能多语种翻译一键直连发布！',
    tags: ['数字人带货', '宠物用品', '跨境电商'],
    coverUrl:
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80',
    videoUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    duration: '00:30',
    resolution: '1080x1920',
    ratio: '9:16',
    fileSize: '22.1 MB',
    createdAt: '2026-07-28 11:15',
  },
]

export const mockComplianceChecks: ComplianceCheckItem[] = [
  {
    id: 'check-1',
    title: '平台敏感词及违规词扫描',
    category: 'sensitive',
    status: 'passed',
    message: '未发现任何平台违规或禁限售用词',
    suggestion: '包含“首发”、“爆款”等吸引眼球词汇，符合推荐规范。',
  },
  {
    id: 'check-2',
    title: '视频画幅比例及清晰度适配',
    category: 'spec',
    status: 'passed',
    message: '视频分辨率为 1080x1920 (9:16)，Perfect Match！',
    suggestion: '完全符合 TikTok / Instagram Reels / 抖音短视频最佳播放规格。',
  },
  {
    id: 'check-3',
    title: '音频版权及无损音质检测',
    category: 'copyright',
    status: 'passed',
    message: '背景音效及配音拥有商业免版税授权',
    suggestion: '音量峰值在 -3dB 范畴，符合短视频人声清晰标准。',
  },
  {
    id: 'check-4',
    title: '平台社区规范及发布限制',
    category: 'policy',
    status: 'passed',
    message: '已配置多平台标签与说明文本，避免重复推流风险',
    suggestion: '针对不同平台建议补充局部专属话题标签。',
  },
]

export const mockPublishHistory: PublishHistoryRecord[] = [
  {
    id: 'hist-1',
    title: '智能宠物饮水机爆款评测｜让爱宠爱上喝水！',
    coverUrl:
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80',
    publishedAt: '2026-07-29 14:30',
    totalPlatforms: 3,
    platforms: [
      {
        platformId: 'tiktok',
        platformName: 'TikTok',
        status: 'success',
        postUrl: 'https://tiktok.com/@PetGadgets_Official/video/7391823',
      },
      {
        platformId: 'instagram',
        platformName: 'Instagram',
        status: 'success',
        postUrl: 'https://instagram.com/p/C9x8123/',
      },
      {
        platformId: 'facebook',
        platformName: 'Facebook',
        status: 'success',
        postUrl: 'https://facebook.com/PetGadgets/posts/10293',
      },
    ],
  },
  {
    id: 'hist-2',
    title: '全自动猫砂盆开箱实测，解放双手的神器来了',
    coverUrl:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&auto=format&fit=crop&q=80',
    publishedAt: '2026-07-27 18:00',
    totalPlatforms: 2,
    platforms: [
      {
        platformId: 'tiktok',
        platformName: 'TikTok',
        status: 'success',
        postUrl: 'https://tiktok.com/@PetGadgets_Official/video/7391111',
      },
      {
        platformId: 'xiaohongshu',
        platformName: '小红书',
        status: 'success',
        postUrl: 'https://xiaohongshu.com/discovery/item/66a123',
      },
    ],
  },
]
