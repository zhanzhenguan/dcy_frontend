import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AudioLines,
  CheckCircle2,
  Clock3,
  Film,
  ImagePlus,
  Images,
  LoaderCircle,
  Play,
  Sparkles,
  UploadCloud,
  Video,
  WandSparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { syncCreditBalance } from '@/services/api/creditApi'
import { getModelCatalog } from '@/services/api/modelApi'
import { getApiErrorMessage } from '@/services/api/apiError'
import { getVideoResolutions } from '@/services/api/systemSettingsApi'
import {
  createVideoGeneration,
  estimateVideoGeneration,
  getVideoGeneration,
  type VideoGenerationContent,
  type VideoGenerationTask,
} from '@/services/api/videoApi'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch } from '@/components/common'

export type VideoGenerationMode = 'text' | 'image' | 'video'

type ImageInputMode = 'first' | 'first-last' | 'reference'
type ImageUploadSlot = 'first' | 'last' | 'reference'
type DraggingSlot = ImageUploadSlot | 'audio'

type VideoGenerationPageProps = {
  mode: VideoGenerationMode
  initialPrompt?: string
}

type MediaState = {
  file: File
  previewUrl: string
  dataUrl?: string
}

type AudioMediaState = MediaState & {
  duration: number
}

const modeConfig = {
  text: {
    title: '文生视频',
    description: '用文字描述画面、镜头和氛围，生成完整视频。',
    placeholder:
      '描述你想生成的视频，例如：清晨的森林里，一束阳光穿过薄雾，镜头缓慢向前推进……',
    uploadLabel: '',
    uploadHint: '',
    accept: '',
  },
  image: {
    title: '图生视频',
    description: '使用边界帧或多张参考图控制视频画面。',
    placeholder:
      '描述画面如何运动，例如：人物轻轻转头，发丝随风摆动，镜头缓慢拉近……',
    uploadLabel: '参考画面',
    uploadHint: '支持 JPG、PNG、WEBP，最大 10MB',
    accept: 'image/jpeg,image/png,image/webp',
  },
  video: {
    title: '视频生视频',
    description: '以参考视频为基础，重塑风格、场景或视觉效果。',
    placeholder:
      '描述你希望如何改编视频，例如：转换为电影胶片质感，保留原始运动与构图……',
    uploadLabel: '本地预览（可选）',
    uploadHint: '支持 MP4、MOV、WEBM，最大 100MB',
    accept: 'video/mp4,video/quicktime,video/webm',
  },
} as const

const ratios = [
  { value: '16:9', iconClass: 'h-3.5 w-7' },
  { value: '9:16', iconClass: 'h-7 w-3.5' },
  { value: '1:1', iconClass: 'size-6' },
  { value: '4:3', iconClass: 'h-5 w-7' },
  { value: '3:4', iconClass: 'h-7 w-5' },
  { value: '21:9', iconClass: 'h-2.5 w-8' },
]

const durations = [4, 5, 6, 8, 10, 12]
const terminalStatuses = new Set([
  'cancelled',
  'succeeded',
  'failed',
  'expired',
])
const audioAccept = '.wav,.mp3,audio/wav,audio/mpeg'
const audioMimeTypes = new Set(['audio/wav', 'audio/x-wav', 'audio/mpeg'])
const maxAudioCount = 3
const maxAudioDuration = 15
const minAudioDuration = 2
const maxAudioSize = 15 * 1024 * 1024
const maxRequestBodySize = 64 * 1024 * 1024

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('文件读取失败，请重新选择'))
    reader.readAsDataURL(file)
  })
}

function readAudioDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const audio = new Audio()
    const cleanup = () => URL.revokeObjectURL(objectUrl)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      const duration = audio.duration
      cleanup()
      if (!Number.isFinite(duration)) {
        reject(new Error(`无法读取 ${file.name} 的音频时长`))
        return
      }
      resolve(duration)
    }
    audio.onerror = () => {
      cleanup()
      reject(new Error(`无法读取 ${file.name} 的音频信息`))
    }
    audio.src = objectUrl
  })
}

function isSupportedAudioFile(file: File) {
  const extensionMatches = /\.(wav|mp3)$/i.test(file.name)
  return extensionMatches && (!file.type || audioMimeTypes.has(file.type))
}

function formatAudioDuration(duration: number) {
  return `${duration.toFixed(1)} 秒`
}

