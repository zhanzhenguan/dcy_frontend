import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listBackgroundMusics } from '@/services/api/backgroundMusicApi'
import { getModelCatalog } from '@/services/api/modelApi'
import { listDigitalHumans } from '@/services/api/digitalHumanApi'
import type { DigitalHuman } from '../../DigiHumaPick'
import type { VideoConfigState } from '../../VideConfPane'
import type { ModelCatalogItem, ReferenceImage, ReferenceVideo } from '../types'
import {
  formatLimit,
  resolveCountOrSizeBound,
  resolveDurationMaxBound,
  resolveDurationMinBound,
  resolveTotalDurationBound,
} from '../utils/index'

type UseCustMateCatalogParams = {
  availableModels: ModelCatalogItem[]
  config: VideoConfigState
  setConfig: React.Dispatch<React.SetStateAction<VideoConfigState>>
  materials: ReferenceImage[]
  setMaterials: React.Dispatch<React.SetStateAction<ReferenceImage[]>>
  referenceVideos: ReferenceVideo[]
  setReferenceVideos: React.Dispatch<React.SetStateAction<ReferenceVideo[]>>
  initialHumanId?: string
  onApplyInitialHuman?: (human: DigitalHuman) => void
}

export const useCustMateCatalog = ({
  availableModels,
  config,
  setConfig,
  materials,
  setMaterials,
  referenceVideos,
  setReferenceVideos,
  initialHumanId,
  onApplyInitialHuman,
}: UseCustMateCatalogParams) => {
  const appliedInitialHuman = useRef(false)

  const digitalHumanQuery = useQuery({
    queryKey: ['digital-humans', 'create-picker'],
    queryFn: () => listDigitalHumans({ page: 1, page_size: 100 }),
  })

  const backgroundMusicQuery = useQuery({
    queryKey: ['background-musics'],
    queryFn: listBackgroundMusics,
  })

  const catalogQuery = useQuery({
    queryKey: ['model-catalog'],
    queryFn: getModelCatalog,
  })

  const digitalHumans = useMemo<DigitalHuman[]>(
    () =>
      (digitalHumanQuery.data?.items ?? [])
        .filter(
          (item) =>
            item.accessible &&
            (item.gender === 'male' ||
              item.gender === 'female' ||
              item.gender === 'pet')
        )
        .map((item) => ({
          id: item.id,
          name: item.name,
          avatarUrl: item.avatar_url,
          assetId: item.asset_id,
          source: item.source,
          gender:
            item.gender === 'male' ? ('male' as const) : ('female' as const),
          category: 'daily' as const,
          tags: item.styles,
          recommended: item.is_hot,
        })),
    [digitalHumanQuery.data]
  )

  useEffect(() => {
    if (!initialHumanId || appliedInitialHuman.current || !onApplyInitialHuman)
      return
    const matched = digitalHumans.find((human) => human.id === initialHumanId)
    if (matched) {
      onApplyInitialHuman(matched)
      appliedInitialHuman.current = true
    }
  }, [initialHumanId, digitalHumans, onApplyInitialHuman])

  useEffect(() => {
    if (availableModels.length === 0) return
    const current = availableModels.find(
      (item) =>
        item.providerCode === config.provider &&
        (item.weight ?? 1) > 0 &&
        (!config.model || item.code === config.model)
    )
    if (current) return
    const preferred =
      availableModels.find(
        (item) => item.is_default && (item.weight ?? 1) > 0
      ) ?? availableModels.find((item) => (item.weight ?? 1) > 0)
    if (!preferred) return
    setConfig((previous) => ({
      ...previous,
      provider: preferred.providerCode,
      model: preferred.code,
    }))
  }, [availableModels, config.model, config.provider, setConfig])

  const referenceLimits = useMemo(() => {
    const groups = catalogQuery.data ?? []
    const providerCode = (config.provider || '').toLowerCase()
    const groupByCode = providerCode
      ? groups.find(
          (item) => item.provider.code.toLowerCase() === providerCode
        )
      : undefined
    const groupByModel =
      !groupByCode && config.model
        ? groups.find((item) =>
            item.models.some((model) => model.code === config.model)
          )
        : undefined
    const group = groupByCode ?? groupByModel
    const provider = group?.provider
    const limits = group?.generation_limits
    const imageMaxCount = resolveCountOrSizeBound(
      limits?.reference_image_max_count
    )
    const imageMaxSizeMb = resolveCountOrSizeBound(
      limits?.reference_image_max_mb
    )
    const videoMaxCount = resolveCountOrSizeBound(
      limits?.reference_video_max_count
    )
    const videoMin = resolveDurationMinBound(
      limits?.reference_video_duration_min
    )
    const videoMax = resolveDurationMaxBound(
      limits?.reference_video_duration_max
    )
    const singleMax =
      Number.isFinite(videoMax) && videoMax > 0
        ? Math.max(videoMin, videoMax)
        : videoMax
    const totalMax = resolveTotalDurationBound(
      limits?.reference_video_total_duration_max
    )
    return {
      providerCode: provider?.code ?? config.provider,
      providerName: provider?.name ?? '',
      imageMaxCount,
      imageMaxSizeMb,
      imageMaxSizeBytes: Number.isFinite(imageMaxSizeMb)
        ? imageMaxSizeMb * 1024 * 1024
        : Number.POSITIVE_INFINITY,
      videoMaxCount,
      videoMin,
      videoMax: singleMax,
      videoTotalMax: Number.isFinite(singleMax)
        ? Math.max(singleMax, totalMax)
        : totalMax,
    }
  }, [catalogQuery.data, config.model, config.provider])

  const maxReferenceImagesLimit = referenceLimits.imageMaxCount
  const maxReferenceVideosLimit = referenceLimits.videoMaxCount

  const referenceVideoLimits = {
    min: referenceLimits.videoMin,
    max: referenceLimits.videoMax,
    totalMax: referenceLimits.videoTotalMax,
  }

  const referenceContentHint = `可上传图片（最多 ${formatLimit(maxReferenceImagesLimit)} 张，单张不超过 ${formatLimit(referenceLimits.imageMaxSizeMb, 'MB')}），或参考视频（最多 ${formatLimit(maxReferenceVideosLimit)} 个，MP4/MOV；单段 ${
    referenceVideoLimits.min > 0
      ? `${referenceVideoLimits.min}–${formatLimit(referenceVideoLimits.max)}`
      : formatLimit(referenceVideoLimits.max)
  } 秒，总时长不超过 ${formatLimit(referenceVideoLimits.totalMax)} 秒）`

  const selectedBackgroundMusic = backgroundMusicQuery.data?.items.find(
    (item) => item.code === config.bgm
  )

  const providerLimitsKey = `${referenceLimits.providerCode}:${maxReferenceImagesLimit}:${maxReferenceVideosLimit}`
  const previousProviderLimitsKeyRef = useRef('')

  useEffect(() => {
    if (!catalogQuery.data?.length) return
    const previousKey = previousProviderLimitsKeyRef.current
    previousProviderLimitsKeyRef.current = providerLimitsKey
    if (!previousKey || previousKey === providerLimitsKey) return

    const nextMaterials =
      Number.isFinite(maxReferenceImagesLimit) &&
      materials.length > maxReferenceImagesLimit
        ? materials.slice(0, maxReferenceImagesLimit)
        : materials

    const nextVideos =
      Number.isFinite(maxReferenceVideosLimit) &&
      referenceVideos.length > maxReferenceVideosLimit
        ? referenceVideos.slice(0, maxReferenceVideosLimit)
        : referenceVideos

    const imagesChanged = nextMaterials.length !== materials.length
    const videosChanged =
      nextVideos.length !== referenceVideos.length ||
      nextVideos.some((video, index) => video.id !== referenceVideos[index]?.id)

    if (imagesChanged) setMaterials(nextMaterials)
    if (videosChanged) setReferenceVideos(nextVideos)
    if (imagesChanged || videosChanged) {
      toast.message(
        `已按${referenceLimits.providerName || '当前供应商'}限制调整参考素材`
      )
    }
  }, [
    catalogQuery.data?.length,
    materials,
    maxReferenceImagesLimit,
    maxReferenceVideosLimit,
    providerLimitsKey,
    referenceLimits.providerName,
    referenceVideos,
    setMaterials,
    setReferenceVideos,
  ])

  return {
    digitalHumanQuery,
    backgroundMusicQuery,
    catalogQuery,
    digitalHumans,
    referenceLimits,
    maxReferenceImagesLimit,
    maxReferenceVideosLimit,
    referenceVideoLimits,
    referenceContentHint,
    selectedBackgroundMusic,
  }
}
