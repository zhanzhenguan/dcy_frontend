import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react'
import type { VideoGenerationTask } from '@/services/api/videoApi'
import { cn } from '@/utils/utils'

export const generationStages = [
  { key: 'submit', label: '提交任务' },
  { key: 'queued', label: '排队等待' },
  { key: 'running', label: 'AI 生成' },
  { key: 'succeeded', label: '生成完成' },
] as const

export function getGenerationStatusMeta(status: VideoGenerationTask['status']) {
  switch (status) {
    case 'queued':
      return {
        label: '排队等待中',
        description: '任务已提交，正在等待生成资源',
        // 节点：0 提交完成 · 1 排队中
        activeStage: 1,
        tone: 'pending' as const,
      }
    case 'running':
      return {
        label: '正在生成',
        description: 'AI 正在处理素材并渲染视频，请稍候',
        // 节点：0–1 完成 · 2 AI 生成中
        activeStage: 2,
        tone: 'running' as const,
      }
    case 'succeeded':
      return {
        label: '生成完成',
        description: '视频已生成，可以预览',
        // 节点：0–3 全部完成
        activeStage: 3,
        tone: 'success' as const,
      }
    case 'failed':
      return {
        label: '生成失败',
        description: '本次生成未完成，请检查素材或稍后重试',
        activeStage: 2,
        tone: 'error' as const,
      }
    case 'cancelled':
      return {
        label: '任务已取消',
        description: '视频生成任务已被取消',
        activeStage: 1,
        tone: 'error' as const,
      }
    case 'expired':
      return {
        label: '任务已过期',
        description: '生成任务等待时间过长，请重新发起生成',
        activeStage: 1,
        tone: 'error' as const,
      }
  }
}

/** 四步进度：目标阶段变化时逐级过渡 */
export const GenerationStageStepper = ({
  targetStage,
  isError,
  isSuccess,
}: {
  targetStage: number
  isError: boolean
  isSuccess: boolean
}) => {
  const [displayStage, setDisplayStage] = useState(0)
  const [pulseKey, setPulseKey] = useState(0)

  useEffect(() => {
    const goal = isSuccess
      ? generationStages.length - 1
      : Math.max(0, Math.min(targetStage, generationStages.length - 1))

    if (displayStage === goal) return

    // 回退（失败/取消）立即对齐；前进则逐级过渡
    if (displayStage > goal) {
      setDisplayStage(goal)
      return
    }

    const timer = window.setTimeout(() => {
      setDisplayStage((current) => {
        const next = Math.min(current + 1, goal)
        setPulseKey((key) => key + 1)
        return next
      })
    }, 420)

    return () => window.clearTimeout(timer)
  }, [targetStage, displayStage, isSuccess])

  const atFinalStage = displayStage >= generationStages.length - 1

  return (
    <ol className='flex items-start'>
      {generationStages.map((stage, index) => {
        const last = index === generationStages.length - 1
        // 成功态也等 displayStage 逐级到位后再点亮，避免 queued→succeeded 时跳过「AI 生成」
        const completed =
          index < displayStage ||
          (isSuccess && atFinalStage && index <= displayStage)
        const active =
          !isError && index === displayStage && !atFinalStage
        const failed = isError && index === displayStage
        const connectorFilled = index < displayStage

        return (
          <li
            key={stage.key}
            className={cn(
              'flex min-w-0 items-start',
              last ? 'shrink-0' : 'flex-1'
            )}
          >
            <div className='flex w-14 shrink-0 flex-col items-center gap-1'>
              <span
                key={`${stage.key}-${completed}-${active}-${failed}-${pulseKey}`}
                className={cn(
                  'relative z-[1] flex size-5 items-center justify-center rounded-full text-[10px] font-semibold',
                  'transition-[background-color,border-color,color,box-shadow,transform] duration-500 ease-out',
                  failed
                    ? 'scale-105 bg-red-500 text-white shadow-sm'
                    : completed
                      ? 'bg-primary text-primary-foreground scale-100 shadow-sm'
                      : active
                        ? 'border-primary text-primary scale-110 border bg-white shadow-[0_0_0_3px] shadow-primary/20 dark:bg-card'
                        : 'border-border text-muted-foreground/70 scale-100 border bg-background'
                )}
              >
                {failed ? (
                  <AlertCircle className='size-3 animate-in fade-in zoom-in-50 duration-300' />
                ) : completed ? (
                  <CheckCircle2 className='size-3 animate-in fade-in zoom-in-50 duration-300' />
                ) : active ? (
                  <LoaderCircle className='size-3 animate-spin' />
                ) : (
                  <span className='leading-none'>{index + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  'text-center text-[10px] leading-tight transition-colors duration-500',
                  failed
                    ? 'font-medium text-red-600 dark:text-red-400'
                    : completed || active
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                )}
              >
                {stage.label}
              </span>
            </div>
            {!last ? (
              <div
                className='bg-border mt-2 mx-0.5 h-1.5 min-w-2 flex-1 overflow-hidden rounded-full'
                aria-hidden
              >
                <div
                  className={cn(
                    'h-full origin-left rounded-full transition-transform duration-700 ease-out',
                    isError && connectorFilled ? 'bg-red-400' : 'bg-primary',
                    connectorFilled ? 'scale-x-100' : 'scale-x-0'
                  )}
                />
              </div>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
