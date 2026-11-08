import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FolderOpen,
  LoaderCircle,
} from 'lucide-react'
import type { VideoGenerationTask } from '@/services/api/videoApi'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/utils/utils'
import { terminalStatuses } from '../constants'
import { GenerationTaskCard } from './GenerationTaskCard'

type GenerationTaskListProps = {
  activeTasks: VideoGenerationTask[]
  onPreview: (url: string) => void
  onVideoUrlChange?: (taskId: string, previous: string, next: string) => void
}

function summarizeTasks(tasks: VideoGenerationTask[]) {
  const total = tasks.length
  const succeeded = tasks.filter((task) => task.status === 'succeeded').length
  const failed = tasks.filter(
    (task) =>
      task.status === 'failed' ||
      task.status === 'cancelled' ||
      task.status === 'expired'
  ).length
  const inflight = total - succeeded - failed

  if (inflight > 0) {
    return {
      label: `${inflight}/${total} 进行中`,
      tone: 'running' as const,
      Icon: LoaderCircle,
    }
  }
  if (failed > 0 && succeeded === 0) {
    return {
      label: `${failed} 个失败`,
      tone: 'error' as const,
      Icon: AlertCircle,
    }
  }
  if (failed > 0) {
    return {
      label: `${succeeded} 成功 · ${failed} 失败`,
      tone: 'mixed' as const,
      Icon: AlertCircle,
    }
  }
  return {
    label: `${total} 个全部完成`,
    tone: 'success' as const,
    Icon: CheckCircle2,
  }
}

export const GenerationTaskList = ({
  activeTasks,
  onPreview,
}: GenerationTaskListProps) => {
  const hasInflight = activeTasks.some(
    (task) => !terminalStatuses.has(task.status)
  )
  const [panelOpen, setPanelOpen] = useState(true)
  const summary = useMemo(() => summarizeTasks(activeTasks), [activeTasks])

  useEffect(() => {
    if (hasInflight) setPanelOpen(true)
  }, [hasInflight])

  if (activeTasks.length === 0) return null

  const SummaryIcon = summary.Icon

  return (
    <Collapsible
      open={panelOpen}
      onOpenChange={setPanelOpen}
      className='bg-card mt-3 overflow-hidden rounded-xl border shadow-sm'
    >
      <div className='flex items-center gap-2 px-3 py-2'>
        <CollapsibleTrigger
          type='button'
          className='hover:bg-muted/40 flex min-w-0 flex-1 items-center gap-2 rounded-md text-left outline-none transition-colors'
        >
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full',
              summary.tone === 'error'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : 'bg-primary/10 text-primary'
            )}
          >
            <SummaryIcon
              className={cn(
                'size-3.5',
                summary.tone === 'running' && 'animate-spin'
              )}
            />
          </span>
          <div className='flex min-w-0 flex-1 items-baseline gap-2'>
            <p className='text-foreground truncate text-sm font-semibold'>
              视频生成任务
            </p>
            <p className='text-muted-foreground shrink-0 text-[11px]'>
              {summary.label}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 shrink-0 transition-transform duration-200',
              panelOpen && 'rotate-180'
            )}
          />
        </CollapsibleTrigger>

        <Button asChild variant='outline' size='sm' className='h-8 shrink-0'>
          <Link to='/tasks' className='inline-flex items-center gap-1.5'>
            <FolderOpen className='size-3.5' />
            查看视频
          </Link>
        </Button>
      </div>

      <CollapsibleContent className='CollapsibleContent'>
        <div className='border-t px-3 py-2.5'>
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
            {activeTasks.map((task, taskIndex) => (
              <GenerationTaskCard
                key={task.id}
                task={task}
                taskIndex={taskIndex}
                onPreview={onPreview}
              />
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
