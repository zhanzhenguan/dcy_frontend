import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Play,
} from 'lucide-react'
import type { VideoGenerationTask } from '@/services/api/videoApi'
import { cn } from '@/utils/utils'
import { getGenerationStatusMeta } from './GenerationStageStepper'

type GenerationTaskCardProps = {
  task: VideoGenerationTask
  taskIndex: number
  onPreview: (url: string) => void
}

export const GenerationTaskCard = ({
  task,
  taskIndex,
  onPreview,
}: GenerationTaskCardProps) => {
  const statusMeta = getGenerationStatusMeta(task.status)
  const isError = statusMeta.tone === 'error'
  const isSuccess = statusMeta.tone === 'success'
  const previewUrl = task.file_url || task.video_url
  const posterUrl = task.first_frame_url || task.last_frame_url
  const StatusIcon = isError
    ? AlertCircle
    : isSuccess
      ? CheckCircle2
      : task.status === 'queued'
        ? Clock3
        : LoaderCircle

  const handleOpen = () => {
    if (isSuccess && previewUrl) onPreview(previewUrl)
  }

  return (
    <button
      type='button'
      onClick={handleOpen}
      disabled={!isSuccess || !previewUrl}
      title={
        isError && task.error_message
          ? task.error_message
          : `${statusMeta.label} · 任务 ${taskIndex + 1}`
      }
      className={cn(
        'group bg-background relative flex min-w-0 flex-col overflow-hidden rounded-lg border text-left transition-colors',
        isError
          ? 'border-red-200/80 dark:border-red-500/30'
          : isSuccess
            ? 'hover:border-primary/40 border-border'
            : 'border-primary/25',
        isSuccess && previewUrl
          ? 'cursor-pointer'
          : 'cursor-default disabled:opacity-100'
      )}
    >
      <div
        className={cn(
          'relative aspect-[4/3] w-full overflow-hidden',
          isError
            ? 'bg-red-50 dark:bg-red-500/10'
            : 'bg-muted/70 dark:bg-muted/40'
        )}
      >
        {isSuccess && (posterUrl || previewUrl) ? (
          posterUrl ? (
            <img
              src={posterUrl}
              alt=''
              className='h-full w-full object-cover'
            />
          ) : (
            <video
              src={previewUrl}
              muted
              playsInline
              preload='metadata'
              className='h-full w-full object-cover'
            />
          )
        ) : (
          <div className='flex h-full w-full flex-col items-center justify-center gap-1.5 px-2'>
            <span
              className={cn(
                'flex size-8 items-center justify-center rounded-full',
                isError
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-primary/10 text-primary'
              )}
            >
              <StatusIcon
                className={cn(
                  'size-4',
                  !isError && !isSuccess && 'animate-spin'
                )}
              />
            </span>
            <span
              className={cn(
                'text-center text-[10px] leading-tight',
                isError
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground'
              )}
            >
              {isSuccess && !previewUrl ? '成片加载中…' : statusMeta.label}
            </span>
          </div>
        )}

        {isSuccess && previewUrl ? (
          <span className='absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/40'>
            <span className='bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full shadow-md transition-transform group-hover:scale-105'>
              <Play className='size-3.5 fill-current' />
            </span>
          </span>
        ) : null}

        {!isSuccess && !isError ? (
          <div className='absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-black/10'>
            <div className='bg-primary h-full w-2/3 animate-pulse' />
          </div>
        ) : null}
      </div>

      <div className='flex items-center justify-between gap-1 px-2 py-1.5'>
        <p className='text-foreground truncate text-[11px] font-medium'>
          任务 {taskIndex + 1}
        </p>
        <span
          className={cn(
            'shrink-0 text-[10px]',
            isError
              ? 'text-red-600 dark:text-red-400'
              : isSuccess
                ? 'text-primary'
                : 'text-muted-foreground'
          )}
        >
          {isSuccess ? '完成' : isError ? '失败' : statusMeta.label}
        </span>
      </div>
    </button>
  )
}
