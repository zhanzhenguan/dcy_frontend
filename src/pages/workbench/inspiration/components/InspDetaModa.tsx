import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Check,
  Clock,
  Copy,
  Eye,
  Film,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
  ImagePlay,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { AnimatedTabs } from '@/components/common'
import { type InspirationItem } from '../types'

interface InspirationDetailModalProps {
  item: InspirationItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const InspirationDetailModal = ({
  item,
  open,
  onOpenChange,
}: InspirationDetailModalProps) => {
  const navigate = useNavigate()
  const [copiedScript, setCopiedScript] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [detailTab, setDetailTab] = useState('timeline')

  if (!item) return null

  const handleCopyScript = () => {
    navigator.clipboard.writeText(item.scriptBreakdown.fullScript)
    setCopiedScript(true)
    toast.success('已复制到剪贴板！')
    setTimeout(() => setCopiedScript(false), 2000)
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(item.scriptBreakdown.aiPrompt)
    setCopiedPrompt(true)
    toast.success('已复制 AI 画面提示词！')
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  const handleReplicateToText = () => {
    onOpenChange(false)
    const promptText = `【同款爆款视频复刻】\n行业: ${item.industry}\n核心策略: ${item.creativeStrategy}\n文案脚本:\n${item.scriptBreakdown.fullScript}`
    navigator.clipboard.writeText(promptText)
    navigate({
      to: '/video/text',
      search: { productUrl: undefined },
    })
    toast.info('已复制爆款文案脚本到剪贴板，可直接粘贴生成视频！')
  }

  const handleReplicateToImage = () => {
    onOpenChange(false)
    navigate({
      to: '/video/image',
    })
    toast.info('请上传参考首帧图或素材以开始图生视频！')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto p-6 sm:p-8'>
        <DialogHeader className='space-y-3 border-b pb-4'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='font-semibold'>
                {item.platform}
              </Badge>
              <Badge variant='secondary'>{item.industry}</Badge>
              <span className='text-muted-foreground text-xs font-semibold'>
                {item.brand}
              </span>
            </div>
            <div className='text-muted-foreground flex items-center gap-3 text-xs'>
              <span className='flex items-center gap-1'>
                <Eye className='h-3.5 w-3.5' /> {item.metrics.views} 播放
              </span>
              <span className='flex items-center gap-1 font-medium text-emerald-500'>
                <TrendingUp className='h-3.5 w-3.5' /> {item.metrics.ctr} CTR
              </span>
              <span className='flex items-center gap-1'>
                <Clock className='h-3.5 w-3.5' /> {item.metrics.duration}
              </span>
            </div>
          </div>
          <DialogTitle className='text-foreground text-xl leading-tight font-bold sm:text-2xl'>
            {item.title}
          </DialogTitle>
        </DialogHeader>

        {/* Content Body */}
        <div className='grid grid-cols-1 gap-6 pt-4 md:grid-cols-12'>
          {/* Left Column: Video Preview Card */}
          <div className='space-y-4 md:col-span-5'>
            <div className='bg-muted border-border group relative aspect-video w-full overflow-hidden rounded-xl border shadow-sm'>
              <img
                src={item.coverImage}
                alt={item.title}
                className='h-full w-full object-cover'
              />
              <div className='absolute inset-0 flex items-center justify-center bg-black/40'>
                <div className='bg-primary/90 text-primary-foreground flex h-14 w-14 items-center justify-center rounded-full shadow-lg'>
                  <Film className='h-6 w-6' />
                </div>
              </div>
              <div className='absolute right-3 bottom-3 left-3 rounded-lg bg-black/60 p-2 text-xs text-white backdrop-blur-md'>
                <span className='font-medium'>创意策略：</span>
                {item.creativeStrategy}
              </div>
            </div>

            {/* Quick Strategy Info Box */}
            <div className='border-border/80 bg-muted/40 space-y-3 rounded-xl border p-4 text-xs'>
              <div className='flex items-start gap-2.5'>
                <Target className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                <div>
                  <span className='text-foreground block font-semibold'>
                    受众群体
                  </span>
                  <span className='text-muted-foreground'>
                    {item.scriptBreakdown.targetAudience}
                  </span>
                </div>
              </div>
              <div className='flex items-start gap-2.5'>
                <Wand2 className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                <div>
                  <span className='text-foreground block font-semibold'>
                    视觉风格
                  </span>
                  <span className='text-muted-foreground'>
                    {item.scriptBreakdown.visualStyle}
                  </span>
                </div>
              </div>
            </div>

            {/* Core Selling Points */}
            <div className='border-border/80 space-y-2 rounded-xl border p-4 text-xs'>
              <span className='text-foreground block font-semibold'>
                核心卖点提炼
              </span>
              <ul className='text-muted-foreground list-inside list-disc space-y-1.5'>
                {item.scriptBreakdown.sellingPoints.map((sp, idx) => (
                  <li key={idx}>{sp}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Creative Timeline & Script Breakdown */}
          <div className='space-y-4 md:col-span-7'>
            <Tabs
              value={detailTab}
              onValueChange={setDetailTab}
              className='w-full'
            >
              <AnimatedTabs
                fullWidth
                value={detailTab}
                onValueChange={setDetailTab}
                items={[
                  { value: 'timeline', label: '镜头拆解' },
                  { value: 'script', label: '文案脚本' },
                  { value: 'prompt', label: 'AI 画面提示词' },
                ]}
              />

              {/* Tab 1: Timeline breakdown */}
              <TabsContent value='timeline' className='space-y-3 pt-3'>
                <div className='max-h-[340px] space-y-2.5 overflow-y-auto pr-1'>
                  {item.scriptBreakdown.timeline.map((step, index) => (
                    <div
                      key={index}
                      className='border-primary/40 relative space-y-1 border-l-2 py-1 pl-4'
                    >
                      <div className='flex items-center justify-between text-xs'>
                        <span className='text-primary font-mono font-bold'>
                          {step.timeframe}
                        </span>
                        <Badge variant='outline' className='py-0 text-[10px]'>
                          {step.technique}
                        </Badge>
                      </div>
                      <h4 className='text-foreground text-xs font-semibold'>
                        {step.title}
                      </h4>
                      <p className='text-muted-foreground text-xs leading-relaxed'>
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Tab 2: Full Script */}
              <TabsContent value='script' className='space-y-3 pt-3'>
                <div className='border-border/80 bg-muted/30 relative rounded-xl border p-4'>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='absolute top-2 right-2 h-7 gap-1 text-xs'
                    onClick={handleCopyScript}
                  >
                    {copiedScript ? (
                      <Check className='h-3.5 w-3.5 text-emerald-500' />
                    ) : (
                      <Copy className='h-3.5 w-3.5' />
                    )}
                    {copiedScript ? '已复制' : '复制脚本'}
                  </Button>
                  <pre className='text-foreground pr-16 font-sans text-xs leading-relaxed whitespace-pre-wrap'>
                    {item.scriptBreakdown.fullScript}
                  </pre>
                </div>
              </TabsContent>

              {/* Tab 3: AI Prompt */}
              <TabsContent value='prompt' className='space-y-3 pt-3'>
                <div className='border-border/80 bg-muted/30 relative rounded-xl border p-4'>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='absolute top-2 right-2 h-7 gap-1 text-xs'
                    onClick={handleCopyPrompt}
                  >
                    {copiedPrompt ? (
                      <Check className='h-3.5 w-3.5 text-emerald-500' />
                    ) : (
                      <Copy className='h-3.5 w-3.5' />
                    )}
                    {copiedPrompt ? '已复制' : '复制 Prompt'}
                  </Button>
                  <pre className='text-foreground/90 pr-16 font-mono text-xs leading-relaxed whitespace-pre-wrap'>
                    {item.scriptBreakdown.aiPrompt}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>

            {/* Modal Bottom Actions */}
            <div className='flex flex-col items-center justify-end gap-2.5 border-t pt-4 sm:flex-row'>
              <Button
                variant='outline'
                className='w-full gap-1.5 text-xs sm:w-auto'
                onClick={handleReplicateToImage}
              >
                <ImagePlay className='h-4 w-4' />
                去图生视频复刻
              </Button>
              <Button
                variant='default'
                className='w-full gap-1.5 text-xs shadow-md sm:w-auto'
                onClick={handleReplicateToText}
              >
                <Sparkles className='h-4 w-4' />
                去文生视频一键复刻
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
