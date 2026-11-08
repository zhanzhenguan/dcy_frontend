import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sliders, Sparkles, Upload, Music, X, Clock, Film } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getApiErrorMessage } from '@/services/api/apiError'
import { listDeliveryPlatforms } from '@/services/api/deliveryPlatformApi'
import { getModelCatalog } from '@/services/api/modelApi'
import { getVariantsCount } from '@/services/api/systemSettingsApi'
import { listVideoLanguages } from '@/services/api/videoLanguageApi'
import { sortResolutionsAsc } from './VideoOutputSettings'
import { allowedRatiosForProvider } from './modelRuleRatios'
import { normalizePlatforms } from './platformOptions'
import { resolveDefaultVideoLanguage } from './videoLanguageDefault'

export type VideoConfigState = {
  /** 投放平台，使用数组兼容历史草稿；当前界面仅允许单选。 */
  platforms: string[]
  language: string
  ratio: string
  resolution: string
  duration: number
  provider: string
  model: string
  bgm: string
  bgmType: 'preset' | 'custom'
  customBgmFile?: { name: string; url: string } | null
  variantsCount: number
}

type VideoConfigPanelProps = {
  config: VideoConfigState
  onChange: (key: keyof VideoConfigState, value: unknown) => void
  availableModels?: Array<{
    code: string
    name: string
    providerCode: string
    provider_name: string
    supported_resolutions?: string[]
    is_default?: boolean
    weight?: number
  }>
  estimatedCredits?: number
  onUploadAudio?: (file: File) => Promise<{ name: string; url: string }>
  unsupportedResolutions?: string[]
  backgroundMusics?: Array<{ code: string; name: string }>
  userLocale?: string
}

const bgmNoneOption = { id: 'bgm-none', name: '无背景音乐' }
const bgmAutoOption = { id: 'bgm-auto', name: 'AI自动生成' }
const bgmCustomOption = { id: 'custom', name: '自行上传背景音乐...' }
const EMPTY_COLLECTION: never[] = []

