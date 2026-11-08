import { useEffect, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getVideoGeneration,
  type VideoDraft,
  type VideoGenerationTask,
} from '@/services/api/videoApi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/utils/utils'
import { useGenerateAgainFromDraft } from '../hooks/useGenerateAgainFromDraft'
import { fromApiReaction, useVideoReaction } from '../hooks/useVideoReaction'
import { AssetThumbControl } from './AssetThumbControl'

type VideoDetailModalProps = {
  tasks: VideoGenerationTask[]
  taskId: string | null
  open: boolean
  onClose: () => void
  onNavigate: (taskId: string) => void
  onRegenerate?: (task: VideoGenerationTask) => void
  /** 仅复用提示词进入创作页 */
  onReusePrompt?: (prompt: string) => void
  /** 再次生成成功后回调（用于刷新列表） */
  onGenerateAgainSuccess?: (task: VideoGenerationTask) => void
  /** 下载当前视频（走后端计数接口） */
  onDownload?: (task: VideoGenerationTask) => void | Promise<void>
  downloading?: boolean
  /** 「仅自己」列表时展示赞踩；「全部」不展示 */
  showReaction?: boolean
}

function statusLabel(status: VideoGenerationTask['status']) {
  switch (status) {
    case 'succeeded':
      return '已完成'
    case 'running':
      return '渲染中'
    case 'queued':
      return '排队中'
    case 'failed':
      return '失败'
    case 'cancelled':
      return '已取消'
    case 'expired':
      return '已过期'
    default:
      return status
  }
}

function creditStatusLabel(status?: string) {
  switch (status) {
    case 'charged':
      return '已扣费'
    case 'frozen':
      return '已冻结'
    case 'released':
      return '已释放'
    case 'none':
    case undefined:
    case '':
      return '未计费'
    default:
      return status
  }
}

