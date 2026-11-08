import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  getModelCatalog,
  type ModelCatalogProvider,
} from '@/services/api/modelApi'
import {
  createVideoGeneration,
  type VideoDraft,
  type VideoGenerationTask,
} from '@/services/api/videoApi'
import { allowedRatiosForProvider } from '@/pages/workbench/create-video/components/modelRuleRatios'
import { allowedResolutionsForProvider } from '@/pages/workbench/create-video/components/modelRuleResolutions'
import type { VideoConfigState } from '@/pages/workbench/create-video/components/VideConfPane'
import {
  buildSeedanceRequest,
  createDefaultVideoConfig,
  parseCustomDraft,
} from '@/pages/workbench/create-video/components/cust-mate-flow/utils'

/** 与创作页工具栏一致的生成时长兜底 */
const FALLBACK_GENERATION_DURATION_MIN = 5
const FALLBACK_GENERATION_DURATION_MAX = 15

function resolvePromptText(draftData: ReturnType<typeof parseCustomDraft>) {
  if (draftData.customScriptContent?.trim()) {
    return draftData.customScriptContent.trim()
  }
  if (draftData.scriptContent?.trim()) {
    return draftData.scriptContent.trim()
  }
  const tab = draftData.selectedScriptTab
  const scripts = draftData.scripts ?? []
  if (tab && tab !== 'custom') {
    const matched = scripts.find((item) => item.id === tab)
    if (matched?.content?.trim()) return matched.content.trim()
  }
  return scripts.find((item) => item.content?.trim())?.content?.trim() || ''
}

function findProviderByModel(
  catalog: ModelCatalogProvider[],
  modelCode: string
) {
  const normalized = modelCode.trim().toLowerCase()
  if (!normalized) return undefined
  return catalog.find((group) =>
    group.models.some((model) => model.code.trim().toLowerCase() === normalized)
  )?.provider.code
}

function pickAllowedValue(
  preferred: string,
  allowed: string[],
  fallbackPreferred: string
) {
  if (allowed.length === 0) return preferred || fallbackPreferred
  const normalizedPreferred = preferred.trim().toLowerCase()
  if (normalizedPreferred && allowed.includes(normalizedPreferred)) {
    return normalizedPreferred
  }
  const normalizedFallback = fallbackPreferred.trim().toLowerCase()
  if (normalizedFallback && allowed.includes(normalizedFallback)) {
    return normalizedFallback
  }
  return allowed[0]
}

function readPositiveBound(raw: unknown) {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
}

function resolveDurationBound(value: number | undefined, fallback: number) {
  return value ?? fallback
}

