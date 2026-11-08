import {
  CheckCircle2,
  ExternalLink,
  Copy,
  RotateCcw,
  History,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { type PlatformItem, type VideoPublishContent } from '../types'
import { PlatformIcon } from './PlatformIcons'
import { toast } from 'sonner'

interface StepPublishCompleteProps {
  selectedPlatforms: PlatformItem[]
  selectedVideo: VideoPublishContent
  onReset: () => void
  onOpenHistory: () => void
}

export const StepPublishComplete = ({
  selectedPlatforms,
  selectedVideo,
  onReset,
  onOpenHistory,
}: StepPublishCompleteProps) => {
  const handleCopyLink = (url: string, platformName: string) => {
    navigator.clipboard.writeText(url)
    toast.success(`已复制 ${platformName} 的发布链接！`)
  }

  return (
    <div className='space-y-6 max-w-4xl mx-auto'>
      {/* Hero Success Celebration Header */}
      <div className='rounded-2xl border bg-card p-8 text-center shadow-sm space-y-4 relative overflow-hidden'>
        <div className='absolute left-1/2 top-0 -translate-x-1/2 -translate-y-12 h-32 w-64 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full' />

        <div className='inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs mb-2 ring-8 ring-emerald-500/5'>
          <CheckCircle2 className='h-8 w-8 stroke-[2.5]' />
        </div>

        <div className='space-y-1.5 max-w-lg mx-auto'>
          <h2 className='text-2xl font-black text-foreground tracking-tight'>
            直连发布成功完成！
          </h2>
          <p className='text-xs sm:text-sm text-muted-foreground leading-relaxed'>
            视频已成功同步至 <span className='font-bold text-foreground'>{selectedPlatforms.length}</span> 个社交媒体平台。系统已通过模拟真实用户交互触达各个推荐流通道。
          </p>
        </div>

        {/* Video Thumbnail Summary */}
        <div className='flex items-center justify-center gap-3 p-3 rounded-xl border bg-muted/30 max-w-md mx-auto mt-4 text-left'>
          <img
            src={selectedVideo.coverUrl}
            alt={selectedVideo.title}
            className='h-12 w-20 object-cover rounded-lg border bg-black shrink-0'
          />
          <div className='min-w-0 flex-1'>
            <h4 className='text-xs font-bold text-foreground truncate'>
              {selectedVideo.title}
            </h4>
            <p className='text-[11px] text-muted-foreground font-mono mt-0.5'>
              发布时间: {new Date().toLocaleTimeString()} · 共 {selectedPlatforms.length} 平台
            </p>
          </div>
        </div>
      </div>

      {/* Published Platforms Link Cards */}
      <div className='space-y-3'>
        <h3 className='text-sm font-bold text-foreground flex items-center gap-2'>
          <Sparkles className='h-4 w-4 text-primary' />
          已发布平台链接与访问通道
        </h3>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {selectedPlatforms.map((platform) => {
            const mockUrl = `https://${platform.id}.com/post/${Math.random().toString(36).substring(7)}`

            return (
              <div
                key={platform.id}
                className='flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-xs transition-all hover:border-primary/30'
              >
                <div className='flex items-center gap-3 min-w-0'>
                  <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted'>
                    <PlatformIcon platformId={platform.id} className='h-5 w-5' />
                  </div>
                  <div className='min-w-0 space-y-0.5'>
                    <div className='flex items-center gap-2'>
                      <h4 className='font-bold text-sm text-foreground truncate'>
                        {platform.name}
                      </h4>
                      <Badge className='bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0'>
                        已成功推送
                      </Badge>
                    </div>
                    <p className='text-[11px] text-muted-foreground truncate font-mono'>
                      {platform.accountHandle}
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-1.5 shrink-0'>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => handleCopyLink(mockUrl, platform.name)}
                    className='h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground'
                    title='复制发布链接'
                  >
                    <Copy className='h-4 w-4' />
                  </Button>

                  <a href={mockUrl} target='_blank' rel='noopener noreferrer'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-8 rounded-lg text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10'
                    >
                      查看动态
                      <ExternalLink className='h-3 w-3' />
                    </Button>
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Performance Expectation Card */}
      <div className='rounded-2xl border bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-primary/20'>
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <TrendingUp className='h-5 w-5' />
          </div>
          <div>
            <h4 className='font-bold text-sm text-foreground'>数据归集与推流监控</h4>
            <p className='text-xs text-muted-foreground'>
              系统已自动为上述已发布动态开启播放量、点赞量及互动转化实时追踪。
            </p>
          </div>
        </div>

        <Button
          variant='secondary'
          size='sm'
          onClick={onOpenHistory}
          className='shrink-0 rounded-xl text-xs gap-1.5'
        >
          <History className='h-3.5 w-3.5' />
          查看发布历史与数据
        </Button>
      </div>

      {/* Bottom Action Footer */}
      <div className='flex flex-wrap items-center justify-center gap-4 pt-4 border-t'>
        <Button
          variant='outline'
          onClick={onReset}
          className='rounded-xl px-6 gap-2 border-border'
        >
          <RotateCcw className='h-4 w-4' />
          继续发布新视频
        </Button>

        <a href='/dashboard'>
          <Button className='rounded-xl px-6 gap-2 font-bold'>
            <LayoutDashboard className='h-4 w-4' />
            返回创作工作台
          </Button>
        </a>
      </div>
    </div>
  )
}
