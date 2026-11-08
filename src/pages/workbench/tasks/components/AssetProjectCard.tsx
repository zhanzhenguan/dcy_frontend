import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Download,
  Film,
  Loader2,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import type { VideoGenerationTask } from '@/services/api/videoApi'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { HoverVideoThumb } from '@/components/common'
import { cn } from '@/utils/utils'
import { AssetCreatorMeta } from './AssetCreatorMeta'
import { fromApiReaction, useVideoReaction } from '../hooks/useVideoReaction'

function formatDurationClock(totalSeconds: number) {
  const sec = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(sec / 60)
  const seconds = sec % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function useHoverDurationCountdown(durationSec: number, hovering: boolean) {
  const safeDuration = Math.max(0, Math.floor(durationSec))
  const [remaining, setRemaining] = useState(safeDuration)

  useEffect(() => {
    if (!hovering || safeDuration <= 0) {
      setRemaining(safeDuration)
      return
    }

    setRemaining(safeDuration)
    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 0) return safeDuration
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [hovering, safeDuration])

  return formatDurationClock(remaining)
}

type AssetProjectCardProps = {
  task: VideoGenerationTask
  selected: boolean
  selectionMode?: boolean
  /** 提交人筛选为「全部」时展示创作者 */
  showCreator?: boolean
  /** 「仅自己」列表展示赞踩；「全部」不展示 */
  showThumb?: boolean
  onSelectedChange: (selected: boolean) => void
  onOpen: () => void
  onEdit: () => void
  onDelete?: () => void
  onDownload?: () => void
  downloading?: boolean
}

export const AssetProjectCard = ({
  task,
  selected,
  selectionMode = false,
  showCreator = false,
  showThumb = false,
  onSelectedChange,
  onOpen,
  onEdit,
  onDelete,
  onDownload,
  downloading = false,
}: AssetProjectCardProps) => {
  const [hovering, setHovering] = useState(false)
  const mediaUrl = task.file_url || task.video_url
  const posterUrl = task.first_frame_url || task.last_frame_url
  const durationSec = Number(task.duration) || 0
  const durationLabel = useHoverDurationCountdown(durationSec, hovering)
  const canRegenerate =
    task.status === 'succeeded' || task.status === 'failed'
  const canDelete =
    (task.status === 'succeeded' || task.status === 'failed') && Boolean(onDelete)
  const canDownload = Boolean(mediaUrl) && Boolean(onDownload)
  const projectTitle = task.title?.trim() || '未命名项目'
  const creatorName = task.creator_nickname?.trim() || '未知用户'
  const { setReaction } = useVideoReaction(task.id)
  const thumbValue = fromApiReaction(task.my_reaction)
  const showToolbar =
    !selectionMode && (canRegenerate || canDelete || canDownload)

  return (
    <Card
      className={cn(
        'group bg-card text-card-foreground border-border/60 hover:border-primary/40 relative gap-0 overflow-hidden rounded-xl border py-0 shadow-xs transition-all duration-200 hover:shadow-md',
        selected && 'border-primary ring-primary/30 ring-2'
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className='relative aspect-square w-full cursor-pointer overflow-hidden bg-zinc-950/80'
        onClick={() => {
          if (selectionMode) {
            onSelectedChange(!selected)
            return
          }
          if (mediaUrl) onOpen()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          if (selectionMode) {
            onSelectedChange(!selected)
            return
          }
          if (mediaUrl) onOpen()
        }}
        role={selectionMode || mediaUrl ? 'button' : undefined}
        tabIndex={selectionMode || mediaUrl ? 0 : undefined}
      >
        {mediaUrl ? (
          <HoverVideoThumb
            src={mediaUrl}
            poster={posterUrl || undefined}
            alt={projectTitle}
            className='h-full w-full'
          />
        ) : posterUrl ? (
          <img
            src={posterUrl}
            alt={projectTitle}
            className='h-full w-full object-cover'
          />
        ) : (
          <div className='flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-zinc-800 to-zinc-950 p-3 text-center text-zinc-400'>
            <Film className='mb-2 size-8 opacity-30' />
          </div>
        )}

        <div
          className={cn(
            'absolute top-2 left-2 z-30 transition-opacity',
            hovering || selected || selectionMode
              ? 'opacity-100'
              : 'pointer-events-none opacity-0'
          )}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(value) => onSelectedChange(value === true)}
            aria-label={`选择 ${projectTitle}`}
            className='size-5 rounded-full border-white/80 bg-black/35 shadow-sm data-[state=checked]:border-primary'
          />
        </div>

        {durationSec > 0 ? (
          <span className='absolute bottom-2 left-2 z-20 rounded-md bg-black/65 px-1.5 py-0.5 font-mono text-[11px] leading-none text-white tabular-nums shadow-sm'>
            {durationLabel}
          </span>
        ) : null}

        {task.status === 'running' || task.status === 'queued' ? (
          <div className='absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 p-3 text-white backdrop-blur-xs'>
            <div className='border-primary/30 border-t-primary mb-2 flex size-10 animate-spin items-center justify-center rounded-full border-2'>
              <Loader2 className='text-primary size-5 animate-spin' />
            </div>
            <span className='text-primary-foreground text-xs font-semibold'>
              {task.status === 'running' ? '渲染中' : '排队中'}
            </span>
          </div>
        ) : task.status === 'failed' ? (
          <div className='absolute inset-0 z-20 flex flex-col items-center justify-center space-y-2 bg-black/60 p-3 text-center text-white backdrop-blur-xs'>
            <AlertTriangle className='size-7 text-red-400' />
            <span className='line-clamp-2 text-[11px] font-medium text-red-200'>
              {task.error_message || '生成失败'}
            </span>
          </div>
        ) : null}

        {showToolbar ? (
          <div
            className='absolute top-2 right-2 z-30 flex translate-y-1 items-center gap-1 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100'
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {canRegenerate ? (
              <Button
                size='icon'
                variant='secondary'
                className='size-8 rounded-full bg-white/90 text-zinc-900 shadow-sm hover:bg-white'
                title='重新生成'
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
              >
                <RotateCcw className='size-3.5' />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size='icon'
                variant='secondary'
                className='size-8 rounded-full bg-white/90 text-zinc-900 shadow-sm hover:bg-white hover:text-red-600'
                title='删除'
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.()
                }}
              >
                <Trash2 className='size-3.5' />
              </Button>
            ) : null}
            {canDownload ? (
              <Button
                size='icon'
                variant='secondary'
                className='size-8 rounded-full bg-white/90 text-zinc-900 shadow-sm hover:bg-white'
                title='下载'
                disabled={downloading}
                onClick={(e) => {
                  e.stopPropagation()
                  onDownload?.()
                }}
              >
                {downloading ? (
                  <Loader2 className='size-3.5 animate-spin' />
                ) : (
                  <Download className='size-3.5' />
                )}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {showCreator || showThumb ? (
        <AssetCreatorMeta
          name={creatorName}
          avatarUrl={task.creator_avatar_url}
          createdAt={task.created_at}
          showCreator={showCreator}
          showThumb={showThumb && task.status === 'succeeded'}
          thumbValue={thumbValue}
          onThumbChange={setReaction}
          className='border-border/50 border-t px-2.5'
        />
      ) : null}
    </Card>
  )
}
