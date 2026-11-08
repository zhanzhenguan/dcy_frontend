import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  PlatformIcon,
  resolvePlatformId,
} from '@/pages/workbench/publish/components/PlatformIcons'
import {
  AtSign,
  Box,
  Check,
  Clock,
  Frame,
  LoaderCircle,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getApiErrorMessage } from '@/services/api/apiError'
import { listDeliveryPlatforms } from '@/services/api/deliveryPlatformApi'
import { getModelCatalog } from '@/services/api/modelApi'
import { getVariantsCount } from '@/services/api/systemSettingsApi'
import { listVideoLanguages } from '@/services/api/videoLanguageApi'
import { MentionImagePicker } from './MentionImagePicker'
import type { MentionAsset } from './MentionAssetsPanel'
import type { VideoConfigState } from './VideConfPane'
import { sortResolutionsAsc } from './VideoOutputSettings'
import { allowedRatiosForProvider } from './modelRuleRatios'
import { allowedResolutionsForProvider } from './modelRuleResolutions'
import { normalizePlatforms } from './platformOptions'
import { resolveDefaultVideoLanguage } from './videoLanguageDefault'

type ModelCatalogItem = {
  code: string
  name: string
  providerCode: string
  provider_name: string
  supported_resolutions?: string[]
  enhancement_resolutions?: string[]
  is_default?: boolean
  weight?: number
  generation_duration_min?: number
  generation_duration_max?: number
}

type ProviderOption = {
  code: string
  name: string
  description: string
  resolutions: string[]
  isDefault: boolean
  defaultModel?: string
  generationDurationMin?: number
  generationDurationMax?: number
}

type VideoStudioToolbarProps = {
  config: VideoConfigState
  onChange: (key: keyof VideoConfigState, value: unknown) => void
  referenceMode: 'all' | 'frames'
  onReferenceModeChange: (mode: 'all' | 'frames') => void
  /** 可选；默认直接请求 /v1/models/catalog */
  availableModels?: ModelCatalogItem[]
  userLocale?: string
  /** 当前已上传、可 @ 引用的素材（图片 / 视频 / 音频，顺序与上传一致） */
  currentImages?: MentionAsset[]
  onSelectMentionImage?: (asset: MentionAsset) => void
  onOpenDigitalHuman?: () => void
  selectedDigitalHuman?: { name: string; avatarUrl: string } | null
  onClearDigitalHuman?: () => void
  onGeneratePrompt?: () => void
  generatePromptPending?: boolean
  generatePromptDisabled?: boolean
  className?: string
}

const EMPTY: never[] = []
const EMPTY_DESCRIPTION: string = ''
const DEFAULT_RATIO = '9:16'
const DEFAULT_RESOLUTION = '480p'
/** 生成时长未配置（0=不限）时的 UI 回退 */
const FALLBACK_GENERATION_DURATION_MIN = 5
const FALLBACK_GENERATION_DURATION_MAX = 15

function resolveDurationBound(value: number | undefined, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback
}

function buildDurationTicks(_min: number, max: number) {
  // 刻度只展示 0、5 的倍数和 max，不单独标出 min（如 4）
  const ticks = new Set<number>([0, max])
  for (let tick = 5; tick < max; tick += 5) ticks.add(tick)
  return [...ticks]
    .filter((tick) => tick >= 0 && tick <= max)
    .sort((a, b) => a - b)
}

