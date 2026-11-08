import { Check, Plus, AlertTriangle, Video, ChevronRight } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type PlatformItem, type VideoPublishContent } from '../types'
import { PlatformIcon } from './PlatformIcons'

interface StepSelectPlatformProps {
  platforms: PlatformItem[]
  selectedPlatformIds: string[]
  onTogglePlatform: (platformId: string) => void
  onSelectAll: () => void
  selectedVideo: VideoPublishContent
  onOpenVideoPicker: () => void
  onOpenAccountModal: (platform?: PlatformItem) => void
  onNext: () => void
}

export const StepSelectPlatform = ({
  platforms,
  selectedPlatformIds,
  onTogglePlatform,
  onSelectAll,
  selectedVideo,
  onOpenVideoPicker,
  onOpenAccountModal,
  onNext,
}: StepSelectPlatformProps) => {
  const connectedCount = platforms.filter((p) => p.connected).length
  const selectedCount = selectedPlatformIds.length

  return (
    <div className='space-y-6'>
      {/* Top Banner: Video Preview & Quick Select */}
      <div className='bg-card flex flex-col items-start justify-between gap-4 rounded-2xl border p-4 shadow-xs sm:flex-row sm:items-center sm:p-5'>
        <div className='flex min-w-0 items-center gap-4'>
          <div className='relative h-16 w-28 shrink-0 overflow-hidden rounded-xl border bg-black'>
            <img
              src={selectedVideo.coverUrl}
              alt={selectedVideo.title}
              className='h-full w-full object-cover opacity-90'
            />
            <div className='absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 font-mono text-[10px] text-white'>
              {selectedVideo.duration}
            </div>
          </div>
          <div className='min-w-0 space-y-1'>
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className='bg-primary/5 text-primary border-primary/20 text-[10px] uppercase'
              >
                待发布视频
              </Badge>
              <span className='text-muted-foreground font-mono text-xs'>
                {selectedVideo.ratio} · {selectedVideo.fileSize}
              </span>
            </div>
            <h3 className='text-foreground truncate text-sm font-semibold sm:text-base'>
              {selectedVideo.title}
            </h3>
            <p className='text-muted-foreground max-w-lg truncate text-xs'>
              {selectedVideo.description}
            </p>
          </div>
        </div>

        <Button
          variant='outline'
          size='sm'
          onClick={onOpenVideoPicker}
          className='shrink-0 gap-1.5 rounded-xl border-dashed'
        >
          <Video className='text-primary h-4 w-4' />
          更换视频
        </Button>
      </div>

      {/* Main Section Header */}
      <div className='flex flex-col justify-between gap-3 border-b pb-1 sm:flex-row sm:items-center'>
        <div>
          <div className='flex items-center gap-2'>
            <span className='bg-primary flex h-3 w-1 rounded-full' />
            <h2 className='text-foreground text-lg font-bold tracking-tight'>
              选择发布平台
            </h2>
          </div>
          <p className='text-muted-foreground mt-1 text-xs'>
            选择需要同步发布的平台（需已登录账号），系统将模拟真实发布动作自动排期提交
          </p>
        </div>

        <div className='flex items-center gap-3 self-end sm:self-auto'>
          <Button
            variant='ghost'
            size='sm'
            onClick={onSelectAll}
            className='text-muted-foreground hover:text-foreground text-xs'
          >
            {selectedCount === connectedCount ? '取消全选' : '全选已连接平台'}
          </Button>
          <Badge variant='secondary' className='rounded-lg px-2.5 py-1 text-xs'>
            已选择{' '}
            <span className='text-primary mx-1 font-bold'>{selectedCount}</span>{' '}
            / {platforms.length} 个平台
          </Badge>
        </div>
      </div>

      {/* Platforms Cards Grid */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {platforms.map((platform) => {
          const isSelected = selectedPlatformIds.includes(platform.id)
          const isConnected = platform.connected

          return (
            <div
              key={platform.id}
              onClick={() => {
                if (isConnected) {
                  onTogglePlatform(platform.id)
                } else {
                  onOpenAccountModal(platform)
                }
              }}
              className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                isSelected && isConnected
                  ? 'border-primary bg-primary/[0.03] ring-primary/30 dark:bg-primary/[0.08] shadow-sm ring-1'
                  : isConnected
                    ? 'border-border bg-card hover:border-primary/40 hover:shadow-xs'
                    : 'border-border/60 bg-muted/20 hover:bg-muted/40 opacity-80'
              }`}
            >
              {/* Top Row: Icon, Title & Connection Status */}
              <div className='flex items-start justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-3'>
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isConnected
                        ? 'bg-muted/80 text-foreground group-hover:scale-105'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <PlatformIcon
                      platformId={platform.id}
                      className='h-6 w-6'
                    />
                  </div>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-1.5'>
                      <h4 className='text-foreground truncate text-sm font-bold'>
                        {platform.name}
                      </h4>
                      {platform.badgeText && (
                        <span className='py-0.2 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400'>
                          {platform.badgeText}
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-0.5 truncate text-xs ${
                        isConnected
                          ? 'font-medium text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {platform.accountHandle}
                    </p>
                  </div>
                </div>

                {/* Checkbox for connected platforms */}
                {isConnected ? (
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30 bg-background'
                    }`}
                  >
                    {isSelected && <Check className='h-3.5 w-3.5 stroke-[3]' />}
                  </div>
                ) : (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenAccountModal(platform)
                    }}
                    className='border-primary/30 text-primary hover:bg-primary/10 h-7 rounded-lg px-2.5 text-[11px]'
                  >
                    去登录
                  </Button>
                )}
              </div>

              {/* Bottom Specs & Status Footer */}
              <div className='border-border/40 text-muted-foreground mt-4 flex items-center justify-between border-t pt-3 text-[11px]'>
                <span>
                  推荐比例:{' '}
                  <strong className='text-foreground font-normal'>
                    {platform.recommendedRatio}
                  </strong>
                </span>
                {isConnected ? (
                  <span className='text-muted-foreground/80 text-[10px]'>
                    活跃: {platform.lastActiveTime || '刚刚'}
                  </span>
                ) : (
                  <span className='text-muted-foreground text-[10px]'>
                    需要授权浏览器
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* Add Account Card */}
        <div
          onClick={() => onOpenAccountModal()}
          className='border-border/80 bg-muted/10 hover:border-primary/40 hover:bg-primary/[0.02] flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition-colors'
        >
          <div className='bg-muted text-muted-foreground mb-2 flex h-10 w-10 items-center justify-center rounded-full'>
            <Plus className='h-5 w-5' />
          </div>
          <span className='text-foreground text-xs font-semibold'>
            绑定新社交平台账号
          </span>
          <span className='text-muted-foreground mt-0.5 text-[10px]'>
            支持配置 Cookie / 模拟登录凭证
          </span>
        </div>
      </div>

      {/* Real-time Notice Alert Banner */}
      <Alert className='rounded-2xl border-amber-500/30 bg-amber-500/5 p-4 text-amber-900 dark:text-amber-200'>
        <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400' />
        <div className='ml-2 space-y-1'>
          <AlertTitle className='text-sm font-bold text-amber-900 dark:text-amber-200'>
            直连发布免 API 模式说明
          </AlertTitle>
          <AlertDescription className='text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/90'>
            发布采用模拟真人操作模式，需在浏览器中保持对应平台的登录状态。系统不会存储你的账号密码，全程本地安全加密代理传输。
          </AlertDescription>
        </div>
      </Alert>

      {/* Bottom Action Footer Bar */}
      <div className='flex items-center justify-between border-t pt-4'>
        <div className='text-muted-foreground text-xs'>
          {selectedCount > 0 ? (
            <span>
              已准备好将视频直连分发至{' '}
              <strong className='text-foreground font-semibold'>
                {selectedCount}
              </strong>{' '}
              个平台
            </span>
          ) : (
            <span className='text-amber-600 dark:text-amber-400'>
              请至少勾选一个绑定的发布平台
            </span>
          )}
        </div>

        <Button
          disabled={selectedCount === 0}
          onClick={onNext}
          className='gap-2 rounded-xl px-6 font-semibold shadow-sm transition-all hover:shadow'
        >
          下一步：合规预检
          <ChevronRight className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}
