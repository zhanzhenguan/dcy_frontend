import { extractCreativeFileKey } from '@/services/api/creativeApi'
import type { VideoDraft, VideoGenerationTask } from '@/services/api/videoApi'
import { normalizePlatforms } from '../../platformOptions'
import {
  loadActiveStudioSession,
  loadStudioSession,
  consumeReusePrompt,
} from '../../studioSession'
import { type VideoConfigState } from '../../VideConfPane'
import type { CustomDraftData, ReferenceVideo } from '../types'

export function createDefaultVideoConfig(): VideoConfigState {
  return {
    platforms: ['tiktok'],
    language: '',
    ratio: '9:16',
    resolution: '480p',
    duration: 15,
    provider: 'seedance',
    model: '',
    bgm: 'bgm-auto',
    bgmType: 'preset',
    customBgmFile: null,
    variantsCount: 1,
  }
}

/** 草稿中始终写入完整配置快照，避免缺字段 */
export function serializeVideoConfig(config: VideoConfigState): VideoConfigState {
  return {
    platforms: normalizePlatforms(config.platforms).length
      ? normalizePlatforms(config.platforms)
      : ['tiktok'],
    language: config.language ?? '',
    ratio: config.ratio || '9:16',
    resolution: config.resolution || '480p',
    duration: config.duration || 15,
    provider: config.provider || 'seedance',
    model: config.model ?? '',
    bgm: config.bgm || 'bgm-auto',
    bgmType: config.bgmType === 'custom' ? 'custom' : 'preset',
    customBgmFile: config.customBgmFile
      ? { name: config.customBgmFile.name, url: config.customBgmFile.url }
      : null,
    variantsCount: config.variantsCount || 1,
  }
}

export function parseCustomDraft(draft?: VideoDraft): CustomDraftData {
  if (!draft) return {}
  try {
    return normalizeCustomDraftData(
      JSON.parse(draft.draft_data) as CustomDraftData
    )
  } catch {
    return {}
  }
}

/** 自主上传路径才回填 file_key；已有素材库 assetId 时不从 preview url 推断 */
export function draftMediaFileKey(item: {
  url?: string
  file_key?: string
  fileKey?: string
  assetId?: string
}): string | undefined {
  const existing = item.file_key?.trim() || item.fileKey?.trim() || undefined
  if (existing) return existing
  if (item.assetId?.trim()) return undefined
  const key = extractCreativeFileKey(item.url ?? '')
  if (!key) return undefined
  if (!/(?:^|\/)(?:images|videos|audios|others)\/\d+\//.test(key)) {
    return undefined
  }
  return key
}

/** 兼容历史草稿：补齐 Tab/模式、素材名「图N」、productVideo → referenceVideos */
export function normalizeCustomDraftData(raw: CustomDraftData): CustomDraftData {
  const scripts = raw.scripts ?? []
  const materials = (raw.materials ?? []).map((item, index) => {
    const name = item.name?.trim() ?? ''
    const isDisplayName = /^图\d+$/.test(name)
    const assetId = item.assetId?.trim() || undefined
    return {
      ...item,
      name: isDisplayName ? name : `图${index + 1}`,
      file_key: draftMediaFileKey({ ...item, assetId }),
      assetId,
    }
  })

  const referenceVideos = (
    raw.referenceVideos?.length
      ? raw.referenceVideos
      : raw.productVideo
        ? [raw.productVideo]
        : []
  ).map((video) => {
    const assetId = video.assetId?.trim() || undefined
    return {
      ...video,
      file_key: draftMediaFileKey({ ...video, assetId }),
      assetId,
    }
  })

  let scriptContent = raw.scriptContent ?? ''
  let customScriptContent = raw.customScriptContent ?? ''
  let activeScriptMode = raw.activeScriptMode
  let selectedScriptTab = raw.selectedScriptTab

  if (!activeScriptMode) {
    if (selectedScriptTab === 'custom') {
      activeScriptMode = 'custom'
    } else if (scripts.length > 0 || scriptContent.trim()) {
      activeScriptMode = 'ai'
    } else if (
      raw.autoGenerateScripts === false ||
      customScriptContent.trim()
    ) {
      activeScriptMode = 'custom'
    } else {
      activeScriptMode = 'ai'
    }
  }

  if (!selectedScriptTab) {
    selectedScriptTab =
      activeScriptMode === 'custom' ? 'custom' : (scripts[0]?.id ?? 'custom')
  }

  if (
    selectedScriptTab !== 'custom' &&
    !scripts.some((script) => script.id === selectedScriptTab)
  ) {
    selectedScriptTab = scripts[0]?.id ?? 'custom'
    if (selectedScriptTab === 'custom') activeScriptMode = 'custom'
  }

  if (activeScriptMode === 'ai' && selectedScriptTab !== 'custom') {
    const matched = scripts.find((script) => script.id === selectedScriptTab)
    if (matched) scriptContent = matched.content
  } else if (
    activeScriptMode === 'custom' &&
    !customScriptContent.trim() &&
    scriptContent.trim() &&
    scripts.length === 0
  ) {
    customScriptContent = scriptContent
  }

  const config = raw.config
    ? serializeVideoConfig({
        ...createDefaultVideoConfig(),
        ...raw.config,
      })
    : undefined

  return {
    ...raw,
    materials,
    referenceVideos,
    scripts,
    scriptContent,
    customScriptContent,
    activeScriptMode,
    selectedScriptTab,
    autoGenerateScripts: raw.autoGenerateScripts ?? true,
    config,
  }
}