function clampDuration(
  preferred: number,
  catalog: ModelCatalogProvider[],
  providerCode: string
) {
  const group = catalog.find(
    (item) =>
      item.provider.code.trim().toLowerCase() === providerCode.trim().toLowerCase()
  )
  const min = resolveDurationBound(
    readPositiveBound(group?.generation_limits.generation_duration_min),
    FALLBACK_GENERATION_DURATION_MIN
  )
  const max = Math.max(
    min,
    resolveDurationBound(
      readPositiveBound(group?.generation_limits.generation_duration_max),
      FALLBACK_GENERATION_DURATION_MAX
    )
  )
  const value = Number.isFinite(preferred) && preferred > 0 ? preferred : min
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** 与创作页一致：优先草稿配置，并用模型目录校正 provider / 比例 / 分辨率 / 时长 */
function resolveGenerateConfig(params: {
  draftConfig: Partial<VideoConfigState> | undefined
  task: VideoGenerationTask
  catalog: ModelCatalogProvider[]
}): VideoConfigState {
  const baseConfig = {
    ...createDefaultVideoConfig(),
    ...params.draftConfig,
  }
  const modelHint =
    baseConfig.model?.trim() || params.task.model?.trim() || ''
  const providerFromModel = findProviderByModel(params.catalog, modelHint)
  const providerCandidates = [
    baseConfig.provider,
    providerFromModel,
    params.task.provider,
  ]
    .map((item) => item?.trim() || '')
    .filter(Boolean)
  const provider =
    providerCandidates.find((code) =>
      params.catalog.some(
        (group) =>
          group.provider.code.trim().toLowerCase() === code.toLowerCase()
      )
    ) ||
    providerCandidates[0] ||
    'seedance'

  const allowedRatios = allowedRatiosForProvider(params.catalog, provider)
  const allowedResolutions = allowedResolutionsForProvider(
    params.catalog,
    provider
  )
  const preferredDuration =
    params.task.duration ||
    baseConfig.duration ||
    FALLBACK_GENERATION_DURATION_MAX

  return {
    ...baseConfig,
    provider,
    // 创作页提交只带 provider，不强制回传历史 model，避免旧模型规则拦截
    model: '',
    ratio: pickAllowedValue(
      params.task.ratio || baseConfig.ratio,
      allowedRatios,
      '9:16'
    ),
    resolution: pickAllowedValue(
      params.task.resolution || baseConfig.resolution,
      allowedResolutions,
      '480p'
    ),
    duration: clampDuration(preferredDuration, params.catalog, provider),
    platforms: params.task.platform?.trim()
      ? [params.task.platform.trim()]
      : baseConfig.platforms,
  }
}

export function useGenerateAgainFromDraft(options: {
  task: VideoGenerationTask | null
  draft: VideoDraft | undefined
  onSuccess?: (task: VideoGenerationTask) => void
}) {
  const { task, draft, onSuccess } = options
  const [generatingAgain, setGeneratingAgain] = useState(false)
  const snapshotJSON = task?.draft_data?.trim() || draft?.draft_data?.trim() || ''
  const draftData = useMemo(() => {
    if (task?.draft_data?.trim()) {
      return parseCustomDraft({
        creator_nickname: task.creator_nickname,
        id: task.id,
        mode: 'custom',
        current_step: 4,
        draft_data: task.draft_data,
        project_title: task.title || '',
        industry_name: task.industry || '',
        created_at: task.created_at,
        updated_at: task.updated_at,
      })
    }
    return parseCustomDraft(draft)
  }, [task, draft])
  const promptText = useMemo(() => resolvePromptText(draftData), [draftData])
  const materials = draftData.materials ?? []
  const referenceVideos = draftData.referenceVideos ?? []

  const canGenerateAgain =
    Boolean(snapshotJSON) &&
    Boolean(promptText) &&
    (task?.status === 'succeeded' || task?.status === 'failed')

  const handleGenerateAgain = async () => {
    if (!task || generatingAgain) return
    if (!snapshotJSON) {
      toast.error('向导数据尚未加载完成，请稍后重试')
      return
    }
    const referenceMode = draftData.referenceMode || 'all'
    const firstFrame = draftData.firstFrame ?? null
    if (referenceMode === 'frames' && !firstFrame) {
      toast.error('快照缺少首帧画面，无法再次生成')
      return
    }
    if (
      referenceMode === 'all' &&
      materials.length === 0 &&
      referenceVideos.length === 0
    ) {
      toast.error('快照缺少参考素材，无法再次生成')
      return
    }
    if (!promptText.trim()) {
      toast.error('快照缺少提示词，无法再次生成')
      return
    }

    setGeneratingAgain(true)
    try {
      const catalog = await getModelCatalog()
      const config = resolveGenerateConfig({
        draftConfig: draftData.config,
        task,
        catalog,
      })
      if (!config.provider) {
        throw new Error('当前没有可用的视频生成供应商')
      }

      const seedanceRequest = buildSeedanceRequest({
        projectTitle: task.title?.trim() || draft?.project_title || '',
        draftId: '',
        draftData: snapshotJSON,
        config,
        referenceMode,
        firstFrame,
        lastFrame: draftData.lastFrame ?? null,
        materials,
        referenceVideos,
        selectedHuman: draftData.selectedHuman ?? null,
        promptContent: promptText,
        useDigitalHumanAssetId: true,
        videoDraftID: undefined,
      })
      // 与创作页 handleSubmit 对齐：只传 provider + 请求体，不传历史 model
      const nextTask = await createVideoGeneration({
        provider: config.provider,
        industry: task.industry || draft?.industry_name || undefined,
        ...seedanceRequest,
      })
      toast.success('已创建生成视频任务')
      onSuccess?.(nextTask)
    } catch (error) {
      toast.error(getApiErrorMessage(error, '再次生成失败'))
    } finally {
      setGeneratingAgain(false)
    }
  }

  return {
    promptText,
    materials,
    generatingAgain,
    canGenerateAgain,
    handleGenerateAgain,
  }
}
