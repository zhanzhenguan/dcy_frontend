import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Link2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ImagePlus,
  RefreshCw,
  LoaderCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import { syncCreditBalance } from '@/services/api/creditApi'
import { uploadCreativeAsset } from '@/services/api/creativeApi'
import { listDigitalHumans } from '@/services/api/digitalHumanApi'
import { cn } from '@/utils/utils'
import {
  createVideoGeneration,
  type VideoDraft,
  type VideoGenerationTask,
} from '@/services/api/videoApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { mockDigitalHumans } from './digiHumaMock'
import { DigitalHumanPicker, type DigitalHuman } from './DigiHumaPick'
import { normalizePlatforms } from './platformOptions'
import { ScriptSelector } from './ScriptSelector'
import { VideoConfigPanel, type VideoConfigState } from './VideConfPane'

type ModelCatalogItem = {
  code: string
  name: string
  providerCode: string
  provider_name: string
  supported_resolutions?: string[]
  is_default?: boolean
  weight?: number
}

type CompetitiveAnalysisFlowProps = {
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

type CompetitiveDraftData = {
  linkUrl?: string
  cAssets?: {
    productTitle: string
    images: string[]
    videoUrl?: string
  } | null
  replacedImage?: string | null
  selectedHuman?: DigitalHuman
  scriptContent?: string
  config?: Partial<VideoConfigState>
}

function parseCompetitiveDraft(draft?: VideoDraft): CompetitiveDraftData {
  if (!draft) return {}
  try {
    return JSON.parse(draft.draft_data) as CompetitiveDraftData
  } catch {
    return {}
  }
}

export const CompetitiveAnalysisFlow = ({
  availableModels = [],
  onSuccessTask,
  initialDraft,
  existingTaskId,
  createAsNew = false,
  initialHumanId,
  onStepChange,
  userLocale,
}: CompetitiveAnalysisFlowProps) => {
  const queryClient = useQueryClient()
  const initialData = parseCompetitiveDraft(initialDraft)
  // Step: 1 (Link input) | 2 (Configure & Generate)
  const [step, setStep] = useState<1 | 2>(
    initialDraft?.current_step === 2 ? 2 : 1
  )

  useEffect(() => {
    onStepChange?.(step)
  }, [step, onStepChange])

  const [linkUrl, setLinkUrl] = useState(initialData.linkUrl ?? '')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Mock extracted competitive assets
  const [cAssets, setCAssets] = useState<{
    productTitle: string
    images: string[]
    videoUrl?: string
  } | null>(initialData.cAssets ?? null)

  // Replaced material
  const [replacedImage, setReplacedImage] = useState<string | null>(
    initialData.replacedImage ?? null
  )

  // Selected Avatar & Script
  const [selectedHuman, setSelectedHuman] = useState<DigitalHuman>(
    initialData.selectedHuman ?? mockDigitalHumans[0]
  )

  // 数字人目录：优先使用后端真实数字人，接口暂不可用时回退到内置 mock 数据
  const digitalHumanQuery = useQuery({
    queryKey: ['digital-humans'],
    queryFn: () => listDigitalHumans(),
  })
  const digitalHumans = useMemo<DigitalHuman[]>(() => {
    const realHumans = (digitalHumanQuery.data?.items ?? [])
      .filter(
        (item) =>
          item.accessible &&
          (item.gender === 'male' || item.gender === 'female')
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
        avatarUrl: item.avatar_url,
        assetId: item.asset_id,
        source: item.source,
        gender: item.gender as 'male' | 'female',
        category: 'daily' as const,
        tags: item.styles,
        recommended: item.is_hot,
      }))
    return realHumans.length > 0 ? realHumans : mockDigitalHumans
  }, [digitalHumanQuery.data])

  // 从数字人库携带 humanId 跳转时，自动选中对应的数字人
  const appliedInitialHuman = useRef(false)
  useEffect(() => {
    if (!initialHumanId || appliedInitialHuman.current) return
    const matched = digitalHumans.find((human) => human.id === initialHumanId)
    if (matched) {
      setSelectedHuman(matched)
      appliedInitialHuman.current = true
    }
  }, [initialHumanId, digitalHumans])

  const [scriptContent, setScriptContent] = useState(
    initialData.scriptContent ??
      '根据对标竞品热销爆款分析：这款产品凭借防跌抗摔设计和高保真音质引发轰动！现在换上您的独家产品素材，相同流量剧本，一键复刻爆发带货！'
  )

  // Config
  const [config, setConfig] = useState<VideoConfigState>({
    platforms: normalizePlatforms(initialData.config?.platforms),
    language: initialData.config?.language ?? '',
    ratio: initialData.config?.ratio ?? '9:16',
    resolution: initialData.config?.resolution ?? '',
    duration: initialData.config?.duration ?? 15,
    provider: initialData.config?.provider ?? 'seedance',
    model: '',
    bgm: initialData.config?.bgm ?? 'bgm-auto',
    bgmType: initialData.config?.bgmType ?? 'preset',
    customBgmFile: initialData.config?.customBgmFile ?? null,
    variantsCount: initialData.config?.variantsCount ?? 1,
  })

  const [submitting, setSubmitting] = useState(false)
  const [, setActiveTask] = useState<VideoGenerationTask | null>(null)

  // Preset example URLs
  const sampleLinks = [
    { name: 'Amazon 产品页', url: 'https://www.amazon.com/dp/B08X123456' },
    {
      name: 'Shopify 商品页',
      url: 'https://myshop.myshopify.com/products/wireless-earbuds',
    },
    {
      name: 'TikTok Shop',
      url: 'https://shop.tiktok.com/view/product/1729481928',
    },
  ]

  // Analyze Link Action
  const handleAnalyze = async () => {
    if (!linkUrl.trim()) {
      toast.error('请粘贴有效的竞品产品页面链接')
      return
    }
    setIsAnalyzing(true)
    try {
      const nextAssets = {
        productTitle: '对标竞品：High-Performance Smart Gadget X1',
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4d?w=400&auto=format&fit=crop&q=80',
        ],
      }
      setCAssets(nextAssets)
      setStep(2)
      toast.success('竞品链接分析完成，已抓取素材与带货结构！')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Handle Material Replacement
  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    try {
      const asset = await uploadCreativeAsset(files[0])
      if (asset.media_type !== 'image') throw new Error('请选择图片文件')
      setReplacedImage(asset.url)
      toast.success('自定义产品素材替换成功！')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '产品素材上传失败')
    } finally {
      e.target.value = ''
    }
  }

  // Submit Generation
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const draftSnapshot = {
        linkUrl,
        cAssets,
        replacedImage,
        selectedHuman,
        scriptContent,
        config,
      } satisfies CompetitiveDraftData
      const task = await createVideoGeneration({
        task_id: createAsNew ? undefined : existingTaskId,
        provider: config.provider,
        title: initialDraft?.project_title,
        draft_data: JSON.stringify(draftSnapshot),
        language: config.language || undefined,
        platform: config.platforms[0] || undefined,
        ratio: config.ratio,
        duration: config.duration,
        resolution: config.resolution,
        generate_audio: config.bgm !== 'bgm-none',
        content: [{ type: 'text', text: scriptContent }],
      })
      setActiveTask(task)
      if (onSuccessTask) onSuccessTask(task)
      void syncCreditBalance(queryClient).catch(() => undefined)
      toast.success('竞品对标视频生成任务已创建！')
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, '生成任务创建失败'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col space-y-6'>
      {/* Steps indicator */}
      <div className='bg-card rounded-xl border p-4 shadow-sm'>
        <div className='flex items-center justify-around text-center'>
          <div
            onClick={() => setStep(1)}
            className={cn(
              'flex cursor-pointer items-center gap-2 transition-all',
              step === 1 ? 'text-primary font-bold' : 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-xs',
                step === 1 || step === 2
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              1
            </div>
            <span className='text-xs sm:text-sm'>链接分析</span>
          </div>

          {/* <div className='bg-border h-[1px] w-16 sm:w-32' /> */}

          <div
            className={cn(
              'flex items-center gap-2 transition-all',
              step === 2 ? 'text-primary font-bold' : 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-xs',
                step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}
            >
              2
            </div>
            <span className='text-xs sm:text-sm'>生成视频与素材配置</span>
          </div>
        </div>
      </div>

      {/* STEP 1: Link Input Card */}
      {step === 1 && (
        <Card className='shadow-sm'>
          <CardContent className='mx-auto my-4 max-w-2xl space-y-6 p-6 text-center'>
            <div className='space-y-2'>
              <div className='bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full'>
                <Link2 className='size-6' />
              </div>
              <h2 className='text-xl font-bold'>输入竞品产品链接</h2>
              <p className='text-muted-foreground mx-auto max-w-lg text-xs'>
                粘贴竞品的商品页面链接，AI
                将自动抓取竞品的图片、视频和产品信息，用于分析对标。分析完成后进入生成页，一页完成素材替换与视频配置。
              </p>
            </div>

            <div className='space-y-3'>
              <div className='flex flex-col gap-2 sm:flex-row'>
                <div className='relative flex-1'>
                  <Link2 className='text-muted-foreground absolute top-3 left-3 size-4' />
                  <Input
                    placeholder='粘贴竞品链接，如 https://www.amazon.com/dp/B0XXXXXX'
                    className='h-10 pl-9 text-xs'
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => void handleAnalyze()}
                  disabled={isAnalyzing}
                  className='bg-primary h-10 gap-2 text-xs'
                >
                  {isAnalyzing ? (
                    <>
                      <LoaderCircle className='size-4 animate-spin' />
                      AI 抓取分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles className='size-4' />
                      分析竞品，开始生成
                      <ArrowRight className='size-4' />
                    </>
                  )}
                </Button>
              </div>

              <div className='flex flex-wrap items-center justify-center gap-2 pt-2 text-xs'>
                <span className='text-muted-foreground text-[11px]'>
                  试试这些示例：
                </span>
                {sampleLinks.map((s) => (
                  <Button
                    key={s.name}
                    variant='outline'
                    size='sm'
                    className='h-7 text-[11px]'
                    onClick={() => setLinkUrl(s.url)}
                  >
                    {s.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Material Replacement & Video Setup */}
      {step === 2 && (
        <div className='flex min-h-0 flex-1 flex-col space-y-4'>
          {/* Competitive Asset Analysis & Replacement Section */}
          <Card className='shadow-sm'>
            <CardContent className='space-y-4 p-4 sm:p-5'>
              <div className='flex items-center justify-between border-b pb-3'>
                <div>
                  <h3 className='flex items-center gap-2 text-sm font-bold'>
                    <CheckCircle2 className='text-primary size-4' />
                    竞品解析成功 · 素材替换
                  </h3>
                  <p className='text-muted-foreground mt-0.5 truncate text-xs'>
                    {cAssets?.productTitle}
                  </p>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setStep(1)}
                  className='gap-1 text-xs'
                >
                  <RefreshCw className='size-3' /> 重新输入链接
                </Button>
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {/* Original Competitive Images */}
                <div className='space-y-2'>
                  <Label className='text-xs font-medium'>
                    拉取的竞品画幅素材：
                  </Label>
                  <div className='flex gap-2 overflow-x-auto pb-1'>
                    {cAssets?.images.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className='bg-muted relative aspect-square w-20 shrink-0 overflow-hidden rounded-md border'
                      >
                        <img
                          src={imgUrl}
                          alt='Comp'
                          className='size-full object-cover opacity-80'
                        />
                        <Badge
                          variant='secondary'
                          className='absolute bottom-1 left-1 px-1 py-0 text-[9px]'
                        >
                          竞品 #{idx + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upload Custom Replacement */}
                <div className='space-y-2'>
                  <Label className='text-xs font-medium'>
                    替换为您的产品素材：
                  </Label>
                  <div className='flex items-center gap-3'>
                    {replacedImage ? (
                      <div className='border-primary ring-primary/20 relative aspect-square w-20 shrink-0 overflow-hidden rounded-md border ring-2'>
                        <img
                          src={replacedImage}
                          alt='Replaced'
                          className='size-full object-cover'
                        />
                        <Badge className='bg-primary absolute bottom-1 left-1 px-1 py-0 text-[9px]'>
                          自备素材
                        </Badge>
                      </div>
                    ) : null}

                    <label className='border-muted-foreground/30 bg-muted/20 hover:border-primary/50 hover:bg-primary/5 flex h-20 flex-1 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-2 text-center transition-colors'>
                      <ImagePlus className='text-muted-foreground size-5' />
                      <span className='text-muted-foreground mt-1 text-[11px] font-medium'>
                        {replacedImage
                          ? '更换替换图片'
                          : '上传您的产品素材图片'}
                      </span>
                      <input
                        type='file'
                        accept='image/*'
                        className='hidden'
                        onChange={handleReplaceImage}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Digital Human Selector */}
          <DigitalHumanPicker
            humans={digitalHumanQuery.isLoading ? [] : digitalHumans}
            loading={digitalHumanQuery.isLoading}
            selectedId={selectedHuman?.id}
            onSelect={(h) => setSelectedHuman(h)}
          />

          {/* Script Selector */}
          <ScriptSelector
            value={scriptContent}
            onChange={(val) => setScriptContent(val)}
          />

          {/* Video Parameters Config */}
          <VideoConfigPanel
            config={config}
            onChange={(key, val) =>
              setConfig((prev) => ({ ...prev, [key]: val }))
            }
            availableModels={availableModels}
            userLocale={userLocale}
            estimatedCredits={25}
          />

          {/* Final Submit Bar */}
          <div className='bg-card flex items-center justify-between rounded-xl border p-4 shadow-sm'>
            <Button
              variant='outline'
              onClick={() => setStep(1)}
              className='gap-2 text-xs'
              disabled={submitting}
            >
              <ArrowLeft className='size-4' />
              返回重选竞品
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className='bg-primary text-primary-foreground gap-2 px-6 text-xs font-semibold'
            >
              {submitting ? (
                <>
                  <LoaderCircle className='size-4 animate-spin' />
                  AI 生成中...
                </>
              ) : (
                <>
                  <Sparkles className='size-4' />
                  对标竞品，开始生成视频
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
