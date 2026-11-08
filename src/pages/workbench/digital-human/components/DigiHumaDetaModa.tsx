import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Globe2,
  Sparkles,
  Flame,
  Lock,
  Volume2,
  Play,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { canPurchaseSubscription } from '@/utils/tenantAccess'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { type AvatarItem } from '../types'

interface DigitalHumanDetailModalProps {
  avatar: AvatarItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DigitalHumanDetailModal = ({
  avatar,
  open,
  onOpenChange,
}: DigitalHumanDetailModalProps) => {
  const navigate = useNavigate()
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const canPurchase = canPurchaseSubscription(tenant)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [scriptText, setScriptText] = useState('')

  if (!avatar) return null

  const locked = avatar.accessible === false

  const handlePlayVoice = () => {
    setIsPlayingAudio(true)
    toast.success(`正在播放 ${avatar.name} 的演示配音与口型示范`)
    setTimeout(() => {
      setIsPlayingAudio(false)
    }, 3000)
  }

  const handleGenerate = () => {
    if (locked) {
      if (!canPurchase) {
        toast.info('企业套餐仅管理员可购买，请联系管理员处理')
        onOpenChange(false)
        return
      }
      toast.info(
        `订阅${avatar.requiredPlanName || '对应套餐'}后即可使用 ${avatar.name}`
      )
      onOpenChange(false)
      navigate({ to: '/subscriptions' })
      return
    }
    toast.success(`已选定数字人【${avatar.name}】，正在前往创建视频页...`)
    onOpenChange(false)
    // 跳转创建视频页，并自动选中该数字人
    navigate({
      to: '/create',
      search: { humanId: avatar.id },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='border-border/80 max-w-2xl gap-0 overflow-hidden p-0'>
        {/* Top Banner Representation */}
        <div className='bg-muted relative flex h-48 w-full items-center justify-center overflow-hidden'>
          <div
            className={`absolute inset-0 bg-gradient-to-r ${avatar.gradientBg} opacity-90`}
          />
          <div className='absolute inset-0 bg-[linear-gradient(to_right,#ffffff0f_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0f_1px,transparent_1px)] bg-[size:16px_16px]' />

          <div className='relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-white/40 bg-white/20 text-2xl font-bold text-white shadow-xl backdrop-blur-md'>
            {avatar.avatarInitial}
          </div>

          <div className='absolute top-4 left-4 flex gap-2'>
            {avatar.isHot && (
              <Badge className='gap-1 border-0 bg-rose-500 font-medium text-white'>
                <Flame className='h-3 w-3 fill-current' />
                热门形象
              </Badge>
            )}
            {avatar.isPro && (
              <Badge className='border-0 bg-amber-500 font-bold text-white'>
                PRO 专享
              </Badge>
            )}
            {locked && (
              <Badge className='bg-foreground/80 text-background gap-1 border-0 font-medium'>
                <Lock className='h-3 w-3' />
                需订阅{avatar.requiredPlanName || '对应套餐'}
              </Badge>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className='space-y-5 p-6'>
          <DialogHeader className='space-y-1'>
            <div className='flex items-center justify-between'>
              <DialogTitle className='flex items-center gap-2 text-2xl font-bold'>
                {avatar.name}
                <span className='text-muted-foreground text-sm font-normal'>
                  ({avatar.region} · {avatar.ageGroup})
                </span>
              </DialogTitle>
              <Button
                variant='outline'
                size='sm'
                onClick={handlePlayVoice}
                disabled={isPlayingAudio}
                className='gap-1.5 rounded-full text-xs font-medium'
              >
                {isPlayingAudio ? (
                  <>
                    <Volume2 className='text-primary h-3.5 w-3.5 animate-pulse' />
                    演示中...
                  </>
                ) : (
                  <>
                    <Play className='text-primary h-3.5 w-3.5 fill-current' />
                    试听音色口型
                  </>
                )}
              </Button>
            </div>
            <p className='text-muted-foreground pt-1 text-sm leading-relaxed'>
              {avatar.description}
            </p>
          </DialogHeader>

          {/* Capabilities Grid */}
          <div className='grid grid-cols-2 gap-3 text-xs'>
            <div className='bg-muted/40 space-y-1 rounded-lg border p-3'>
              <div className='text-foreground flex items-center gap-1.5 font-medium'>
                <Globe2 className='text-primary h-3.5 w-3.5' />
                支持语言 & 口型
              </div>
              <div className='flex flex-wrap gap-1 pt-1'>
                {avatar.languages.map((l) => (
                  <span
                    key={l}
                    className='bg-background text-muted-foreground rounded border px-1.5 py-0.5 font-medium'
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>

            <div className='bg-muted/40 space-y-1 rounded-lg border p-3'>
              <div className='text-foreground flex items-center gap-1.5 font-medium'>
                <Sparkles className='text-primary h-3.5 w-3.5' />
                推荐适用场景
              </div>
              <div className='flex flex-wrap gap-1 pt-1'>
                {avatar.styles.map((s) => (
                  <span
                    key={s}
                    className='bg-background text-muted-foreground rounded border px-1.5 py-0.5 font-medium'
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Script Prompt Area */}
          <div className='space-y-2 border-t pt-2'>
            <label className='text-foreground flex items-center justify-between text-xs font-semibold'>
              <span>输入口播文本预览生成 (可选)</span>
              <span className='text-muted-foreground font-normal'>
                已累计生成 {avatar.useCount.toLocaleString()} 次视频
              </span>
            </label>
            <Textarea
              placeholder={`输入需要 ${avatar.name} 播报的脚本，如：“大家好，今天为大家带来这款全新出海热销爆款...”`}
              rows={3}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              className='resize-none text-xs'
            />
          </div>

          {/* Actions */}
          <div className='flex items-center justify-end gap-3 pt-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleGenerate}
              className='gap-1.5 font-semibold shadow-md'
            >
              {locked ? (
                <>
                  <Lock className='h-4 w-4' />
                  升级套餐使用 {avatar.name}
                </>
              ) : (
                <>
                  <Wand2 className='h-4 w-4' />
                  使用 {avatar.name} 立即生成视频
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