export const VideoConfigPanel = ({
  config,
  onChange,
  availableModels = [],
  estimatedCredits = 0,
  onUploadAudio,
  unsupportedResolutions = [],
  backgroundMusics = [],
  userLocale,
}: VideoConfigPanelProps) => {
  const [audioUploading, setAudioUploading] = useState(false)
  const deliveryPlatformsQuery = useQuery({
    queryKey: ['delivery-platforms'],
    queryFn: listDeliveryPlatforms,
  })
  const catalogQuery = useQuery({
    queryKey: ['model-catalog'],
    queryFn: getModelCatalog,
  })
  const videoLanguagesQuery = useQuery({
    queryKey: ['video-languages'],
    queryFn: listVideoLanguages,
  })
  const variantsCountQuery = useQuery({
    queryKey: ['variants-count'],
    queryFn: getVariantsCount,
  })
  const deliveryPlatforms =
    deliveryPlatformsQuery.data?.items ?? EMPTY_COLLECTION
  const videoLanguages = videoLanguagesQuery.data?.items ?? EMPTY_COLLECTION

  const providerOptions = useMemo(() => {
    const catalogProviders = (catalogQuery.data ?? []).filter((group) =>
      group.models.some((model) => model.enabled && (model.weight ?? 1) > 0)
    )
    if (catalogProviders.length > 0) {
      return catalogProviders.map((group) => ({
        code: group.provider.code,
        name: group.provider.name,
        resolutions: group.generation_limits.allowed_resolutions.map((item) =>
          item.trim().toLowerCase()
        ),
        isDefault: group.models.some(
          (model) => model.is_default && (model.weight ?? 1) > 0
        ),
      }))
    }
    const providers = new Map<
      string,
      { code: string; name: string; resolutions: string[]; isDefault: boolean }
    >()
    availableModels
      .filter((item) => (item.weight ?? 1) > 0)
      .forEach((item) => {
        const current = providers.get(item.providerCode)
        const resolutions = new Set(current?.resolutions ?? [])
        item.supported_resolutions?.forEach((resolution) =>
          resolutions.add(resolution.toLowerCase())
        )
        providers.set(item.providerCode, {
          code: item.providerCode,
          name: item.provider_name,
          resolutions: [...resolutions],
          isDefault: Boolean(current?.isDefault || item.is_default),
        })
      })
    return [...providers.values()]
  }, [availableModels, catalogQuery.data])
  const selectedProvider = providerOptions.find(
    (provider) => provider.code === config.provider
  )
  const availableResolutions = sortResolutionsAsc(
    (selectedProvider?.resolutions ?? [])
      .filter(
        (resolution) =>
          !unsupportedResolutions.includes(resolution) && Boolean(resolution)
      )
      .map((item) => item.trim().toLowerCase())
  )

  const defaultProvider = useMemo(
    () =>
      providerOptions.find((provider) => provider.isDefault) ??
      providerOptions[0],
    [providerOptions]
  )

  const totalCredits = estimatedCredits * (config.variantsCount || 1)
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
  const allowedRatios = useMemo(
    () =>
      allowedRatiosForProvider(
        catalogQuery.data ?? [],
        selectedProvider?.code ?? config.provider
      ),
    [catalogQuery.data, config.provider, selectedProvider?.code]
  )
  const variantOptions = useMemo(() => {
    const count = variantsCountQuery.data?.count ?? 0
    if (!Number.isSafeInteger(count) || count < 1) return []
    return Array.from({ length: count }, (_, index) => index + 1)
  }, [variantsCountQuery.data?.count])
  const platformSelect = (name: string) => {
    onChange('platforms', [name])
  }

  useEffect(() => {
    if (
      deliveryPlatforms.length === 0 ||
      selectedPlatform ||
      selectedPlatforms.length > 0
    ) {
      return
    }
    onChange('platforms', [deliveryPlatforms[0].name])
  }, [deliveryPlatforms, onChange, selectedPlatform, selectedPlatforms.length])

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
    if (allowedRatios.length === 0 || allowedRatios.includes(config.ratio)) {
      return
    }
    onChange(
      'ratio',
      allowedRatios.includes('9:16') ? '9:16' : allowedRatios[0]
    )
  }, [allowedRatios, config.ratio, onChange])

  useEffect(() => {
    if (
      variantOptions.length === 0 ||
      variantOptions.includes(config.variantsCount)
    ) {
      return
    }
    onChange('variantsCount', variantOptions[0])
  }, [config.variantsCount, onChange, variantOptions])

  useEffect(() => {
    if (!defaultProvider) return
    if (!selectedProvider) onChange('provider', defaultProvider.code)
    if (config.model) onChange('model', '')
  }, [config.model, defaultProvider, onChange, selectedProvider])

  useEffect(() => {
    if (
      availableResolutions.length === 0 ||
      availableResolutions.includes(config.resolution.toLowerCase())
    ) {
      return
    }
    onChange(
      'resolution',
      availableResolutions.includes('720p') ? '720p' : availableResolutions[0]
    )
  }, [availableResolutions, config.resolution, onChange])

  const handleCustomBgmUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    setAudioUploading(true)
    try {
      const uploaded = onUploadAudio
        ? await onUploadAudio(file)
        : { name: file.name, url: URL.createObjectURL(file) }
      onChange('bgmType', 'custom')
      onChange('bgm', 'custom')
      onChange('customBgmFile', uploaded)
      toast.success(`成功上传自定义背景音乐: ${file.name}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '背景音乐上传失败')
    } finally {
      setAudioUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className='bg-card space-y-5 rounded-xl border p-4 shadow-sm'>
      <div className='flex items-center justify-between border-b pb-3'>
        <div>
          <h3 className='flex items-center gap-2 text-base font-semibold'>
            <Sliders className='text-primary size-4' />
            视频配置
          </h3>
          <p className='text-muted-foreground text-xs'>
            设置投放平台、语言、画面画幅、生成变体数与背景音乐
          </p>
        </div>
        <div className='flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400'>
          <Sparkles className='size-3.5' />
          预计消耗：<span className='font-bold'>{totalCredits}</span> 积分 (
          {config.variantsCount || 1} 个变体)
        </div>
      </div>

      <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
        {/* 1. Target Platform Selection (单选) */}
        <div className='space-y-2 md:col-span-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-xs font-medium'>
              投放平台 (Target Platform)
            </Label>
          </div>
          <div className='flex flex-wrap gap-2'>
            {deliveryPlatforms.map((platform) => {
              const isSelected = selectedPlatform?.id === platform.id
              return (
                <button
                  key={platform.id}
                  type='button'
                  aria-pressed={isSelected}
                  onClick={() => platformSelect(platform.name)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-all',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                  )}
                >
                  {platform.icon_url ? (
                    <img
                      src={platform.icon_url}
                      alt=''
                      className='size-3.5 rounded-sm object-contain'
                    />
                  ) : null}
                  {platform.name}
                </button>
              )
            })}
          </div>
          {deliveryPlatformsQuery.isPending && (
            <p className='text-muted-foreground text-[11px]'>
              正在加载投放平台...
            </p>
          )}
          {deliveryPlatformsQuery.isError && (
            <p className='text-destructive text-[11px]'>
              投放平台加载失败：
              {getApiErrorMessage(deliveryPlatformsQuery.error)}
            </p>
          )}
          {selectedPlatforms.length === 0 && (
            <p className='text-[11px] text-amber-600 dark:text-amber-400'>
              请选择一个投放平台
            </p>
          )}
        </div>

        {/* 2. Video Language Selection */}
        <div className='space-y-2 md:col-span-2'>
          <Label className='text-xs font-medium'>
            视频语言 (Video Language)
          </Label>
          <div className='flex flex-wrap gap-2'>
            {videoLanguages.map((language) => {
              const isSelected = config.language === language.code
              return (
                <button
                  key={language.id}
                  type='button'
                  onClick={() => onChange('language', language.code)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs transition-all',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                  )}
                >
                  {language.flag_emoji ? (
                    <span aria-hidden className='mr-1'>
                      {language.flag_emoji}
                    </span>
                  ) : null}
                  {language.name} ({language.english_name})
                </button>
              )
            })}
          </div>
          {videoLanguagesQuery.isPending && (
            <p className='text-muted-foreground text-[11px]'>
              正在加载视频语言...
            </p>
          )}
          {videoLanguagesQuery.isError && (
            <p className='text-destructive text-[11px]'>
              视频语言加载失败：{getApiErrorMessage(videoLanguagesQuery.error)}
            </p>
          )}
        </div>

        {/* 3. Ratio Selection */}
        <div className='space-y-2 md:col-span-2'>
          <Label className='text-xs font-medium'>画面比例 (Aspect Ratio)</Label>
          <div className='grid grid-cols-3 gap-2 sm:grid-cols-5'>
            {allowedRatios.map((ratio) => {
              const isSelected = config.ratio === ratio
              return (
                <button
                  key={ratio}
                  type='button'
                  onClick={() => onChange('ratio', ratio)}
                  className={cn(
                    'hover:border-primary/50 flex flex-col items-center justify-center rounded-lg border px-2 py-2.5 text-center transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary ring-primary/30 font-semibold ring-1'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className='text-sm'>{ratio}</span>
                </button>
              )
            })}
          </div>
          {catalogQuery.isPending && (
            <p className='text-muted-foreground text-[11px]'>
              正在加载可用画面比例...
            </p>
          )}
          {catalogQuery.isError && (
            <p className='text-destructive text-[11px]'>
              可用画面比例加载失败：{getApiErrorMessage(catalogQuery.error)}
            </p>
          )}
          {!catalogQuery.isPending &&
            !catalogQuery.isError &&
            allowedRatios.length === 0 && (
              <p className='text-[11px] text-amber-600 dark:text-amber-400'>
                当前模型规则未配置可用画面比例
              </p>
            )}
        </div>

        {/* 5. Resolution */}
        <div className='space-y-2'>
          <Label className='text-xs font-medium'>视频分辨率 (Resolution)</Label>
          <div className='flex flex-wrap gap-2'>
            {availableResolutions.map((res) => {
              const isSelected =
                (config.resolution || '').toLowerCase() === res.toLowerCase()
              return (
                <button
                  key={res}
                  type='button'
                  onClick={() => onChange('resolution', res)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs uppercase transition-all',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground font-medium'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                  )}
                >
                  {res}
                </button>
              )
            })}
          </div>
        </div>

        {/* 6. Duration (视频时长) */}
        <div className='space-y-2.5 md:col-span-2'>
          <Label className='flex items-center gap-1.5 text-xs font-medium'>
            <Clock className='text-muted-foreground size-3.5' />
            视频时长
          </Label>

          {/* Quick preset buttons */}
          <div className='flex flex-wrap gap-2'>
            {[5, 10, 15].map((d) => {
              const isSelected = config.duration === d
              return (
                <button
                  key={d}
                  type='button'
                  onClick={() => onChange('duration', d)}
                  className={cn(
                    'min-w-[64px] rounded-md border px-4 py-2 text-xs font-medium transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary ring-primary/30 ring-1'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                  )}
                >
                  {d}s
                </button>
              )
            })}

            {/* AI Automatic option */}
            {/*<button*/}
            {/*  type='button'*/}
            {/*  onClick={() => onChange('duration', 15)}*/}
            {/*  className={cn(*/}
            {/*    'flex items-center gap-1.5 rounded-md border px-4 py-2 text-xs font-medium transition-all',*/}
            {/*    config.duration === 0*/}
            {/*      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'*/}
            {/*      : 'border-border bg-background text-foreground hover:bg-accent'*/}
            {/*  )}*/}
            {/*>*/}
            {/*  <span>🤖</span> AI 自动*/}
            {/*</button>*/}
          </div>

          {/* Custom Duration Input Box (虚线包裹，对齐截图) */}
          <div className='border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3 text-xs'>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground'>或自定义时长：</span>
              <Input
                type='number'
                min={5}
                max={15}
                value={config.duration || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (isNaN(val)) {
                    onChange('duration', 0)
                    return
                  }
                  if (val > 15) {
                    toast.error('自定义时长不能超过 15 秒')
                    onChange('duration', 15)
                    return
                  }
                  onChange('duration', val)
                }}
                className='bg-background h-8 w-20 text-center text-xs font-bold'
              />
              <span className='text-muted-foreground'>秒</span>
            </div>

            <span className='text-muted-foreground/75 text-[11px]'>
              (5–15 秒，任意整数)
            </span>
          </div>
        </div>

        {/* 7. Render Engine Selection */}
        <div className='space-y-2.5 md:col-span-2'>
          <Label className='flex items-center gap-1.5 text-xs font-semibold'>
            <Film className='text-primary size-4' />
            支持的渲染引擎
          </Label>
          <div className='flex flex-wrap gap-2'>
            {providerOptions.map((provider) => {
              const isSelected = provider.code === config.provider
              return (
                <button
                  key={provider.code}
                  type='button'
                  aria-pressed={isSelected}
                  onClick={() => {
                    onChange('provider', provider.code)
                    onChange('model', '')
                  }}
                  className={cn(
                    'w-fit max-w-full rounded-md border p-4 text-left transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/10 ring-primary/30 ring-1'
                      : 'border-border bg-background hover:bg-accent'
                  )}
                >
                  <div className='text-foreground text-sm font-semibold'>
                    {provider.name}
                  </div>
                  <div className='text-muted-foreground mt-1 text-xs uppercase'>
                    {provider.resolutions.join(' / ')}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 8. Background Music (BGM) with Custom Upload */}
        <div className='space-y-2'>
          <Label className='flex items-center justify-between text-xs font-medium'>
            <span>背景音乐 (BGM)</span>
            {config.bgmType === 'custom' && (
              <span className='text-[10px] font-normal text-emerald-600'>
                已选自定义音频
              </span>
            )}
          </Label>

          <Select
            value={config.bgm || 'bgm-auto'}
            onValueChange={(val) => {
              if (val === 'custom') {
                onChange('bgmType', 'custom')
                onChange('bgm', 'custom')
              } else {
                onChange('bgmType', 'preset')
                onChange('bgm', val)
                onChange('customBgmFile', null)
              }
            }}
          >
            <SelectTrigger className='h-9 text-xs'>
              <SelectValue placeholder='选择背景音乐' />
            </SelectTrigger>
            <SelectContent>
              {[
                bgmAutoOption,
                ...backgroundMusics.map((bgm) => ({
                  id: bgm.code,
                  name: bgm.name,
                })),
                bgmCustomOption,
                bgmNoneOption,
              ].map((bgm) => (
                <SelectItem key={bgm.id} value={bgm.id} className='text-xs'>
                  {bgm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom BGM Upload File Box */}
          {config.bgmType === 'custom' && (
            <div className='mt-2 space-y-2'>
              {config.customBgmFile ? (
                <div className='bg-muted/40 flex items-center justify-between rounded-lg border p-2 text-xs'>
                  <div className='flex items-center gap-2 truncate'>
                    <Music className='size-4 shrink-0 text-emerald-500' />
                    <span className='truncate font-medium'>
                      {config.customBgmFile.name}
                    </span>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='text-muted-foreground hover:text-foreground size-6 p-0'
                    onClick={() => {
                      onChange('customBgmFile', null)
                      onChange('bgmType', 'preset')
                      onChange('bgm', 'bgm-none')
                    }}
                  >
                    <X className='size-3.5' />
                  </Button>
                </div>
              ) : (
                <label
                  className={cn(
                    'border-muted-foreground/30 bg-muted/20 flex h-16 flex-col items-center justify-center rounded-lg border-2 border-dashed p-2 text-center transition-all',
                    audioUploading
                      ? 'cursor-wait opacity-70'
                      : 'cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5'
                  )}
                >
                  <Upload
                    className={cn(
                      'text-muted-foreground size-4',
                      audioUploading && 'animate-pulse'
                    )}
                  />
                  <span className='text-muted-foreground mt-1 text-[11px] font-medium'>
                    {audioUploading
                      ? '背景音乐上传中...'
                      : '点击选择或拖拽上传背景音乐音频 (MP3/WAV)'}
                  </span>
                  <input
                    type='file'
                    accept='audio/mpeg,audio/wav,audio/mp3,audio/mp4,audio/aac,audio/ogg'
                    className='hidden'
                    disabled={audioUploading}
                    onChange={handleCustomBgmUpload}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {/* 4. Generation Variant Count (生成变体数) */}
        {variantOptions.length > 0 && (
          <div className='space-y-2 md:col-span-2'>
            <Label className='flex items-center justify-between text-xs font-medium'>
              <span>生成变体数 (Variants Count)</span>
              <span className='text-muted-foreground text-[11px] font-normal'>
                一次生成多个不同微调版本的营销视频
              </span>
            </Label>
            <div className='flex flex-wrap gap-3'>
              {variantOptions.map((count) => {
                const isSelected = (config.variantsCount || 1) === count
                return (
                  <button
                    key={count}
                    type='button'
                    onClick={() => onChange('variantsCount', count)}
                    className={cn(
                      'min-w-24 flex-1 rounded-lg border py-2 text-center text-xs font-semibold transition-all',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-foreground hover:bg-accent'
                    )}
                  >
                    {count} 个视频
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
