import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Film,
  History,
  Hourglass,
  LayoutGrid,
  List,
} from 'lucide-react'
import { toast } from 'sonner'
import { VIDEO_TASK_RESYNC_EVENT, VIDEO_TASK_STATUS_EVENT } from '@/hooks/useMessageNotifications'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  deleteVideoGeneration,
  listVideoGenerations,
  type VideoGenerationTask,
} from '@/services/api/videoApi'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from './workbenchShared'

type ViewMode = 'list' | 'grid'

function statusMeta(task: VideoGenerationTask) {
  switch (task.status) {
    case 'succeeded':
      return {
        dot: 'bg-emerald-500',
        label: `生成成功 · ${formatRelativeTime(task.updated_at || task.created_at)}`,
      }
    case 'running':
      return {
        dot: 'bg-amber-500',
        label: '正在生成',
      }
    case 'queued':
      return {
        dot: 'bg-sky-500',
        label: `排队中 · ${formatRelativeTime(task.updated_at || task.created_at)}`,
      }
    case 'failed':
      return {
        dot: 'bg-rose-500',
        label: `生成失败 · ${formatRelativeTime(task.updated_at || task.created_at)}`,
      }
    case 'cancelled':
      return {
        dot: 'bg-slate-400',
        label: `已取消 · ${formatRelativeTime(task.updated_at || task.created_at)}`,
      }
    default:
      return {
        dot: 'bg-slate-400',
        label: formatRelativeTime(task.updated_at || task.created_at),
      }
  }
}