function getErrorMessage(error: unknown) {
  return getApiErrorMessage(error, '生成任务创建失败，请稍后重试')
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const VideoGenerationPage = ({
  mode,
  initialPrompt,
}: VideoGenerationPageProps) => {
  const config = modeConfig[mode]
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastFrameInputRef = useRef<HTMLInputElement>(null)
  const referenceImagesInputRef = useRef<HTMLInputElement>(null)
  const referenceAudiosInputRef = useRef<HTMLInputElement>(null)
  const videoPreviewUrlRef = useRef('')
  const [prompt, setPrompt] = useState(initialPrompt ?? '')
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [ratio, setRatio] = useState('16:9')
  const [duration, setDuration] = useState(5)
  const [resolution, setResolution] = useState('')
  const [generateAudio, setGenerateAudio] = useState(true)
  const [media, setMedia] = useState<MediaState | null>(null)
  const [lastFrameMedia, setLastFrameMedia] = useState<MediaState | null>(null)
  const [referenceImages, setReferenceImages] = useState<MediaState[]>([])
  const [referenceAudios, setReferenceAudios] = useState<AudioMediaState[]>([])
  const [imageInputMode, setImageInputMode] = useState<ImageInputMode>('first')
  const [referenceVideoUrl, setReferenceVideoUrl] = useState('')
  const [inputVideoDuration, setInputVideoDuration] = useState(5)
  const [draggingSlot, setDraggingSlot] = useState<DraggingSlot | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [task, setTask] = useState<VideoGenerationTask | null>(null)
  const creditBalance = useAuthStore(
    (state) => state.auth.session?.credit_balance ?? 0
  )
  const queryClient = useQueryClient()
  const catalogQuery = useQuery({
    queryKey: ['model-catalog'],
    queryFn: getModelCatalog,
  })
  const resolutionsQuery = useQuery({
    queryKey: ['video-resolutions'],
    queryFn: getVideoResolutions,
  })
  const availableModels = useMemo(
    () =>
      (catalogQuery.data ?? []).flatMap((group) =>
        group.models.map((item) => ({
          ...item,
          providerCode: group.provider.code,
        }))
      ),
    [catalogQuery.data]
  )
  const selectedModel = availableModels.find(
    (item) => item.code === model && item.providerCode === provider
  )
  const availableResolutions = useMemo(
    () =>
      (resolutionsQuery.data?.resolutions ?? []).filter((item) =>
        selectedModel?.supported_resolutions.includes(item)
      ),
    [resolutionsQuery.data?.resolutions, selectedModel]
  )
  const estimateQuery = useQuery({
    queryKey: [
      'video-estimate',
      provider,
      model,
      resolution,
      duration,
      mode,
      inputVideoDuration,
     ratio],
    queryFn: () =>
      estimateVideoGeneration({
        provider,
        model,
        resolution,
        duration,
        ratio,
      }),
    enabled: Boolean(
      provider &&
        model &&
        resolution &&
        (mode !== 'video' || inputVideoDuration > 0)
    ),
    retry: false,
  })
  const estimatedCredits = estimateQuery.data?.estimated_credits
  const taskId = task?.id
  const taskStatus = task?.status

  useEffect(() => {
    if (!estimateQuery.isError) return
    toast.error(
      estimateQuery.error instanceof Error
        ? estimateQuery.error.message
        : '积分预估失败，请稍后重试'
    )
  }, [estimateQuery.isError, estimateQuery.error])

  useEffect(() => {
    if (availableModels.length === 0) return
    const current = availableModels.find(
      (item) => item.code === model && item.providerCode === provider
    )
    if (current) return
    const preferred =
      availableModels.find((item) => item.is_default) ?? availableModels[0]
    setProvider(preferred.providerCode)
    setModel(preferred.code)
  }, [availableModels, model, provider])

  useEffect(() => {
    if (availableResolutions.length === 0) return
    if (availableResolutions.includes(resolution)) return
    setResolution(
      availableResolutions.includes('720p') ? '720p' : availableResolutions[0]
    )
  }, [availableResolutions, resolution])

  useEffect(() => {
    setPrompt(initialPrompt ?? '')
    if (videoPreviewUrlRef.current) {
      URL.revokeObjectURL(videoPreviewUrlRef.current)
      videoPreviewUrlRef.current = ''
    }
    setMedia(null)
    setLastFrameMedia(null)
    setReferenceImages([])
    setReferenceAudios([])
    setImageInputMode('first')
    setReferenceVideoUrl('')
    setInputVideoDuration(5)
    setTask(null)
  }, [initialPrompt, mode])

  useEffect(() => {
    return () => {
      if (videoPreviewUrlRef.current) {
        URL.revokeObjectURL(videoPreviewUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!taskId || !taskStatus || terminalStatuses.has(taskStatus)) return
    const timer = window.setInterval(async () => {
      try {
        const nextTask = await getVideoGeneration(taskId)
        setTask(nextTask)
        if (nextTask.status === 'succeeded') toast.success('视频生成完成')
        if (nextTask.status === 'failed') {
          toast.error(nextTask.error_message || '视频生成失败')
        }
      } catch {
        // Keep the current task visible and retry on the next interval.
      }
    }, 3000)
    return () => window.clearInterval(timer)
  }, [taskId, taskStatus])

  const selectFile = async (file?: File, slot: ImageUploadSlot = 'first') => {
    if (!file) return
    const isImage = mode === 'image'
    const validType = isImage
      ? ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      : ['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type)
    const maxSize = isImage ? 10 * 1024 * 1024 : 100 * 1024 * 1024
    if (!validType) {
      toast.error(
        isImage
          ? '请选择 JPG、PNG 或 WEBP 图片'
          : '请选择 MP4、MOV 或 WEBM 视频'
      )
      return
    }
    if (file.size > maxSize) {
      toast.error(isImage ? '图片不能超过 10MB' : '视频不能超过 100MB')
      return
    }
    try {
      if (videoPreviewUrlRef.current) {
        URL.revokeObjectURL(videoPreviewUrlRef.current)
        videoPreviewUrlRef.current = ''
      }
      if (isImage) {
        const dataUrl = await readAsDataUrl(file)
        const nextMedia = { file, previewUrl: dataUrl, dataUrl }
        if (slot === 'last') {
          setLastFrameMedia(nextMedia)
        } else {
          setMedia(nextMedia)
        }
      } else {
        const previewUrl = URL.createObjectURL(file)
        videoPreviewUrlRef.current = previewUrl
        setMedia({ file, previewUrl })
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const selectReferenceImages = async (files?: FileList | File[]) => {
    const selectedFiles = Array.from(files ?? [])
    if (selectedFiles.length === 0) return
    if (referenceImages.length + selectedFiles.length > 9) {
      toast.error('多图参考最多上传 9 张图片')
      return
    }
    const invalidType = selectedFiles.some(
      (file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    )
    if (invalidType) {
      toast.error('请选择 JPG、PNG 或 WEBP 图片')
      return
    }
    if (selectedFiles.some((file) => file.size > 10 * 1024 * 1024)) {
      toast.error('每张图片不能超过 10MB')
      return
    }
    try {
      const nextImages = await Promise.all(
        selectedFiles.map(async (file) => {
          const dataUrl = await readAsDataUrl(file)
          return { file, previewUrl: dataUrl, dataUrl }
        })
      )
      setReferenceImages((current) => [...current, ...nextImages].slice(0, 9))
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const selectReferenceAudios = async (files?: FileList | File[]) => {
    const selectedFiles = Array.from(files ?? [])
    if (selectedFiles.length === 0) return
    if (referenceAudios.length + selectedFiles.length > maxAudioCount) {
      toast.error('参考音频最多上传 3 段')
      return
    }
    const invalidFormat = selectedFiles.find(
      (file) => !isSupportedAudioFile(file)
    )
    if (invalidFormat) {
      toast.error(`${invalidFormat.name} 不是 WAV 或 MP3 音频`)
      return
    }
    const oversizedFile = selectedFiles.find((file) => file.size > maxAudioSize)
    if (oversizedFile) {
      toast.error(`${oversizedFile.name} 超过 15MB`)
      return
    }
    try {
      const audioMetadata = await Promise.all(
        selectedFiles.map(async (file) => ({
          file,
          duration: await readAudioDuration(file),
        }))
      )
      const invalidDuration = audioMetadata.find(
        (item) =>
          item.duration < minAudioDuration || item.duration > maxAudioDuration
      )
      if (invalidDuration) {
        toast.error(`${invalidDuration.file.name} 的时长必须为 2 至 15 秒`)
        return
      }
      const currentDuration = referenceAudios.reduce(
        (total, item) => total + item.duration,
        0
      )
      const selectedDuration = audioMetadata.reduce(
        (total, item) => total + item.duration,
        0
      )
      if (currentDuration + selectedDuration > maxAudioDuration) {
        toast.error('所有参考音频的总时长不能超过 15 秒')
        return
      }
      const nextAudios = await Promise.all(
        audioMetadata.map(async ({ file, duration }) => {
          const dataUrl = await readAsDataUrl(file)
          return { file, duration, previewUrl: dataUrl, dataUrl }
        })
      )
      setReferenceAudios((current) => [...current, ...nextAudios])
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error('请先填写视频描述')
      return
    }
    if (!provider || !model) {
      toast.error('当前没有可用模型')
      return
    }
    if (mode === 'video' && inputVideoDuration <= 0) {
      toast.error('请输入参考视频时长')
      return
    }
    if (mode === 'image' && imageInputMode !== 'reference' && !media?.dataUrl) {
      toast.error('请上传首帧图片')
      return
    }
    if (
      mode === 'image' &&
      imageInputMode === 'first-last' &&
      !lastFrameMedia?.dataUrl
    ) {
      toast.error('请上传尾帧图片')
      return
    }
    if (
      mode === 'image' &&
      imageInputMode === 'reference' &&
      referenceImages.length === 0
    ) {
      toast.error('请至少上传 1 张参考图片')
      return
    }
    if (mode === 'video' && !referenceVideoUrl.trim()) {
      toast.error('请输入可公开访问的参考视频地址')
      return
    }
    if (mode === 'video' && !isHttpUrl(referenceVideoUrl.trim())) {
      toast.error('参考视频地址必须以 http:// 或 https:// 开头')
      return
    }

    const content: VideoGenerationContent[] = [
      { type: 'text', text: prompt.trim() },
    ]
    if (media && mode === 'image' && imageInputMode !== 'reference') {
      content.push({
        type: 'image_url',
        url: media.dataUrl,
        role:
          imageInputMode === 'first-last' ? 'first_frame' : 'reference_image',
      })
    }
    if (
      mode === 'image' &&
      imageInputMode === 'first-last' &&
      lastFrameMedia?.dataUrl
    ) {
      content.push({
        type: 'image_url',
        url: lastFrameMedia.dataUrl,
        role: 'last_frame',
      })
    }
    if (mode === 'image' && imageInputMode === 'reference') {
      content.push(
        ...referenceImages.map((item) => ({
          type: 'image_url' as const,
          url: item.dataUrl,
          role: 'reference_image' as const,
        }))
      )
    }
    if (mode === 'video') {
      content.push({
        type: 'video_url',
        url: referenceVideoUrl.trim(),
        role: 'reference_video',
      })
    }

    if (mode !== 'text') {
      content.push(
        ...referenceAudios.map((item) => ({
          type: 'audio_url' as const,
          url: item.dataUrl,
          role: 'reference_audio' as const,
        }))
      )
    }

    const generationInput = {
      provider,
      model,
      content,
      ratio,
      duration,
      input_video_duration: mode === 'video' ? inputVideoDuration : undefined,
      resolution,
      generate_audio: generateAudio,
      watermark: false,
    }
    if (new Blob([JSON.stringify(generationInput)]).size > maxRequestBodySize) {
      toast.error('请求体不能超过 64MB，请减少参考素材')
      return
    }

    setSubmitting(true)
    try {
      const nextTask = await createVideoGeneration(generationInput)
      setTask(nextTask)
      void syncCreditBalance(queryClient).catch(() => undefined)
      toast.success('生成任务已创建')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const outputUrl = task?.file_url || task?.video_url
  const previewMedia =
    mode === 'image' && imageInputMode === 'reference'
      ? referenceImages[0]
      : media

  return (
    <div className='bg-background flex min-h-0 flex-1 flex-col xl:h-[calc(100svh-1rem)] xl:flex-none xl:overflow-hidden'>
      <Header className='bg-surface/95 border-b'>
        <div className='min-w-0'>
          <h1 className='truncate text-base font-semibold'>{config.title}</h1>
          <p className='text-muted-foreground hidden truncate text-xs sm:block'>
            {config.description}
          </p>
        </div>
        <div className='ms-auto flex items-center gap-1'>
          <div className='bg-muted hidden items-center gap-2 rounded-md px-3 py-1.5 text-sm sm:flex'>
            <Sparkles className='size-4 text-amber-500' />
            <span className='font-medium'>
              {creditBalance.toLocaleString('en-US')}
            </span>
            <span className='text-muted-foreground'>积分</span>
          </div>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <main className='grid min-h-0 flex-1 gap-4 p-3 md:p-4 xl:grid-cols-[400px_minmax(0,1fr)]'>
        <section className='bg-card flex min-h-[720px] flex-col overflow-hidden rounded-lg border shadow-sm xl:min-h-0'>
          <div className='border-b px-5 py-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-primary/10 text-primary flex size-9 items-center justify-center rounded-md'>
                {mode === 'text' && <WandSparkles className='size-5' />}
                {mode === 'image' && <ImagePlus className='size-5' />}
                {mode === 'video' && <Video className='size-5' />}
              </div>
              <div>
                <h2 className='font-semibold'>{config.title}</h2>
                <p className='text-muted-foreground text-xs'>
                  配置本次生成参数
                </p>
              </div>
            </div>
          </div>

          <div className='flex-1 space-y-6 overflow-y-auto px-5 py-5'>
            <div className='space-y-2'>
              <Label htmlFor='video-model'>生成模型</Label>
              <Select
                value={provider && model ? `${provider}:${model}` : ''}
                onValueChange={(value) => {
                  const separator = value.indexOf(':')
                  setProvider(value.slice(0, separator))
                  setModel(value.slice(separator + 1))
                }}
              >
                <SelectTrigger id='video-model' className='h-10 w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((item) => (
                    <SelectItem
                      key={`${item.providerCode}:${item.code}`}
                      value={`${item.providerCode}:${item.code}`}
                    >
                      {item.name} · {item.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='video-prompt'>视频描述</Label>
                <span className='text-muted-foreground text-xs'>
                  {prompt.length}/1000
                </span>
              </div>
              <Textarea
                id='video-prompt'
                value={prompt}
                maxLength={1000}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={config.placeholder}
                className='min-h-32 resize-none leading-6'
              />
            </div>

            {mode !== 'text' && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-3'>
                  <Label>{config.uploadLabel}</Label>
                  {mode === 'image' && (
                    <div
                      role='group'
                      aria-label='图片素材模式'
                      className='bg-muted grid grid-cols-3 rounded-md p-0.5'
                    >
                      {(
                        [
                          ['first', '首帧'],
                          ['first-last', '首尾帧'],
                          ['reference', '多图参考'],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type='button'
                          aria-pressed={imageInputMode === value}
                          onClick={() => setImageInputMode(value)}
                          className={cn(
                            'h-7 rounded-[5px] px-2 text-xs font-medium transition-colors',
                            imageInputMode === value
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {mode === 'image' ? (
                  imageInputMode === 'reference' ? (
                    <ReferenceImagesUploader
                      media={referenceImages}
                      inputRef={referenceImagesInputRef}
                      accept={config.accept}
                      dragging={draggingSlot === 'reference'}
                      onDraggingChange={(dragging) =>
                        setDraggingSlot(dragging ? 'reference' : null)
                      }
                      onSelect={selectReferenceImages}
                      onRemove={(index) =>
                        setReferenceImages((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                    />
                  ) : (
                    <div
                      className={cn(
                        'grid gap-3',
                        imageInputMode === 'first-last' && 'grid-cols-2'
                      )}
                    >
                      <ImageFrameUploader
                        label='首帧'
                        media={media}
                        inputRef={fileInputRef}
                        accept={config.accept}
                        compact={imageInputMode === 'first-last'}
                        dragging={draggingSlot === 'first'}
                        onDraggingChange={(dragging) =>
                          setDraggingSlot(dragging ? 'first' : null)
                        }
                        onSelect={(file) => selectFile(file, 'first')}
                        onRemove={() => setMedia(null)}
                      />
                      {imageInputMode === 'first-last' && (
                        <ImageFrameUploader
                          label='尾帧'
                          media={lastFrameMedia}
                          inputRef={lastFrameInputRef}
                          accept={config.accept}
                          compact
                          dragging={draggingSlot === 'last'}
                          onDraggingChange={(dragging) =>
                            setDraggingSlot(dragging ? 'last' : null)
                          }
                          onSelect={(file) => selectFile(file, 'last')}
                          onRemove={() => setLastFrameMedia(null)}
                        />
                      )}
                    </div>
                  )
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type='file'
                      accept={config.accept}
                      className='sr-only'
                      onChange={(event) => {
                        selectFile(event.target.files?.[0])
                        event.currentTarget.value = ''
                      }}
                    />
                    {media ? (
                      <div className='group relative aspect-video overflow-hidden rounded-lg border bg-black'>
                        <video
                          src={media.previewUrl}
                          className='size-full object-contain'
                          controls
                        />
                        <Button
                          type='button'
                          size='icon'
                          variant='secondary'
                          aria-label='移除已上传文件'
                          className='absolute top-2 right-2 size-8'
                          onClick={() => {
                            if (videoPreviewUrlRef.current) {
                              URL.revokeObjectURL(videoPreviewUrlRef.current)
                              videoPreviewUrlRef.current = ''
                            }
                            setMedia(null)
                          }}
                        >
                          <X className='size-4' />
                        </Button>
                        <div className='absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-xs text-white'>
                          <p className='truncate'>{media.file.name}</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        type='button'
                        onClick={() => fileInputRef.current?.click()}
                        onDragEnter={(event) => {
                          event.preventDefault()
                          setDraggingSlot('first')
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDragLeave={() => setDraggingSlot(null)}
                        onDrop={(event) => {
                          event.preventDefault()
                          setDraggingSlot(null)
                          selectFile(event.dataTransfer.files[0])
                        }}
                        className={cn(
                          'flex aspect-[2.5/1] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors',
                          draggingSlot === 'first'
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-muted/40 hover:bg-muted'
                        )}
                      >
                        <span className='bg-background text-muted-foreground flex size-10 items-center justify-center rounded-full border'>
                          <UploadCloud className='size-5' />
                        </span>
                        <span className='text-sm font-medium'>
                          点击或拖拽上传
                        </span>
                        <span className='text-muted-foreground text-xs'>
                          {config.uploadHint}
                        </span>
                      </button>
                    )}
                  </>
                )}
                {mode === 'video' && (
                  <div className='mt-3 grid gap-3 sm:grid-cols-[1fr_120px]'>
                    <div className='space-y-2'>
                      <Label htmlFor='reference-video-url'>参考视频地址</Label>
                      <Input
                        id='reference-video-url'
                        type='url'
                        value={referenceVideoUrl}
                        onChange={(event) =>
                          setReferenceVideoUrl(event.target.value)
                        }
                        placeholder='https://example.com/reference.mp4'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='input-video-duration'>
                        视频时长（秒）
                      </Label>
                      <Input
                        id='input-video-duration'
                        type='number'
                        min='1'
                        value={inputVideoDuration}
                        onChange={(event) =>
                          setInputVideoDuration(Number(event.target.value))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode !== 'text' && (
              <AudioReferencesUploader
                media={referenceAudios}
                inputRef={referenceAudiosInputRef}
                accept={audioAccept}
                dragging={draggingSlot === 'audio'}
                onDraggingChange={(dragging) =>
                  setDraggingSlot(dragging ? 'audio' : null)
                }
                onSelect={selectReferenceAudios}
                onRemove={(index) =>
                  setReferenceAudios((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
              />
            )}

            <div className='space-y-3'>
              <Label>画面比例</Label>
              <div className='grid grid-cols-3 gap-2'>
                {ratios.map((item) => (
                  <button
                    key={item.value}
                    type='button'
                    aria-pressed={ratio === item.value}
                    onClick={() => setRatio(item.value)}
                    className={cn(
                      'flex h-20 flex-col items-center justify-center gap-2 rounded-lg border text-sm transition-colors',
                      ratio === item.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'rounded-[3px] border-2 border-current',
                        item.iconClass
                      )}
                    />
                    {item.value}
                  </button>
                ))}
              </div>
            </div>

            <div className='grid grid-cols-2 gap-5'>
              <div className='space-y-3'>
                <Label>视频时长</Label>
                <div className='grid grid-cols-3 gap-2'>
                  {durations.map((item) => (
                    <button
                      key={item}
                      type='button'
                      aria-pressed={duration === item}
                      onClick={() => setDuration(item)}
                      className={cn(
                        'h-9 rounded-md border text-sm transition-colors',
                        duration === item
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted'
                      )}
                    >
                      {item}秒
                    </button>
                  ))}
                </div>
              </div>
              <div className='space-y-3'>
                <Label>分辨率</Label>
                <div className='grid gap-2'>
                  {availableResolutions.map((item) => (
                    <button
                      key={item}
                      type='button'
                      aria-pressed={resolution === item}
                      onClick={() => setResolution(item)}
                      className={cn(
                        'h-9 rounded-md border text-sm uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                        resolution === item
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted'
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className='bg-muted/30 flex items-center justify-between rounded-lg border px-4 py-3'>
              <div>
                <Label htmlFor='generate-audio'>同步生成音频</Label>
                <p className='text-muted-foreground mt-1 text-xs'>
                  为画面生成环境声与音效
                </p>
              </div>
              <Switch
                id='generate-audio'
                checked={generateAudio}
                onCheckedChange={setGenerateAudio}
              />
            </div>
          </div>

          <div className='bg-muted/20 space-y-3 border-t px-5 py-4'>
            <div className='flex items-center justify-between gap-3 text-sm'>
              <span className='text-muted-foreground shrink-0'>预计消耗</span>
              {estimateQuery.isError ? (
                <span className='text-destructive break-words text-right font-medium'>
                  {estimateQuery.error instanceof Error
                    ? estimateQuery.error.message
                    : '积分预估失败'}
                </span>
              ) : (
                <span className='font-semibold'>
                  {estimateQuery.isFetching
                    ? '测算中'
                    : estimatedCredits != null
                      ? `${estimatedCredits} 积分`
                      : '暂不可用'}
                </span>
              )}
            </div>
            <Button
              className='h-11 w-full gap-2'
              disabled={
                submitting ||
                !selectedModel ||
                estimateQuery.isFetching ||
                estimatedCredits == null ||
                estimatedCredits > creditBalance
              }
              onClick={handleSubmit}
            >
              {submitting ? (
                <LoaderCircle className='size-4 animate-spin' />
              ) : (
                <WandSparkles className='size-4' />
              )}
              {submitting ? '正在提交…' : '生成视频'}
            </Button>
          </div>
        </section>

        <section className='flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-[#303238] text-white shadow-sm xl:min-h-0'>
          <div className='flex h-16 shrink-0 items-center justify-between border-b border-white/15 px-5'>
            <div className='flex items-center gap-2 font-semibold'>
              <Sparkles className='size-5 text-violet-400' />
              生成结果
            </div>
            {task && <TaskStatus status={task.status} />}
          </div>
          <div className='relative flex flex-1 items-center justify-center overflow-hidden p-5 md:p-10'>
            <div className='absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#00a04a_0_33%,#7367d8_33%_66%,#e6ad31_66%)]' />
            <div
              className='relative flex w-full max-w-4xl items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-[#202227] shadow-2xl'
              style={{ aspectRatio: ratio.replace(':', ' / ') }}
            >
              {outputUrl ? (
                <video
                  src={outputUrl}
                  controls
                  autoPlay
                  className='size-full object-contain'
                />
              ) : previewMedia ? (
                <>
                  {mode === 'image' ? (
                    <img
                      src={previewMedia.previewUrl}
                      alt='生成参考画面'
                      className='size-full object-contain opacity-65'
                    />
                  ) : (
                    <video
                      src={previewMedia.previewUrl}
                      muted
                      className='size-full object-contain opacity-65'
                    />
                  )}
                  <div className='absolute inset-0 flex items-center justify-center bg-black/20'>
                    <div className='flex size-16 items-center justify-center rounded-full border border-white/30 bg-black/35 backdrop-blur-sm'>
                      <Play className='ms-1 size-7' />
                    </div>
                  </div>
                </>
              ) : (
                <div className='flex max-w-sm flex-col items-center px-6 text-center'>
                  <div className='mb-5 flex size-16 items-center justify-center rounded-lg border border-white/15 bg-white/5'>
                    <Film className='size-8 text-white/75' />
                  </div>
                  <h3 className='text-base font-semibold'>等待生成内容</h3>
                  <p className='mt-2 text-sm leading-6 text-white/55'>
                    设置左侧参数并开始生成，任务进度和视频结果将在这里显示。
                  </p>
                </div>
              )}
              {task && !terminalStatuses.has(task.status) && (
                <div className='absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm'>
                  <LoaderCircle className='size-9 animate-spin text-emerald-400' />
                  <p className='mt-4 font-medium'>AI 正在生成视频</p>
                  <p className='mt-1 text-sm text-white/55'>
                    任务编号 {task.id}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className='flex min-h-14 shrink-0 items-center border-t border-white/10 px-5 text-xs text-white/50'>
            {task
              ? `模型：${availableModels.find((item) => item.code === task.model)?.name ?? task.model}`
              : '生成完成后可在此预览结果'}
          </div>
        </section>
      </main>
    </div>
  )
}

function TaskStatus({ status }: { status: VideoGenerationTask['status'] }) {
  const labels = {
    queued: '排队中',
    running: '生成中',
    succeeded: '已完成',
    failed: '生成失败',
    cancelled: '已取消',
    expired: '已过期',
  }
  const Icon =
    status === 'succeeded'
      ? CheckCircle2
      : status === 'running'
        ? LoaderCircle
        : Clock3
  return (
    <span className='flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs'>
      <Icon
        className={cn('size-3.5', status === 'running' && 'animate-spin')}
      />
      {labels[status]}
    </span>
  )
}

type ImageFrameUploaderProps = {
  label: string
  media: MediaState | null
  inputRef: RefObject<HTMLInputElement | null>
  accept: string
  compact: boolean
  dragging: boolean
  onDraggingChange: (dragging: boolean) => void
  onSelect: (file?: File) => void
  onRemove: () => void
}

function ImageFrameUploader({
  label,
  media,
  inputRef,
  accept,
  compact,
  dragging,
  onDraggingChange,
  onSelect,
  onRemove,
}: ImageFrameUploaderProps) {
  return (
    <div className='min-w-0 space-y-1.5'>
      {compact && (
        <div className='flex items-center gap-1.5 text-xs font-medium'>
          {label === '首帧' ? (
            <ImagePlus className='size-3.5' />
          ) : (
            <Images className='size-3.5' />
          )}
          {label}
        </div>
      )}
      <input
        ref={inputRef}
        type='file'
        accept={accept}
        className='sr-only'
        onChange={(event) => {
          onSelect(event.target.files?.[0])
          event.currentTarget.value = ''
        }}
      />
      {media ? (
        <div className='group relative aspect-video overflow-hidden rounded-lg border bg-black'>
          <img
            src={media.previewUrl}
            alt={`已上传的${label}图片预览`}
            className='size-full object-contain'
          />
          <Button
            type='button'
            size='icon'
            variant='secondary'
            aria-label={`移除${label}图片`}
            className='absolute top-1.5 right-1.5 size-7'
            onClick={onRemove}
          >
            <X className='size-3.5' />
          </Button>
          <div className='absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1.5 text-xs text-white'>
            <p className='truncate'>{media.file.name}</p>
          </div>
        </div>
      ) : (
        <button
          type='button'
          aria-label={`上传${label}图片`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault()
            onDraggingChange(true)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => onDraggingChange(false)}
          onDrop={(event) => {
            event.preventDefault()
            onDraggingChange(false)
            onSelect(event.dataTransfer.files[0])
          }}
          className={cn(
            'flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-dashed transition-colors',
            compact ? 'gap-1.5' : 'gap-2',
            dragging
              ? 'border-primary bg-primary/10'
              : 'border-border bg-muted/40 hover:bg-muted'
          )}
        >
          <span
            className={cn(
              'bg-background text-muted-foreground flex items-center justify-center rounded-full border',
              compact ? 'size-8' : 'size-10'
            )}
          >
            <UploadCloud className={compact ? 'size-4' : 'size-5'} />
          </span>
          <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
            点击或拖拽上传
          </span>
          {!compact && (
            <span className='text-muted-foreground text-xs'>
              支持 JPG、PNG、WEBP，最大 10MB
            </span>
          )}
        </button>
      )}
    </div>
  )
}

type ReferenceImagesUploaderProps = {
  media: MediaState[]
  inputRef: RefObject<HTMLInputElement | null>
  accept: string
  dragging: boolean
  onDraggingChange: (dragging: boolean) => void
  onSelect: (files?: FileList | File[]) => void
  onRemove: (index: number) => void
}

function ReferenceImagesUploader({
  media,
  inputRef,
  accept,
  dragging,
  onDraggingChange,
  onSelect,
  onRemove,
}: ReferenceImagesUploaderProps) {
  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between text-xs'>
        <span className='flex items-center gap-1.5 font-medium'>
          <Images className='size-3.5' />
          参考图片
        </span>
        <span className='text-muted-foreground'>{media.length}/9</span>
      </div>
      <input
        ref={inputRef}
        type='file'
        accept={accept}
        multiple
        className='sr-only'
        onChange={(event) => {
          onSelect(event.target.files ?? undefined)
          event.currentTarget.value = ''
        }}
      />
      <div className='grid grid-cols-3 gap-2'>
        {media.map((item, index) => (
          <div
            key={`${item.file.name}-${item.file.size}-${item.file.lastModified}-${index}`}
            className='group relative aspect-square min-w-0 overflow-hidden rounded-md border bg-black'
          >
            <img
              src={item.previewUrl}
              alt={`参考图片 ${index + 1}`}
              className='size-full object-cover'
            />
            <Button
              type='button'
              size='icon'
              variant='secondary'
              aria-label={`移除参考图片 ${index + 1}`}
              className='absolute top-1 right-1 size-6'
              onClick={() => onRemove(index)}
            >
              <X className='size-3' />
            </Button>
            <span className='absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-sm bg-black/70 text-[10px] font-medium text-white'>
              {index + 1}
            </span>
          </div>
        ))}
        {media.length < 9 && (
          <button
            type='button'
            aria-label='添加参考图片'
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault()
              onDraggingChange(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => onDraggingChange(false)}
            onDrop={(event) => {
              event.preventDefault()
              onDraggingChange(false)
              onSelect(event.dataTransfer.files)
            }}
            className={cn(
              'flex aspect-square min-w-0 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-xs font-medium transition-colors',
              dragging
                ? 'border-primary bg-primary/10'
                : 'border-border bg-muted/40 hover:bg-muted'
            )}
          >
            <span className='bg-background text-muted-foreground flex size-8 items-center justify-center rounded-full border'>
              <ImagePlus className='size-4' />
            </span>
            添加图片
          </button>
        )}
      </div>
      <p className='text-muted-foreground text-xs'>
        支持 1-9 张，每张最大 10MB
      </p>
    </div>
  )
}

type AudioReferencesUploaderProps = {
  media: AudioMediaState[]
  inputRef: RefObject<HTMLInputElement | null>
  accept: string
  dragging: boolean
  onDraggingChange: (dragging: boolean) => void
  onSelect: (files?: FileList | File[]) => void
  onRemove: (index: number) => void
}

function AudioReferencesUploader({
  media,
  inputRef,
  accept,
  dragging,
  onDraggingChange,
  onSelect,
  onRemove,
}: AudioReferencesUploaderProps) {
  const totalDuration = media.reduce((total, item) => total + item.duration, 0)

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-3'>
        <Label className='flex items-center gap-1.5'>
          <AudioLines className='size-4' />
          参考音频
        </Label>
        <span className='text-muted-foreground text-xs'>
          {media.length}/3 · {formatAudioDuration(totalDuration)}
        </span>
      </div>
      <input
        ref={inputRef}
        type='file'
        accept={accept}
        multiple
        className='sr-only'
        onChange={(event) => {
          onSelect(event.target.files ?? undefined)
          event.currentTarget.value = ''
        }}
      />
      {media.map((item, index) => (
        <div
          key={`${item.file.name}-${item.file.size}-${item.file.lastModified}-${index}`}
          className='bg-muted/20 space-y-2 rounded-md border p-2.5'
        >
          <div className='flex min-w-0 items-center gap-2'>
            <span className='bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border'>
              <AudioLines className='size-4' />
            </span>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-xs font-medium'>{item.file.name}</p>
              <p className='text-muted-foreground text-xs'>
                {formatAudioDuration(item.duration)}
              </p>
            </div>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              aria-label={`移除参考音频 ${index + 1}`}
              className='size-7 shrink-0'
              onClick={() => onRemove(index)}
            >
              <X className='size-3.5' />
            </Button>
          </div>
          <audio
            src={item.previewUrl}
            controls
            preload='metadata'
            className='h-8 w-full'
          />
        </div>
      ))}
      {media.length < maxAudioCount && (
        <button
          type='button'
          aria-label='添加参考音频'
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault()
            onDraggingChange(true)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => onDraggingChange(false)}
          onDrop={(event) => {
            event.preventDefault()
            onDraggingChange(false)
            onSelect(event.dataTransfer.files)
          }}
          className={cn(
            'flex h-12 w-full items-center justify-center gap-2 rounded-md border border-dashed text-sm font-medium transition-colors',
            dragging
              ? 'border-primary bg-primary/10'
              : 'border-border bg-muted/40 hover:bg-muted'
          )}
        >
          <UploadCloud className='size-4' />
          添加 WAV / MP3
        </button>
      )}
      <p className='text-muted-foreground text-xs'>
        单段 2-15 秒、最大 15MB，总时长不超过 15 秒
      </p>
    </div>
  )
}