export const VideoStudioToolbar = ({
  config,
  onChange,
  referenceMode,
  onReferenceModeChange,
  availableModels,
  userLocale,
  currentImages,
  onSelectMentionImage,
  onOpenDigitalHuman,
  selectedDigitalHuman,
  onClearDigitalHuman,
  onGeneratePrompt,
  generatePromptPending,
  generatePromptDisabled,
  className,
}: VideoStudioToolbarProps) => {
  const deliveryPlatformsQuery = useQuery({
    queryKey: ['delivery-platforms'],
    queryFn: listDeliveryPlatforms,
  })
  const videoLanguagesQuery = useQuery({
    queryKey: ['video-languages'],
    queryFn: listVideoLanguages,
  })
  const variantsCountQuery = useQuery({
    queryKey: ['variants-count'],
    queryFn: getVariantsCount,
  })
  const catalogQuery = useQuery({
    queryKey: ['model-catalog'],
    queryFn: getModelCatalog,
  })
  const deliveryPlatforms = deliveryPlatformsQuery.data?.items ?? EMPTY
  const platformChoices = deliveryPlatforms.map((platform) => ({
    id: platform.id,
    name: platform.name,
    shortName: platform.short_name,
    iconUrl: platform.icon_url || '',
    platformIconId: resolvePlatformId(
      platform.id,
      platform.short_name,
      platform.name
    ),
  }))
  const videoLanguages = videoLanguagesQuery.data?.items ?? EMPTY

  const catalogModels = useMemo<ModelCatalogItem[]>(() => {
    const defaultModelMap = new Map<string, string>()
    const defaultFlagMap = new Map<string, boolean>()

    ;(catalogQuery.data ?? []).forEach((group) => {
      const providerCode = group.provider.code

      group.models
        .filter((item) => item.enabled && (item.weight ?? 1) > 0)
        .forEach((model) => {
          if (!defaultModelMap.has(providerCode)) {
            defaultModelMap.set(providerCode, model.code)
          }
          if (model.is_default && model.weight && (model.weight ?? 1) > 0) {
            defaultModelMap.set(providerCode, model.code)
            defaultFlagMap.set(providerCode, true)
          }
        })
    })

    const fromCatalog: ModelCatalogItem[] = (catalogQuery.data ?? []).flatMap(
      (group) =>
        group.models
          .filter((item) => item.enabled && (item.weight ?? 1) > 0)
          .map((item) => ({
            code: item.code,
            name: item.name,
            providerCode: group.provider.code,
            provider_name: group.provider.name,
            supported_resolutions: group.generation_limits.allowed_resolutions,
            is_default:
              Boolean(defaultFlagMap.get(group.provider.code)) &&
              item.code === defaultModelMap.get(group.provider.code),
            weight: item.weight,
            generation_duration_min:
              group.generation_limits.generation_duration_min,
            generation_duration_max:
              group.generation_limits.generation_duration_max,
          }))
    )
    if (fromCatalog.length > 0) return fromCatalog
    return (availableModels ?? []).filter((item) => (item.weight ?? 1) > 0)
  }, [availableModels, catalogQuery.data])

  const selectedModel = useMemo(() => {
    if (catalogModels.length === 0) return undefined
    if (config.model) {
      return catalogModels.find(
        (item) =>
          item.code === config.model &&
          (!config.provider || item.providerCode === config.provider)
      )
    }
    return catalogModels.find((item) => item.providerCode === config.provider)
  }, [catalogModels, config.model, config.provider])

  const providerOptions = useMemo<ProviderOption[]>(() => {
    const map = new Map<string, ProviderOption>()
    catalogModels.forEach((item) => {
      const existing = map.get(item.providerCode)
      if (existing) {
        const resolutions = new Set(existing.resolutions)
        item.supported_resolutions?.forEach((resolution) =>
          resolutions.add(resolution.toLowerCase())
        )
        existing.resolutions = [...resolutions]
        return
      }
      const resolutionSet = new Set<string>()
      item.supported_resolutions?.forEach((resolution) =>
        resolutionSet.add(resolution.toLowerCase())
      )
      map.set(item.providerCode, {
        code: item.providerCode,
        name: item.provider_name || item.providerCode,
        description: EMPTY_DESCRIPTION,
        resolutions: [...resolutionSet],
        isDefault: Boolean(item.is_default),
        defaultModel: item.code,
        generationDurationMin: item.generation_duration_min,
        generationDurationMax: item.generation_duration_max,
      })
    })
    return Array.from(map.values())
  }, [catalogModels])

  const defaultProvider =
    providerOptions.find((provider) => provider.isDefault) ?? providerOptions[0]

  const selectedPlatforms = useMemo(
    () => normalizePlatforms(config.platforms),
    [config.platforms]
  )
  const selectedPlatform = useMemo(() => {
    const selected = selectedPlatforms[0]?.trim().toLowerCase()
    if (!selected) return undefined
    return deliveryPlatforms.find((platform) =>
      [platform.id, platform.name, platform.short_name].some(
        (value) => value.toLowerCase() === selected
      )
    )
  }, [deliveryPlatforms, selectedPlatforms])

  /** 比例取当前供应商在全局或租户规则中的生效配置。 */
  const ratioOptions = useMemo(() => {
    return allowedRatiosForProvider(
      catalogQuery.data ?? [],
      config.provider || defaultProvider?.code || ''
    )
  }, [catalogQuery.data, config.provider, defaultProvider?.code])
  /** 分辨率取当前供应商在全局或租户规则中的生效配置。 */
  const resolutionOptions = useMemo(() => {
    return sortResolutionsAsc(
      allowedResolutionsForProvider(
        catalogQuery.data ?? [],
        config.provider || defaultProvider?.code || ''
      )
    )
  }, [catalogQuery.data, config.provider, defaultProvider?.code])
  /** 时长限制：providers 配置 > catalog 供应商字段；刻度从 0，可选 [min, max] */
  const generationDurationBounds = useMemo(() => {
    const providerCode = (
      config.provider ||
      defaultProvider?.code ||
      ''
    ).toLowerCase()

    const fromCatalogGroup = (catalogQuery.data ?? []).find(
      (item) => item.provider.code.toLowerCase() === providerCode
    )
    const fromProviderOption = providerOptions.find(
      (item) => item.code.toLowerCase() === providerCode
    )
    const fromSelectedModel = selectedModel

    const readBound = (raw: unknown) => {
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
    }

    const min = resolveDurationBound(
      readBound(fromCatalogGroup?.generation_limits.generation_duration_min) ??
        readBound(fromProviderOption?.generationDurationMin) ??
        readBound(fromSelectedModel?.generation_duration_min),
      FALLBACK_GENERATION_DURATION_MIN
    )
    const max = resolveDurationBound(
      readBound(fromCatalogGroup?.generation_limits.generation_duration_max) ??
        readBound(fromProviderOption?.generationDurationMax) ??
        readBound(fromSelectedModel?.generation_duration_max),
      FALLBACK_GENERATION_DURATION_MAX
    )
    return { min, max: Math.max(min, max) }
  }, [
    catalogQuery.data,
    config.provider,
    defaultProvider?.code,
    providerOptions,
    selectedModel,
  ])

  const durationOptions = useMemo(() => {
    const { min, max } = generationDurationBounds
    return Array.from({ length: max - min + 1 }, (_, index) => min + index)
  }, [generationDurationBounds])
  const variantOptions = useMemo(() => {
    const count = variantsCountQuery.data?.count ?? 0
    if (!Number.isSafeInteger(count) || count < 1) return EMPTY as number[]
    return Array.from({ length: count }, (_, index) => index + 1)
  }, [variantsCountQuery.data?.count])

  const selectProvider = (value: string) => {
    const provider = providerOptions.find((item) => item.code === value)
    if (!provider) return
    const defaultModelItem = catalogModels.find(
      (item) =>
        item.providerCode === provider.code &&
        ((item.is_default && (item.weight ?? 1) > 0) ||
          item.code === provider.defaultModel)
    )
    onChange('provider', provider.code)
    onChange('model', defaultModelItem?.code ?? provider.defaultModel ?? '')
    const current = config.resolution.toLowerCase()
    if (
      provider.resolutions.length > 0 &&
      !provider.resolutions.includes(current)
    ) {
      onChange(
        'resolution',
        provider.resolutions.includes(DEFAULT_RESOLUTION)
          ? DEFAULT_RESOLUTION
          : provider.resolutions[0]
      )
    }
  }

  useEffect(() => {
    if (platformChoices.length === 0) return
    if (selectedPlatform) return
    onChange('platforms', [platformChoices[0].name])
  }, [onChange, platformChoices, selectedPlatform])

  useEffect(() => {
    if (
      userLocale === undefined ||
      videoLanguages.length === 0 ||
      videoLanguages.some((language) => language.code === config.language)
    ) {
      return
    }
    const defaultLanguage = resolveDefaultVideoLanguage(
      userLocale,
      videoLanguages
    )
    if (defaultLanguage) onChange('language', defaultLanguage)
  }, [config.language, onChange, userLocale, videoLanguages])

  useEffect(() => {
    if (ratioOptions.length === 0 || ratioOptions.includes(config.ratio)) return
    onChange(
      'ratio',
      ratioOptions.includes(DEFAULT_RATIO) ? DEFAULT_RATIO : ratioOptions[0]
    )
  }, [config.ratio, onChange, ratioOptions])

  useEffect(() => {
    if (!defaultProvider) return
    if (config.provider) return
    selectProvider(defaultProvider.code)
  }, [config.provider, defaultProvider, selectProvider])

  useEffect(() => {
    if (resolutionOptions.length === 0) return
    const current = config.resolution.toLowerCase()
    if (resolutionOptions.includes(current)) return
    onChange(
      'resolution',
      resolutionOptions.includes(DEFAULT_RESOLUTION)
        ? DEFAULT_RESOLUTION
        : resolutionOptions[0]
    )
  }, [config.resolution, onChange, resolutionOptions])

  useEffect(() => {
    if (durationOptions.includes(config.duration)) return
    const preferred = generationDurationBounds.min
    onChange(
      'duration',
      durationOptions.includes(preferred)
        ? preferred
        : (durationOptions[0] ?? preferred)
    )
  }, [config.duration, durationOptions, generationDurationBounds.min, onChange])

  useEffect(() => {
    if (
      variantOptions.length === 0 ||
      variantOptions.includes(config.variantsCount)
    ) {
      return
    }
    onChange('variantsCount', variantOptions[0])
  }, [config.variantsCount, onChange, variantOptions])

  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverOpenRef = useRef(false)

  const [platformOpen, setPlatformOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [providerOpen, setProviderOpen] = useState(false)
  const [referenceOpen, setReferenceOpen] = useState(false)
  const [durationOpen, setDurationOpen] = useState(false)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [humanPreviewOpen, setHumanPreviewOpen] = useState(false)
  const humanPreviewCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const openHumanPreview = () => {
    if (humanPreviewCloseTimer.current) {
      clearTimeout(humanPreviewCloseTimer.current)
      humanPreviewCloseTimer.current = null
    }
    if (selectedDigitalHuman) setHumanPreviewOpen(true)
  }

  const scheduleCloseHumanPreview = () => {
    if (humanPreviewCloseTimer.current) {
      clearTimeout(humanPreviewCloseTimer.current)
    }
    humanPreviewCloseTimer.current = setTimeout(() => {
      setHumanPreviewOpen(false)
    }, 120)
  }

  const selectedPlatformChoice = selectedPlatform
    ? platformChoices.find((item) => item.id === selectedPlatform.id)
    : undefined
  const selectedPlatformName = selectedPlatform?.name ?? '平台'
  const selectedLanguage = videoLanguages.find(
    (item) => item.code === config.language
  )
  const selectedProvider =
    providerOptions.find((item) => item.code === config.provider) ??
    (selectedModel
      ? providerOptions.find((item) => item.code === selectedModel.providerCode)
      : undefined)
  const selectedProviderName =
    selectedProvider?.name || selectedModel?.provider_name || '模型'

  const formatResolutionLabel = (value: string) => {
    const lower = value.toLowerCase()
    if (lower === '4k') return '2K'
    if (lower === '2160p') return '4K'
    return value.toUpperCase()
  }

  const triggerClass =
    'inline-flex h-11! min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-white! px-3.5 text-sm font-medium text-foreground shadow-none! select-none transition-colors! hover:bg-black/10! hover:text-foreground focus-visible:ring-0 dark:bg-card! dark:hover:bg-white/15!'

  const menuContentClass =
    'w-[min(22rem,calc(100vw-2rem))] rounded-2xl border bg-white p-4 shadow-lg dark:bg-card'
  const optionListMenuClass =
    'w-60 min-w-60 max-w-60 overflow-hidden rounded-2xl border bg-white p-2 shadow-lg dark:bg-card'

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-b px-4 py-3.5 md:px-5 md:py-4',
        className
      )}
    >
      <Popover open={platformOpen} onOpenChange={setPlatformOpen}>
        <PopoverTrigger asChild>
          <button type='button' className={triggerClass} aria-label='平台'>
            <span className='inline-flex items-center gap-2'>
              {selectedPlatformChoice?.platformIconId ? (
                <PlatformIcon
                  platformId={selectedPlatformChoice.platformIconId}
                  className='size-4'
                />
              ) : selectedPlatformChoice?.iconUrl ? (
                <img
                  src={selectedPlatformChoice.iconUrl}
                  alt=''
                  className='size-4 shrink-0 object-contain'
                />
              ) : (
                <Frame className='size-4' />
              )}
              <span>{selectedPlatformName}</span>
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          sideOffset={8}
          className={optionListMenuClass}
        >
          <StudioOptionSection label='选择平台'>
            {platformChoices.map((platform) => {
              const selected = selectedPlatform?.id === platform.id
              return (
                <StudioOptionButton
                  key={platform.id}
                  selected={selected}
                  onClick={() => {
                    onChange('platforms', [platform.name])
                    setPlatformOpen(false)
                  }}
                >
                  {platform.platformIconId ? (
                    <PlatformIcon
                      platformId={platform.platformIconId}
                      className='size-4'
                    />
                  ) : platform.iconUrl ? (
                    <img
                      src={platform.iconUrl}
                      alt=''
                      className='size-4 shrink-0 rounded-sm object-contain'
                    />
                  ) : null}
                  {platform.name}
                </StudioOptionButton>
              )
            })}
          </StudioOptionSection>
        </PopoverContent>
      </Popover>

      <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
        <PopoverTrigger asChild>
          <button type='button' className={triggerClass} aria-label='语言'>
            {selectedLanguage ? (
              <span className='inline-flex items-center gap-2'>
                <span className='shrink-0 text-sm leading-none'>
                  {selectedLanguage.flag_emoji}
                </span>
                <span>{selectedLanguage.name}</span>
              </span>
            ) : (
              <span>语言</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          sideOffset={8}
          className={optionListMenuClass}
        >
          <StudioOptionSection label='选择语言'>
            {videoLanguages.map((language) => {
              const selected = config.language === language.code
              return (
                <StudioOptionButton
                  key={language.id}
                  selected={selected}
                  onClick={() => {
                    onChange('language', language.code)
                    setLanguageOpen(false)
                  }}
                >
                  {language.flag_emoji ? (
                    <span className='shrink-0'>{language.flag_emoji}</span>
                  ) : null}
                  {language.name}
                </StudioOptionButton>
              )
            })}
          </StudioOptionSection>
        </PopoverContent>
      </Popover>

      <Popover open={providerOpen} onOpenChange={setProviderOpen}>
        <PopoverTrigger asChild>
          <button
            type='button'
            className={cn(triggerClass, 'max-w-56')}
            aria-label='供应商'
          >
            <span className='inline-flex items-center gap-2'>
              <Box className='size-4' />
              <span className='truncate'>{selectedProviderName}</span>
              <Sparkles className='size-4' />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          sideOffset={8}
          className={optionListMenuClass}
        >
          <StudioOptionSection label='选择模型'>
            {providerOptions.map((provider) => {
              const selected = config.provider === provider.code
              return (
                <StudioOptionButton
                  key={provider.code}
                  selected={selected}
                  onClick={() => {
                    selectProvider(provider.code)
                    setProviderOpen(false)
                  }}
                >
                  {provider.name}
                </StudioOptionButton>
              )
            })}
          </StudioOptionSection>
        </PopoverContent>
      </Popover>

      <Popover open={referenceOpen} onOpenChange={setReferenceOpen}>
        <PopoverTrigger asChild>
          <button type='button' className={triggerClass} aria-label='参考模式'>
            <span className='inline-flex items-center gap-2'>
              <Sparkles className='size-4' />
              <span>{referenceMode === 'all' ? '全能参考' : '首尾帧'}</span>
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          sideOffset={8}
          className={optionListMenuClass}
        >
          <StudioOptionSection label='选择参考模式'>
            {(
              [
                { value: 'all', label: '全能参考' },
                { value: 'frames', label: '首尾帧' },
              ] as const
            ).map((item) => (
              <StudioOptionButton
                key={item.value}
                selected={referenceMode === item.value}
                onClick={() => {
                  onReferenceModeChange(item.value)
                  setReferenceOpen(false)
                }}
              >
                {item.label}
              </StudioOptionButton>
            ))}
          </StudioOptionSection>
        </PopoverContent>
      </Popover>

      <Popover
        open={popoverOpen}
        onOpenChange={(open) => {
          popoverOpenRef.current = open
          setPopoverOpen(open)
        }}
      >
        <PopoverTrigger asChild>
          <button
            type='button'
            className={cn(triggerClass, 'min-w-36')}
            aria-label='输出设置'
          >
            <RatioGlyph ratio={config.ratio || '16:9'} />
            <span>{config.ratio || '-'}</span>
            <span>
              {config.resolution
                ? formatResolutionLabel(config.resolution)
                : '-'}
            </span>
            <Sparkles className='size-4' />
            <span>{config.variantsCount || 1}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          sideOffset={8}
          className={menuContentClass}
        >
          <OutputSettingsPanel
            ratio={config.ratio}
            resolution={config.resolution}
            variantsCount={config.variantsCount}
            ratios={ratioOptions}
            resolutions={resolutionOptions}
            variantsCountOptions={variantOptions}
            onRatioChange={(value) => onChange('ratio', value)}
            onResolutionChange={(value) => onChange('resolution', value)}
            onVariantsCountChange={(value) => onChange('variantsCount', value)}
            formatResolutionLabel={formatResolutionLabel}
          />
        </PopoverContent>
      </Popover>

      <Popover open={durationOpen} onOpenChange={setDurationOpen}>
        <PopoverTrigger asChild>
          <button type='button' className={triggerClass} aria-label='视频时长'>
            <Clock className='size-4' />
            <span>{config.duration}s</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          sideOffset={8}
          className='dark:bg-card w-[min(22.5rem,calc(100vw-2rem))] overflow-visible rounded-2xl border bg-white px-5 py-4 shadow-lg'
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DurationSlider
            value={config.duration}
            min={generationDurationBounds.min}
            max={generationDurationBounds.max}
            onChange={(seconds) => onChange('duration', seconds)}
          />
        </PopoverContent>
      </Popover>

      <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
        <PopoverTrigger asChild>
          <button
            type='button'
            title='素材'
            className={cn(triggerClass, 'size-11 px-0')}
          >
            <AtSign className='size-4' />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align='end'
          sideOffset={10}
          className='w-60 overflow-hidden rounded-xl border p-0 shadow-lg'
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className='text-muted-foreground border-b px-3 py-2 text-xs font-medium'>
            可能@的内容
          </div>
          <MentionImagePicker
            assets={currentImages ?? []}
            onSelect={(asset) => {
              setMentionOpen(false)
              onSelectMentionImage?.(asset)
            }}
          />
        </PopoverContent>
      </Popover>
     

      <Popover
        open={Boolean(selectedDigitalHuman) && humanPreviewOpen}
        onOpenChange={(open) => {
          if (!selectedDigitalHuman) {
            setHumanPreviewOpen(false)
            return
          }
          setHumanPreviewOpen(open)
        }}
      >
        <PopoverTrigger asChild>
          <button
            type='button'
            title={
              selectedDigitalHuman
                ? `数字人：${selectedDigitalHuman.name}`
                : '选择数字人'
            }
            onClick={onOpenDigitalHuman}
            onMouseEnter={openHumanPreview}
            onMouseLeave={scheduleCloseHumanPreview}
            className={cn(triggerClass, 'relative size-11 px-0')}
          >
            <User className='size-4' />
            {selectedDigitalHuman ? (
              <span className='bg-primary dark:ring-card absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2 ring-white' />
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align='end'
          sideOffset={10}
          className='w-auto rounded-xl border p-2 shadow-lg'
          onOpenAutoFocus={(event) => event.preventDefault()}
          onMouseEnter={openHumanPreview}
          onMouseLeave={scheduleCloseHumanPreview}
        >
          {selectedDigitalHuman ? (
            <div className='group relative size-28 overflow-hidden rounded-lg'>
              <img
                src={selectedDigitalHuman.avatarUrl}
                alt={selectedDigitalHuman.name}
                className='size-full object-cover'
              />
              <button
                type='button'
                title='移除数字人'
                aria-label='移除数字人'
                className='absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100'
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setHumanPreviewOpen(false)
                  onClearDigitalHuman?.()
                }}
              >
                <X className='size-3.5' />
              </button>
              <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5'>
                <p className='truncate text-[11px] font-medium text-white'>
                  {selectedDigitalHuman.name}
                </p>
              </div>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      {onGeneratePrompt ? (
        <Button
          type='button'
          variant='outline'
          className='border-primary/40 text-primary hover:bg-primary/10! dark:bg-card! dark:hover:bg-primary/20! ms-auto inline-flex h-11! min-h-11 items-center justify-center gap-2 rounded-md border bg-white! px-3.5 text-sm font-medium shadow-none! transition-colors!'
          disabled={generatePromptDisabled || generatePromptPending}
          onClick={onGeneratePrompt}
        >
          {generatePromptPending ? (
            <LoaderCircle className='size-4 animate-spin' />
          ) : (
            <Sparkles className='size-4' />
          )}
          AI 生成提示词
        </Button>
      ) : null}

      {(deliveryPlatformsQuery.isError ||
        videoLanguagesQuery.isError ||
        variantsCountQuery.isError ||
        catalogQuery.isError ||
        (catalogModels.length === 0 &&
          !catalogQuery.isPending &&
          !deliveryPlatformsQuery.isPending)) && (
        <p className='text-destructive w-full text-[11px]'>
          配置加载失败：
          {getApiErrorMessage(
            catalogQuery.error ||
              deliveryPlatformsQuery.error ||
              videoLanguagesQuery.error ||
              variantsCountQuery.error
          ) || '请确认租户套餐与模型目录权限'}
        </p>
      )}
    </div>
  )
}

type DurationSliderProps = {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

function DurationSlider({
  value,
  min = FALLBACK_GENERATION_DURATION_MIN,
  max = FALLBACK_GENERATION_DURATION_MAX,
  onChange,
}: DurationSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [hoverForbidden, setHoverForbidden] = useState(false)
  const [hoverTrack, setHoverTrack] = useState(false)
  const safeMin = Math.max(0, Math.round(min))
  const safeMax = Math.max(safeMin, Math.round(max))
  const clamped = Math.min(safeMax, Math.max(safeMin, Math.round(value)))
  // 刻度从 0 起；拖动结果夹在 [safeMin, safeMax]
  const scaleMin = 0
  const span = Math.max(1, safeMax - scaleMin)
  const percent = ((clamped - scaleMin) / span) * 100
  const minPercent = ((safeMin - scaleMin) / span) * 100
  const ticks = buildDurationTicks(safeMin, safeMax)
  // 拖到最小/最大秒数时展示气泡提示
  const showBoundTip = dragging && (clamped === safeMin || clamped === safeMax)

  const isForbiddenClientX = (clientX: number) => {
    const track = trackRef.current
    if (!track || minPercent <= 0) return false
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return false
    const ratio = (clientX - rect.left) / rect.width
    return ratio * span + scaleMin < safeMin
  }

  const valueFromClientX = (clientX: number) => {
    const track = trackRef.current
    if (!track) return clamped
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return clamped
    const x = Math.min(rect.right, Math.max(rect.left, clientX))
    const ratio = (x - rect.left) / rect.width
    // 先按 0～max 连续取值，再限制到配置区间（如 4～15）
    const raw = scaleMin + ratio * span
    return Math.min(safeMax, Math.max(safeMin, Math.round(raw)))
  }

  const commit = (clientX: number) => {
    onChange(valueFromClientX(clientX))
  }

  useEffect(() => {
    if (value === clamped) return
    onChange(clamped)
  }, [clamped, onChange, value])

  return (
    <div className='w-full space-y-3'>
      <p className='text-[13px] leading-none text-[#8B95A5]'>
        选择视频生成时长
      </p>
      <div className='flex items-start gap-4'>
        <div className='min-w-0 flex-1 overflow-visible pt-3'>
          <div
            ref={trackRef}
            role='slider'
            tabIndex={0}
            aria-valuemin={safeMin}
            aria-valuemax={safeMax}
            aria-valuenow={clamped}
            aria-label='视频时长'
            className={cn(
              'relative h-7 touch-none select-none',
              hoverForbidden ? 'cursor-not-allowed' : 'cursor-pointer'
            )}
            onPointerDown={(event) => {
              draggingRef.current = true
              setDragging(true)
              setHoverTrack(true)
              setHoverForbidden(isForbiddenClientX(event.clientX))
              event.currentTarget.setPointerCapture(event.pointerId)
              commit(event.clientX)
            }}
            onPointerEnter={() => setHoverTrack(true)}
            onPointerMove={(event) => {
              setHoverTrack(true)
              setHoverForbidden(isForbiddenClientX(event.clientX))
              if (!draggingRef.current) return
              commit(event.clientX)
            }}
            onPointerLeave={() => {
              if (!draggingRef.current) {
                setHoverForbidden(false)
                setHoverTrack(false)
              }
            }}
            onPointerUp={(event) => {
              draggingRef.current = false
              setDragging(false)
              setHoverForbidden(isForbiddenClientX(event.clientX))
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
            }}
            onPointerCancel={() => {
              draggingRef.current = false
              setDragging(false)
              setHoverForbidden(false)
              setHoverTrack(false)
            }}
            onBlur={() => {
              draggingRef.current = false
              setDragging(false)
              setHoverForbidden(false)
              setHoverTrack(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault()
                onChange(Math.max(safeMin, clamped - 1))
              }
              if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault()
                onChange(Math.min(safeMax, clamped + 1))
              }
              if (event.key === 'Home') {
                event.preventDefault()
                onChange(safeMin)
              }
              if (event.key === 'End') {
                event.preventDefault()
                onChange(safeMax)
              }
            }}
          >
            {/* 拉到最小/最大秒数时的气泡提示 */}
            {showBoundTip ? (
              <div
                className='pointer-events-none absolute bottom-full z-20 mb-1.5 -translate-x-1/2'
                style={{ left: `${percent}%` }}
                role='status'
              >
                <div className='rounded-md bg-zinc-800 px-2.5 py-1.5 text-[11px] leading-none whitespace-nowrap text-white shadow-md'>
                  时长需在 {safeMin}–{safeMax} 秒之间
                </div>
                <div className='mx-auto h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-zinc-800' />
              </div>
            ) : null}
            {/* 轨道底色 */}
            <div className='pointer-events-none absolute top-1/2 right-0 left-0 h-2.5 -translate-y-1/2 rounded-full bg-[#F0F2F5]' />
            {/* 0 ~ 当前值：默认偏淡，hover 加深 */}
            <div
              className={cn(
                'pointer-events-none absolute top-1/2 left-0 h-2.5 -translate-y-1/2 rounded-full transition-colors',
                hoverTrack || hoverForbidden ? 'bg-[#7A8494]' : 'bg-[#C8CED8]'
              )}
              style={{ width: `${percent}%` }}
            />
            {/* 0 ~ min 不可选：hover 时再略深一点 */}
            {minPercent > 0 && hoverForbidden ? (
              <div
                className='pointer-events-none absolute top-1/2 left-0 h-2.5 -translate-y-1/2 rounded-l-full bg-[#5F6A7A]'
                style={{ width: `${minPercent}%` }}
              />
            ) : null}
            {ticks.map((tick) => {
              const tickPercent = ((tick - scaleMin) / span) * 100
              return (
                <span
                  key={tick}
                  className={cn(
                    'pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2',
                    tick < safeMin ? 'bg-black/10' : 'bg-black/15'
                  )}
                  style={{ left: `${tickPercent}%` }}
                />
              )
            })}
            <span
              className='pointer-events-none absolute top-1/2 z-10 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/5 bg-white shadow-sm'
              style={{ left: `${percent}%` }}
            />
          </div>
          <div className='pointer-events-none relative mt-1.5 h-4'>
            {ticks.map((tick) => {
              const tickPercent = ((tick - scaleMin) / span) * 100
              return (
                <span
                  key={tick}
                  className={cn(
                    'absolute top-0 -translate-x-1/2 text-[11px] leading-none tabular-nums',
                    tick < safeMin
                      ? 'text-muted-foreground/45'
                      : 'text-[#8B95A5]'
                  )}
                  style={{ left: `${tickPercent}%` }}
                >
                  {tick}
                </span>
              )
            })}
          </div>
        </div>
        <div className='mt-2 flex h-9 w-14 shrink-0 items-center justify-between rounded-lg bg-[#F0F2F5] px-2.5'>
          <span className='text-sm font-medium text-[#1F2329] tabular-nums'>
            {clamped}
          </span>
          <span className='text-xs text-[#8B95A5]'>s</span>
        </div>
      </div>
    </div>
  )
}

type OutputSettingsPanelProps = {
  ratio: string
  resolution: string
  variantsCount: number
  ratios: string[]
  resolutions: string[]
  variantsCountOptions: number[]
  onRatioChange: (value: string) => void
  onResolutionChange: (value: string) => void
  onVariantsCountChange: (value: number) => void
  formatResolutionLabel: (value: string) => string
}

function StudioOptionSection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <section className='space-y-1'>
      <p className='text-muted-foreground px-2 text-sm'>{label}</p>
      <div className='flex max-h-64 flex-col gap-0.5 overflow-y-auto'>
        {children}
      </div>
    </section>
  )
}