function formatDetailTime(unix: number) {
  if (!unix) return '—'
  return new Date(unix * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function toolLabel(task: VideoGenerationTask) {
  if (task.input_video_duration > 0) return '视频生视频'
  return '参考图转视频'
}

/** 资产详情展示用模型名：具体变体收成系列版本号。 */
function formatModelDisplay(model?: string, provider?: string) {
  const raw = model?.trim() || provider?.trim() || ''
  if (!raw) return '—'
  if (
    raw === 'doubao-seedance-2-0-mini-260615' ||
    raw === 'doubao-seedance-2-0-fast-260128' ||
    raw === 'doubao-seedance-2-0-260128' ||
    raw.startsWith('doubao-seedance-2-0')
  ) {
    return 'doubao-seedance-2.0'
  }
  if (
    raw === 'doubao-seedance-2-5-260628' ||
    raw.startsWith('doubao-seedance-2-5')
  ) {
    return 'doubao-seedance-2.5'
  }
  return raw
}

export function VideoDetailModal({
  tasks,
  taskId,
  open,
  onClose,
  onNavigate,
  onRegenerate,
  onReusePrompt,
  onGenerateAgainSuccess,
  onDownload,
  downloading = false,
  showReaction = false,
}: VideoDetailModalProps) {
  const index = useMemo(
    () => tasks.findIndex((task) => task.id === taskId),
    [tasks, taskId]
  )
  const task = index >= 0 ? tasks[index] : null
  const mediaUrl = task ? task.file_url || task.video_url : ''
  const posterUrl = task?.first_frame_url || task?.last_frame_url || ''
  const hasPrev = index > 0
  const hasNext = index >= 0 && index < tasks.length - 1

  const taskDetailQuery = useQuery({
    queryKey: ['video-generation-detail', task?.id],
    queryFn: () => getVideoGeneration(task!.id),
    enabled: open && Boolean(task?.id),
    retry: false,
  })

  const detailTask = taskDetailQuery.data ?? task
  const taskDraftData = detailTask?.draft_data?.trim() || ''
  const { setReaction } = useVideoReaction(detailTask?.id)
  const thumbValue = fromApiReaction(detailTask?.my_reaction)

  const effectiveDraft = useMemo((): VideoDraft | undefined => {
    if (!taskDraftData || !detailTask) return undefined
    return {
      creator_nickname: detailTask.creator_nickname,
      id: detailTask.id,
      mode: 'custom',
      current_step: 4,
      draft_data: taskDraftData,
      project_title: detailTask.title || '',
      industry_name: detailTask.industry || '',
      created_at: detailTask.created_at,
      updated_at: detailTask.updated_at,
    }
  }, [detailTask, taskDraftData])

  const {
    promptText,
    materials,
    generatingAgain,
    canGenerateAgain,
    handleGenerateAgain,
  } = useGenerateAgainFromDraft({
    task: detailTask,
    draft: effectiveDraft,
    onSuccess: onGenerateAgainSuccess,
  })

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && hasPrev) {
        event.preventDefault()
        onNavigate(tasks[index - 1].id)
      }
      if (event.key === 'ArrowRight' && hasNext) {
        event.preventDefault()
        onNavigate(tasks[index + 1].id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, hasPrev, hasNext, index, onNavigate, tasks])

  const snapshotLoading = taskDetailQuery.isLoading
  const draftMissing = Boolean(task) && !snapshotLoading && !taskDraftData

  const promptPlaceholder = (() => {
    if (snapshotLoading) return '加载提示词…'
    if (draftMissing) return '该视频缺少向导快照，无法查看提示词'
    if (!promptText) return '快照中暂无提示词'
    return ''
  })()

  const canRegenerate =
    task &&
    (task.status === 'succeeded' || task.status === 'failed') &&
    Boolean(taskDraftData)

  const copyPrompt = async () => {
    if (!promptText) return
    try {
      await navigator.clipboard.writeText(promptText)
      toast.success('提示词已复制')
    } catch {
      toast.error('复制失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className='bg-zinc-950 text-zinc-100 border-zinc-800 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-none'
      >
        <DialogTitle className='sr-only'>
          {task?.title?.trim() || '视频详情'}
        </DialogTitle>

        <div className='relative flex min-h-0 flex-1'>
          <div className='relative min-h-0 min-w-0 flex-1 overflow-hidden bg-black'>
            {mediaUrl ? (
              <video
                key={task?.id}
                src={mediaUrl}
                poster={posterUrl || undefined}
                controls
                autoPlay
                playsInline
                className='absolute inset-0 size-full object-contain'
              />
            ) : (
              <div className='text-zinc-500 flex size-full items-center justify-center text-sm'>
                暂无可播放视频
              </div>
            )}

            {hasPrev ? (
              <Button
                type='button'
                size='icon'
                variant='secondary'
                className='absolute top-1/2 left-4 z-10 size-11 -translate-y-1/2 rounded-full bg-white/90 text-zinc-900 hover:bg-white'
                title='上一个'
                onClick={() => onNavigate(tasks[index - 1].id)}
              >
                <ChevronLeft className='size-5' />
              </Button>
            ) : null}

            {hasNext ? (
              <Button
                type='button'
                size='icon'
                variant='secondary'
                className='absolute top-1/2 right-4 z-10 size-11 -translate-y-1/2 rounded-full bg-white/90 text-zinc-900 hover:bg-white'
                title='下一个'
                onClick={() => onNavigate(tasks[index + 1].id)}
              >
                <ChevronRight className='size-5' />
              </Button>
            ) : null}
          </div>

          <aside className='border-zinc-800 flex w-full max-w-md shrink-0 flex-col border-l bg-zinc-900/95 max-lg:absolute max-lg:inset-x-0 max-lg:bottom-0 max-lg:max-h-[42vh] max-lg:max-w-none max-lg:rounded-t-2xl lg:max-w-96'>
            <div className='border-zinc-800 flex items-start justify-between gap-3 border-b px-4 py-3'>
              <div className='min-w-0'>
                <p className='truncate text-sm font-semibold text-zinc-100'>
                  {task?.title?.trim() || '未命名视频'}
                </p>
                <p className='mt-0.5 text-[11px] text-zinc-500'>
                  {index >= 0 ? `${index + 1} / ${tasks.length}` : ''}
                </p>
              </div>
              <div className='flex shrink-0 items-center gap-1'>
                {showReaction && detailTask ? (
                  <AssetThumbControl
                    key={detailTask.id}
                    variant='pair'
                    value={thumbValue}
                    onChange={setReaction}
                  />
                ) : null}
                <Button
                  type='button'
                  size='icon'
                  variant='ghost'
                  className='size-8 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  title='关闭'
                  onClick={onClose}
                >
                  <X className='size-4' />
                </Button>
              </div>
            </div>

            <div className='min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4'>
              {!task ? (
                <p className='text-sm text-zinc-500'>未找到视频</p>
              ) : (
                <>
                  <section className='space-y-3'>
                    <h3 className='text-xs font-semibold tracking-wide text-zinc-400'>
                      设置
                    </h3>
                    <div className='flex gap-3'>
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt=''
                          className='size-16 shrink-0 rounded-lg object-cover'
                        />
                      ) : (
                        <div className='size-16 shrink-0 rounded-lg bg-zinc-800' />
                      )}
                      <div className='min-w-0 flex-1 space-y-1.5'>
                        <div className='flex items-center justify-between gap-2'>
                          <p className='text-xs font-medium text-zinc-300'>
                            提示词
                          </p>
                          {promptText ? (
                            <button
                              type='button'
                              className='text-zinc-500 hover:text-zinc-200'
                              title='复制提示词'
                              onClick={() => void copyPrompt()}
                            >
                              <Copy className='size-3.5' />
                            </button>
                          ) : null}
                        </div>
                        <p className='max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-zinc-400'>
                          {promptText || promptPlaceholder}
                        </p>
                      </div>
                    </div>

                    {materials.length > 0 ? (
                      <div className='space-y-2'>
                        <p className='text-xs text-zinc-500'>[参考素材分工]</p>
                        <div className='flex flex-wrap gap-2'>
                          {materials.map((item, materialIndex) => (
                            <div
                              key={item.id || item.url || materialIndex}
                              className='overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800'
                            >
                              {item.url ? (
                                <img
                                  src={item.url}
                                  alt={item.name || `图${materialIndex + 1}`}
                                  className='size-14 object-cover'
                                />
                              ) : null}
                              <p className='px-1.5 py-1 text-center text-[10px] text-sky-400'>
                                @{item.name || `Image ${materialIndex + 1}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className='space-y-3'>
                    <h3 className='text-xs font-semibold tracking-wide text-zinc-400'>
                      信息
                    </h3>
                    <dl className='space-y-2.5 text-xs'>
                      <InfoRow label='工具' value={toolLabel(task)} />
                      <InfoRow
                        label='状态'
                        value={
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                              task.status === 'succeeded'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : task.status === 'failed'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-zinc-700 text-zinc-300'
                            )}
                          >
                            {statusLabel(task.status)}
                          </span>
                        }
                      />
                      <InfoRow
                        label='模型'
                        value={formatModelDisplay(task.model, task.provider)}
                      />
                      <InfoRow
                        label='规格'
                        value={
                          [
                            task.resolution,
                            task.ratio,
                            task.duration ? `${task.duration}s` : '',
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'
                        }
                      />
                      <InfoRow
                        label='平台'
                        value={task.platform?.trim() || '—'}
                      />
                      <InfoRow
                        label='行业'
                        value={task.industry?.trim() || '—'}
                      />
                      <InfoRow
                        label='积分'
                        value={`${(task.charged_credits || task.estimated_credits || 0).toLocaleString()}（${creditStatusLabel(task.credit_status)}）`}
                      />
                      <InfoRow
                        label='创建者'
                        value={task.creator_nickname?.trim() || '—'}
                      />
                      <InfoRow
                        label='创建时间'
                        value={formatDetailTime(task.created_at)}
                      />
                      <InfoRow
                        label='上次修改'
                        value={formatDetailTime(task.updated_at)}
                      />
                      <InfoRow
                        label='我的下载'
                        value={
                          (task.download_count ?? 0) > 0
                            ? `${task.download_count} 次${
                                task.last_downloaded_at
                                  ? ` · 最近 ${formatDetailTime(task.last_downloaded_at)}`
                                  : ''
                              }`
                            : '尚未下载'
                        }
                      />
                    </dl>
                  </section>

                  <section className='space-y-2'>
                    <h3 className='text-xs font-semibold tracking-wide text-zinc-400 uppercase'>
                      更多
                    </h3>
                    <div className='grid grid-cols-2 gap-2'>
                      {canRegenerate && onRegenerate ? (
                        <Button
                          type='button'
                          variant='secondary'
                          className='h-9 w-full min-w-0 justify-center gap-2 bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                          onClick={() => onRegenerate(task)}
                        >
                          <RotateCcw className='size-3.5' />
                          重新生成
                        </Button>
                      ) : null}
                      {promptText && onReusePrompt ? (
                        <Button
                          type='button'
                          variant='secondary'
                          className='h-9 w-full min-w-0 justify-center gap-2 bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                          onClick={() => onReusePrompt(promptText)}
                        >
                          <Copy className='size-3.5' />
                          复用提示
                        </Button>
                      ) : null}
                      {canGenerateAgain ? (
                        <Button
                          type='button'
                          variant='secondary'
                          disabled={generatingAgain || snapshotLoading}
                          className='h-9 w-full min-w-0 justify-center gap-2 bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                          onClick={() => void handleGenerateAgain()}
                        >
                          {generatingAgain ? (
                            <Loader2 className='size-3.5 animate-spin' />
                          ) : (
                            <Sparkles className='size-3.5' />
                          )}
                          再次生成
                        </Button>
                      ) : null}
                    </div>
                  </section>

                  <section className='space-y-2 pb-2'>
                    <h3 className='text-xs font-semibold tracking-wide text-zinc-400 uppercase'>
                      下一步
                    </h3>
                    {mediaUrl && onDownload ? (
                      <Button
                        type='button'
                        className='h-10 w-full gap-2'
                        disabled={downloading}
                        onClick={() => void onDownload(task)}
                      >
                        {downloading ? (
                          <Loader2 className='size-4 animate-spin' />
                        ) : (
                          <Download className='size-4' />
                        )}
                        下载
                      </Button>
                    ) : null}
                  </section>
                </>
              )}
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className='grid grid-cols-[5.5rem_1fr] items-start gap-3'>
      <dt className='text-zinc-500'>{label}</dt>
      <dd className='min-w-0 break-words text-zinc-200'>{value}</dd>
    </div>
  )
}