/** 个人工作台：最近生成 */
export const RecentGenerations = ({
  compact = false,
}: {
  compact?: boolean
}) => {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  useEffect(() => {
    const refreshLists = () => {
      void queryClient.invalidateQueries({
        queryKey: ['workbench', 'recent-generations'],
      })
      void queryClient.invalidateQueries({ queryKey: ['workbench', 'video-running'] })
      void queryClient.invalidateQueries({ queryKey: ['workbench', 'video-queued'] })
    }
    window.addEventListener(VIDEO_TASK_STATUS_EVENT, refreshLists)
    window.addEventListener(VIDEO_TASK_RESYNC_EVENT, refreshLists)
    return () => {
      window.removeEventListener(VIDEO_TASK_STATUS_EVENT, refreshLists)
      window.removeEventListener(VIDEO_TASK_RESYNC_EVENT, refreshLists)
    }
  }, [queryClient])

  const recentQuery = useQuery({
    queryKey: ['workbench', 'recent-generations'],
    queryFn: () => listVideoGenerations({ page: 1, page_size: 8 }),
  })

  const cancelMutation = useMutation({
    mutationFn: deleteVideoGeneration,
    onSuccess: () => {
      toast.success('已取消生成任务')
      void queryClient.invalidateQueries({
        queryKey: ['workbench', 'recent-generations'],
      })
      void queryClient.invalidateQueries({ queryKey: ['workbench', 'video-running'] })
      void queryClient.invalidateQueries({ queryKey: ['workbench', 'video-queued'] })
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '取消任务失败')),
  })

  const items = recentQuery.data?.items ?? []

  return (
    <article
      className={cn(
        'bg-card flex w-full flex-col rounded-2xl border p-5 shadow-sm',
        compact ? 'min-h-80' : 'h-[586px]'
      )}
    >
      <div className='flex shrink-0 items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <History className='text-primary size-5' />
          <h2 className='text-base font-semibold'>最近生成</h2>
        </div>
        <div className='bg-muted inline-flex rounded-lg p-0.5'>
          <button
            type='button'
            title='网格视图'
            aria-label='网格视图'
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex size-8 items-center justify-center rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-background text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className='size-4' />
          </button>
          <button
            type='button'
            title='列表视图'
            aria-label='列表视图'
            onClick={() => setViewMode('list')}
            className={cn(
              'flex size-8 items-center justify-center rounded-md transition-colors',
              viewMode === 'list'
                ? 'bg-background text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className='size-4' />
          </button>
        </div>
      </div>

      <div className='mt-5 min-h-0 flex-1 overflow-y-auto'>
        {recentQuery.isLoading ? (
          <p className='text-muted-foreground py-12 text-center text-sm'>
            加载中...
          </p>
        ) : items.length === 0 ? (
          <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-3 text-sm'>
            <p>还没有生成记录</p>
            <Button asChild size='sm'>
              <Link to='/create'>去创作</Link>
            </Button>
          </div>
        ) : viewMode === 'list' ? (
          <div className='space-y-3'>
            {items.map((task) => (
              <RecentListItem
                key={task.id}
                task={task}
                cancelling={
                  cancelMutation.isPending &&
                  cancelMutation.variables === task.id
                }
                onCancel={() => {
                  if (!window.confirm('确定取消该生成任务吗？')) return
                  cancelMutation.mutate(task.id)
                }}
              />
            ))}
          </div>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            {items.map((task) => (
              <RecentGridItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>

      <div className='mt-5 flex shrink-0 justify-center'>
        <Link
          to='/tasks'
          className='text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline'
        >
          查看全部
          <ArrowRight className='size-3.5' />
        </Link>
      </div>
    </article>
  )
}

function RecentListItem({
  task,
  cancelling,
  onCancel,
}: {
  task: VideoGenerationTask
  cancelling: boolean
  onCancel: () => void
}) {
  const meta = statusMeta(task)
  const poster = task.first_frame_url || task.last_frame_url
  const canCancel = task.status === 'running' || task.status === 'queued'

  return (
    <div className='hover:bg-muted/40 flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors'>
      <Link
        to='/tasks'
        search={{ task: task.id }}
        className='flex min-w-0 flex-1 items-center gap-3'
      >
        <Thumb
          poster={poster}
          duration={task.duration}
          pending={canCancel}
        />
        <span className='min-w-0 flex-1'>
          <span className='block truncate text-sm font-medium'>
            {task.title?.trim() || '未命名视频'}
          </span>
          <span className='text-muted-foreground mt-1 flex items-center gap-1.5 text-xs'>
            <span className={cn('size-1.5 shrink-0 rounded-full', meta.dot)} />
            <span className='truncate'>{meta.label}</span>
          </span>
        </span>
      </Link>
      {canCancel ? (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-7 shrink-0 rounded-full px-3 text-xs'
          disabled={cancelling}
          onClick={onCancel}
        >
          {cancelling ? '取消中...' : '取消'}
        </Button>
      ) : null}
    </div>
  )
}

function RecentGridItem({ task }: { task: VideoGenerationTask }) {
  const meta = statusMeta(task)
  const poster = task.first_frame_url || task.last_frame_url
  const canCancel = task.status === 'running' || task.status === 'queued'

  return (
    <Link
      to='/tasks'
      search={{ task: task.id }}
      className='hover:border-primary/40 group overflow-hidden rounded-xl border transition-colors'
    >
      <div className='bg-muted relative aspect-video overflow-hidden'>
        {poster ? (
          <img
            src={poster}
            alt=''
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
          />
        ) : (
          <div className='text-muted-foreground flex h-full items-center justify-center'>
            {canCancel ? (
              <Hourglass className='size-6' />
            ) : (
              <Film className='size-6' />
            )}
          </div>
        )}
        {task.duration > 0 ? (
          <span className='bg-background/90 absolute right-1.5 bottom-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium'>
            {Math.round(task.duration)}s
          </span>
        ) : null}
      </div>
      <div className='space-y-1.5 p-3'>
        <p className='truncate text-sm font-medium'>
          {task.title?.trim() || '未命名视频'}
        </p>
        <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
          <span className={cn('size-1.5 shrink-0 rounded-full', meta.dot)} />
          <span className='truncate'>{meta.label}</span>
        </p>
      </div>
    </Link>
  )
}

function Thumb({
  poster,
  duration,
  pending,
}: {
  poster?: string
  duration: number
  pending: boolean
}) {
  return (
    <span className='bg-muted relative size-14 shrink-0 overflow-hidden rounded-lg'>
      {poster ? (
        <img src={poster} alt='' className='h-full w-full object-cover' />
      ) : (
        <span className='text-muted-foreground flex h-full items-center justify-center'>
          {pending ? (
            <Hourglass className='size-5' />
          ) : (
            <Film className='size-5' />
          )}
        </span>
      )}
      {duration > 0 ? (
        <span className='bg-background/90 absolute right-0.5 bottom-0.5 rounded px-1 text-[9px] font-medium'>
          {Math.round(duration)}s
        </span>
      ) : null}
    </span>
  )
}