function StudioOptionButton({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'inline-flex h-10 w-full shrink-0 items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors',
        selected
          ? 'text-foreground bg-[rgb(246,248,251)] dark:bg-white/10'
          : 'text-foreground hover:bg-[rgb(246,248,251)] dark:hover:bg-white/10',
        className
      )}
    >
      <span className='inline-flex min-w-0 flex-1 items-center gap-2 truncate'>
        {children}
      </span>
      {selected ? (
        <Check className='size-4 shrink-0' strokeWidth={2.5} />
      ) : null}
    </button>
  )
}

function RatioGlyph({ ratio }: { ratio: string }) {
  const match = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(ratio.trim())
  const width = match ? Number(match[1]) : 16
  const height = match ? Number(match[2]) : 9
  const max = 12
  const scale = max / Math.max(width, height)
  const boxWidth = Math.max(5, Math.round(width * scale))
  const boxHeight = Math.max(5, Math.round(height * scale))

  return (
    <span
      className='inline-flex size-4 h-4 w-4 shrink-0 items-center justify-center'
      aria-hidden
    >
      <span
        className='border-foreground/80 block shrink-0 rounded-[2px] border'
        style={{ width: boxWidth, height: boxHeight }}
      />
    </span>
  )
}

function OutputSettingsPanel({
  ratio,
  resolution,
  variantsCount,
  ratios,
  resolutions,
  variantsCountOptions,
  onRatioChange,
  onResolutionChange,
  onVariantsCountChange,
  formatResolutionLabel,
}: OutputSettingsPanelProps) {
  return (
    <div className='space-y-4'>
      <section className='space-y-2'>
        <p className='text-muted-foreground text-sm'>选择比例</p>
        <div className='flex gap-1 rounded-2xl bg-[rgb(246,248,251)] p-1 dark:bg-white/10'>
          {ratios.map((item) => {
            const selected = ratio === item
            return (
              <button
                key={item}
                type='button'
                onClick={() => onRatioChange(item)}
                className={cn(
                  'flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] leading-none transition-colors',
                  selected
                    ? 'border-border text-foreground dark:bg-card border bg-white font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <RatioGlyph ratio={item} />
                <span className='flex h-3 items-center justify-center'>
                  {item}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className='space-y-2'>
        <p className='text-muted-foreground text-sm'>选择分辨率</p>
        <div className='flex gap-1 rounded-2xl bg-[rgb(246,248,251)] p-1 dark:bg-white/10'>
          {resolutions.map((item) => {
            const selected = resolution.toLowerCase() === item.toLowerCase()
            return (
              <button
                key={item}
                type='button'
                onClick={() => onResolutionChange(item)}
                className={cn(
                  'flex h-10 min-w-0 flex-1 items-center justify-center rounded-xl text-sm transition-colors',
                  selected
                    ? 'border-border text-foreground dark:bg-card border bg-white font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {formatResolutionLabel(item)}
              </button>
            )
          })}
        </div>
      </section>

      <section className='space-y-2'>
        <p className='text-muted-foreground text-sm'>选择生成数量</p>
        <div className='flex gap-1 rounded-2xl bg-[rgb(246,248,251)] p-1 dark:bg-white/10'>
          {variantsCountOptions.map((count) => {
            const selected = variantsCount === count
            return (
              <button
                key={count}
                type='button'
                onClick={() => onVariantsCountChange(count)}
                className={cn(
                  'flex h-10 min-w-0 flex-1 items-center justify-center rounded-xl text-sm transition-colors',
                  selected
                    ? 'border-border text-foreground dark:bg-card border bg-white font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {count}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
