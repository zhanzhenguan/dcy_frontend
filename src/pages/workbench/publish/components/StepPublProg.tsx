import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, Terminal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  type PlatformItem,
  type VideoPublishContent,
  type PlatformPublishProgress,
} from '../types'
import { PlatformIcon } from './PlatformIcons'

interface StepPublishingProgressProps {
  selectedPlatforms: PlatformItem[]
  selectedVideo: VideoPublishContent
  onComplete: () => void
}

export const StepPublishingProgress = ({
  selectedPlatforms,
  selectedVideo,
  onComplete,
}: StepPublishingProgressProps) => {
  const [platformStatuses, setPlatformStatuses] = useState<
    PlatformPublishProgress[]
  >(
    selectedPlatforms.map((p) => ({
      platformId: p.id,
      platformName: p.name,
      status: 'session_check',
      progress: 15,
      logs: [`[系统消息] 初始化 ${p.name} 模拟浏览器操作进程...`],
    }))
  )

  const [totalProgress, setTotalProgress] = useState<number>(20)
  const [logsList, setLogsList] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] 🚀 启动直连发布引擎组件...`,
    `[${new Date().toLocaleTimeString()}] 📦 读取待发布视频资源: ${selectedVideo.title}`,
    `[${new Date().toLocaleTimeString()}] 🔒 校验本地模拟浏览器 Cookie 授权缓存...`,
  ])

  // Simulation effect loop
  useEffect(() => {
    const timer = setInterval(() => {
      setPlatformStatuses((prev) => {
        const updated = prev.map((item) => {
          if (item.progress >= 100) {
            return {
              ...item,
              status: 'success' as const,
              postUrl: `https://${item.platformId}.com/p/mock_${Math.random().toString(36).substring(7)}`,
            }
          }

          const nextProg = Math.min(
            100,
            item.progress + Math.floor(Math.random() * 25) + 15
          )
          let nextStatus: PlatformPublishProgress['status'] = item.status
          let newLog = ''

          if (nextProg >= 95) {
            nextStatus = 'submitting'
            newLog = `[${item.platformName}] 正在提交发布，触发平台推荐流机制...`
          } else if (nextProg >= 60) {
            nextStatus = 'uploading'
            newLog = `[${item.platformName}] 自动填写标题、Hashtags 描述并上传封面图片...`
          } else if (nextProg >= 30) {
            nextStatus = 'uploading'
            newLog = `[${item.platformName}] 传输无损视频切片文件 (${nextProg}%)...`
          }

          if (newLog) {
            setLogsList((logs) => [
              ...logs,
              `[${new Date().toLocaleTimeString()}] ${newLog}`,
            ])
          }

          return {
            ...item,
            status: nextStatus,
            progress: nextProg,
            logs: [...item.logs, newLog].filter(Boolean),
          }
        })

        const avg = Math.round(
          updated.reduce((acc, curr) => acc + curr.progress, 0) / updated.length
        )
        setTotalProgress(avg)

        if (avg >= 100) {
          clearInterval(timer)
          setLogsList((logs) => [
            ...logs,
            `[${new Date().toLocaleTimeString()}] ✨ 所有平台直连发布动作成功完成！`,
          ])
          setTimeout(() => {
            onComplete()
          }, 1200)
        }

        return updated
      })
    }, 1200)

    return () => clearInterval(timer)
  }, [onComplete])

  return (
    <div className='space-y-6'>
      {/* Top Banner Status */}
      <div className='bg-card space-y-4 rounded-2xl border p-6 shadow-xs'>
        <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <span className='relative flex h-3 w-3'>
                <span className='bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75'></span>
                <span className='bg-primary relative inline-flex h-3 w-3 rounded-full'></span>
              </span>
              <h2 className='text-foreground text-lg font-bold'>
                直连发布进行中
              </h2>
              <Badge
                variant='outline'
                className='bg-primary/5 text-primary border-primary/20 font-mono text-xs'
              >
                模拟真实发布动作
              </Badge>
            </div>
            <p className='text-muted-foreground text-xs'>
              正在通过本地模拟内核并行对接社交媒体平台，请勿关闭浏览器
            </p>
          </div>

          {/* Overall Batch Progress */}
          <div className='flex shrink-0 items-center gap-3'>
            <div className='text-right'>
              <div className='text-muted-foreground text-xs'>总体任务进度</div>
              <div className='text-primary font-mono text-2xl font-black'>
                {totalProgress}%
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className='bg-muted/60 h-3 w-full overflow-hidden rounded-full border p-0.5'>
          <div
            className='from-primary/80 to-primary h-full rounded-full bg-gradient-to-r shadow-sm transition-all duration-500'
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Grid of Platform Execution Progress */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {platformStatuses.map((item) => {
          const isDone = item.progress >= 100

          return (
            <div
              key={item.platformId}
              className='bg-card space-y-3 rounded-2xl border p-4 transition-all'
            >
              <div className='flex items-center justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-2.5'>
                  <div className='bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'>
                    <PlatformIcon
                      platformId={item.platformId}
                      className='h-5 w-5'
                    />
                  </div>
                  <div className='min-w-0'>
                    <h4 className='text-foreground truncate text-sm font-bold'>
                      {item.platformName}
                    </h4>
                    <p className='text-muted-foreground truncate text-[11px]'>
                      {isDone
                        ? '发布成功 · 已可对外访问'
                        : '正在模拟点击与数据提交...'}
                    </p>
                  </div>
                </div>

                <div className='shrink-0'>
                  {isDone ? (
                    <Badge className='gap-1 border-emerald-500/30 bg-emerald-500/15 text-xs text-emerald-600 dark:text-emerald-400'>
                      <CheckCircle2 className='h-3.5 w-3.5' />
                      已完成
                    </Badge>
                  ) : (
                    <Badge
                      variant='outline'
                      className='bg-primary/5 text-primary border-primary/20 gap-1.5 font-mono text-xs'
                    >
                      <Loader2 className='text-primary h-3 w-3 animate-spin' />
                      {item.progress}%
                    </Badge>
                  )}
                </div>
              </div>

              {/* Progress Bar per Platform */}
              <div className='bg-muted/60 h-2 w-full overflow-hidden rounded-full'>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isDone ? 'bg-emerald-500' : 'bg-primary'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>

              {/* Status Message */}
              <div className='text-muted-foreground flex items-center justify-between pt-1 font-mono text-[11px]'>
                <span className='truncate'>
                  {isDone
                    ? '✨ 视频已上线生成永久公开 Link'
                    : item.logs[item.logs.length - 1] || '等待调度指令...'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Real-time Simulated Terminal Output Console */}
      <div className='space-y-3 rounded-2xl border bg-zinc-950 p-4 font-mono text-xs text-zinc-100 shadow-lg'>
        <div className='flex items-center justify-between border-b border-zinc-800 pb-2.5 text-zinc-400'>
          <div className='flex items-center gap-2'>
            <Terminal className='h-4 w-4 text-emerald-400' />
            <span className='font-semibold text-zinc-200'>
              模拟直连引擎实时输出控制台 (Live Logs)
            </span>
          </div>
          <span className='text-[10px] text-zinc-500'>Auto-scroll Enabled</span>
        </div>

        <div className='scrollbar-thin h-40 space-y-1.5 overflow-y-auto pr-2'>
          {logsList.map((log, i) => (
            <div
              key={i}
              className={`leading-relaxed ${
                log.includes('✨')
                  ? 'font-bold text-emerald-400'
                  : log.includes('🚀')
                    ? 'text-amber-400'
                    : 'text-zinc-300'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