export function resolveStudioBootstrap(
  initialDraft: VideoDraft | undefined,
  userId: string,
  createAsNew: boolean
): {
  draftId: string
  projectTitle: string
  currentStep: 1 | 2 | 3 | 4
  data: CustomDraftData
  activeTasks: VideoGenerationTask[]
  source: 'create' | 'draft-server' | 'draft-session' | 'duplicate'
} {
  if (initialDraft?.id && createAsNew) {
    const step = initialDraft.current_step ?? 1
    return {
      draftId: '',
      projectTitle: initialDraft.project_title ?? '',
      currentStep: step >= 1 && step <= 4 ? (step as 1 | 2 | 3 | 4) : 1,
      data: parseCustomDraft(initialDraft),
      activeTasks: [],
      source: 'duplicate',
    }
  }

  if (initialDraft?.id) {
    const draftSession = loadStudioSession(userId, initialDraft.id)
    if (draftSession?.dirty && draftSession.draftId === initialDraft.id) {
      const step = draftSession.currentStep
      return {
        draftId: draftSession.draftId,
        projectTitle:
          draftSession.projectTitle ?? initialDraft.project_title ?? '',
        currentStep: step >= 1 && step <= 4 ? step : 1,
        data: normalizeCustomDraftData(
          draftSession.draftData as CustomDraftData
        ),
        activeTasks: draftSession.activeTasks ?? [],
        source: 'draft-session',
      }
    }

    const step = initialDraft.current_step ?? 1
    return {
      draftId: initialDraft.id,
      projectTitle: initialDraft.project_title ?? '',
      currentStep: step >= 1 && step <= 4 ? (step as 1 | 2 | 3 | 4) : 1,
      data: parseCustomDraft(initialDraft),
      activeTasks: [],
      source: 'draft-server',
    }
  }

  const createSession = loadActiveStudioSession(userId)
  const reusePrompt = consumeReusePrompt()
  if (createSession) {
    const step = createSession.currentStep
    const data = normalizeCustomDraftData(
      createSession.draftData as CustomDraftData
    )
    return {
      draftId: reusePrompt ? '' : (createSession.draftId ?? ''),
      projectTitle: reusePrompt ? '' : (createSession.projectTitle ?? ''),
      currentStep: reusePrompt
        ? 1
        : step >= 1 && step <= 4
          ? step
          : 1,
      data: reusePrompt
        ? {
            ...data,
            // 仅带入提示词；不沿用旧素材 / 脚本列表 / 数字人
            firstFrame: null,
            lastFrame: null,
            referenceVideos: [],
            productVideo: null,
            materials: [],
            activePreviewIndex: 0,
            selectedHuman: null,
            sellingPoints: '',
            activeScriptMode: 'custom',
            selectedScriptTab: 'custom',
            customScriptContent: reusePrompt,
            scriptContent: '',
            scripts: [],
            scriptSummary: '',
            autoGenerateScripts: false,
            // 配置用默认值，不带入资产侧规格
            config: createDefaultVideoConfig(),
          }
        : data,
      activeTasks: reusePrompt ? [] : (createSession.activeTasks ?? []),
      source: 'create',
    }
  }

  if (reusePrompt) {
    return {
      draftId: '',
      projectTitle: '',
      currentStep: 1,
      data: {
        activeScriptMode: 'custom',
        selectedScriptTab: 'custom',
        customScriptContent: reusePrompt,
        scriptContent: '',
        scripts: [],
        autoGenerateScripts: false,
        config: createDefaultVideoConfig(),
      },
      activeTasks: [],
      source: 'create',
    }
  }

  return {
    draftId: '',
    projectTitle: '',
    currentStep: 1,
    data: {},
    activeTasks: [],
    source: 'create',
  }
}

export function getInitialReferenceVideos(data: CustomDraftData): ReferenceVideo[] {
  if (data.referenceVideos?.length) {
    return data.referenceVideos
  }
  return data.productVideo ? [data.productVideo] : []
}
