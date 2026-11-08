import type { VideoDraft, VideoGenerationTask } from '@/services/api/videoApi'
import type { DigitalHuman } from '../DigiHumaPick'
import type { ScriptMode, ScriptTemplate } from '../ScriptSelector'
import type { VideoConfigState } from '../VideConfPane'

export type ModelCatalogItem = {
  code: string
  name: string
  providerCode: string
  provider_name: string
  supported_resolutions?: string[]
  is_default?: boolean
  weight?: number
  generation_duration_min?: number
  generation_duration_max?: number
}

export type ReferenceVideo = {
  id: string
  name: string
  url: string
  size: number
  duration: number
  frameUrls: string[]
  /** 本平台 OSS 对象键 */
  file_key?: string
  /** 活动素材库公开 ID */
  assetId?: string
  /** 本地预览上传中 */
  uploading?: boolean
}

export type ReferenceImage = {
  id: string
  url: string
  type: 'image' | 'video'
  /** 前端展示名：图1、图2…（与 OSS 存储名无关） */
  name: string
  /** 本平台 OSS 对象键 */
  file_key?: string
  /** 活动素材库公开 ID */
  assetId?: string
  /** 本地预览上传中 */
  uploading?: boolean
}

export type CustomMaterialFlowProps = {
  availableModels?: ModelCatalogItem[]
  creditBalance?: number
  onSuccessTask?: (task: VideoGenerationTask) => void
  initialDraft?: VideoDraft
  existingTaskId?: string
  createAsNew?: boolean
  initialHumanId?: string
  onStepChange?: (step: number) => void
  userLocale?: string
}

export type CustomDraftData = {
  referenceMode?: 'all' | 'frames'
  firstFrame?: string | null
  lastFrame?: string | null
  activeSuppTab?: 'video' | 'selling'
  sellingPoints?: string
  referenceVideos?: ReferenceVideo[]
  // 兼容历史草稿中的单个产品视频。
  productVideo?: ReferenceVideo | null
  materials?: ReferenceImage[]
  activePreviewIndex?: number
  selectedHuman?: DigitalHuman | null
  scriptContent?: string
  customScriptContent?: string
  activeScriptMode?: ScriptMode
  /** 当前高亮脚本 Tab：custom / script-1… */
  selectedScriptTab?: string
  scripts?: ScriptTemplate[]
  scriptSummary?: string
  autoGenerateScripts?: boolean
  /** 工具栏全部配置：平台、语言、模型、比例、分辨率、数量、时长、BGM 等 */
  config?: VideoConfigState
}
