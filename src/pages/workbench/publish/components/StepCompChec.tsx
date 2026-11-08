import { useState } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  Send,
  Edit3,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  type PlatformItem,
  type VideoPublishContent,
  type ComplianceCheckItem,
} from '../types'
import { PlatformIcon } from './PlatformIcons'
import { AnimatedTabs } from '@/components/common'

interface StepComplianceCheckProps {
  selectedPlatforms: PlatformItem[]
  selectedVideo: VideoPublishContent
  complianceChecks: ComplianceCheckItem[]
  onBack: () => void
  onStartPublish: () => void
}

export const StepComplianceCheck = ({
  selectedPlatforms,
  selectedVideo,
  complianceChecks,
  onBack,
  onStartPublish,
}: StepComplianceCheckProps) => {
  const [activeTab, setActiveTab] = useState<string>('general')
  const [postTitle, setPostTitle] = useState(selectedVideo.title)
  const [postDesc, setPostDesc] = useState(selectedVideo.description)
  const [tags, setTags] = useState<string[]>(selectedVideo.tags)
  const [newTag, setNewTag] = useState('')
  const [isRechecking, setIsRechecking] = useState(false)

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleRecheck = () => {
    setIsRechecking(true)
    setTimeout(() => {
      setIsRechecking(false)
    }, 800)
  }

  const allPassed = complianceChecks.every((c) => c.status === 'passed')

  return (
    <div className='space-y-6'>
      {/* Top Pre-check Status Hero Box */}
      <div className='bg-card relative overflow-hidden rounded-2xl border p-6 shadow-xs'>
        <div className='pointer-events-none absolute top-0 right-0 translate-x-4 -translate-y-4 opacity-10'>
          <ShieldCheck className='h-48 w-48 text-emerald-500' />
        </div>

        <div className='relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center'>
          <div className='space-y-2'>
            <div className='flex items-center gap-2.5'>
              <Badge className='gap-1.5 border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'>
                <ShieldCheck className='h-4 w-4' />
                AI 合规预检结果
              </Badge>
              <span className='text-muted-foreground font-mono text-xs'>
                支持 {selectedPlatforms.length} 个发布目标
              </span>
            </div>
            <h2 className='text-foreground text-xl font-bold'>
              {allPassed
                ? '🎉 预检完成：符合全平台高推荐发布标准'
                : '预检完成：发现需注意项'}
            </h2>
            <p className='text-muted-foreground max-w-xl text-xs'>
              系统已针对视频素材、解说文字及音乐版权进行底层特征匹配，无敏感风险及违规关键词。
            </p>
          </div>

          <div className='flex shrink-0 items-center gap-4'>
            <div className='rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center'>
              <div className='font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400'>
                100{' '}
                <span className='text-muted-foreground text-xs font-normal'>
                  / 100
                </span>
              </div>
              <div className='text-muted-foreground mt-0.5 text-[10px] font-medium'>
                合规综合评分
              </div>
            </div>

            <Button
              variant='outline'
              size='sm'
              onClick={handleRecheck}
              disabled={isRechecking}
              className='gap-1.5 rounded-xl text-xs'
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRechecking ? 'animate-spin' : ''}`}
              />
              重新扫描
            </Button>
          </div>
        </div>

        {/* Detailed Check Items Grid */}
        <div className='mt-6 grid grid-cols-1 gap-3 border-t pt-5 sm:grid-cols-2'>
          {complianceChecks.map((item) => (
            <div
              key={item.id}
              className='bg-background/60 hover:bg-background flex items-start gap-3 rounded-xl border p-3.5 transition-colors'
            >
              <div className='mt-0.5 shrink-0'>
                {item.status === 'passed' ? (
                  <CheckCircle2 className='h-5 w-5 text-emerald-500' />
                ) : (
                  <AlertCircle className='h-5 w-5 text-amber-500' />
                )}
              </div>
              <div className='min-w-0 space-y-0.5'>
                <div className='flex items-center justify-between gap-2'>
                  <h4 className='text-foreground truncate text-xs font-bold'>
                    {item.title}
                  </h4>
                  <Badge
                    variant='outline'
                    className='border-emerald-500/30 py-0 text-[10px] text-emerald-600 dark:text-emerald-400'
                  >
                    通过
                  </Badge>
                </div>
                <p className='text-muted-foreground truncate text-xs'>
                  {item.message}
                </p>
                {item.suggestion && (
                  <p className='pt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-400/80'>
                    💡 {item.suggestion}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Customization Section */}
      <div className='bg-card space-y-5 rounded-2xl border p-6 shadow-xs'>
        <div className='flex items-center justify-between border-b pb-4'>
          <div className='flex items-center gap-2'>
            <Edit3 className='text-primary h-5 w-5' />
            <h3 className='text-foreground text-base font-bold'>
              发布内容独立精修
            </h3>
          </div>
          <span className='text-muted-foreground text-xs'>
            可针对不同社交平台的受众喜好差异单独定制标题与话题
          </span>
        </div>

        {/* Platform Tabs */}
        <div className='w-full space-y-5'>
          <AnimatedTabs
            className='w-full max-w-full'
            listClassName='w-full max-w-full overflow-x-auto'
            triggerClassName='shrink-0'
            value={activeTab}
            onValueChange={setActiveTab}
            items={[
              {
                value: 'general',
                label: (
                  <>
                    <Sparkles className='h-3.5 w-3.5 text-amber-500' />
                    通用文案配置
                  </>
                ),
              },
              ...selectedPlatforms.map((p) => ({
                value: p.id,
                label: (
                  <>
                    <PlatformIcon platformId={p.id} className='h-3.5 w-3.5' />
                    {p.name} 定制
                  </>
                ),
              })),
            ]}
          />

          <div className='space-y-4'>
            {/* Title Input */}
            <div className='space-y-1.5'>
              <Label className='flex items-center justify-between text-xs font-semibold'>
                <span>视频发布标题</span>
                <span className='text-muted-foreground font-mono text-[10px]'>
                  {postTitle.length} / 100 字
                </span>
              </Label>
              <Input
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder='输入吸引眼球的发布标题...'
                className='bg-background rounded-xl'
              />
            </div>

            {/* Description Textarea */}
            <div className='space-y-1.5'>
              <Label className='flex items-center justify-between text-xs font-semibold'>
                <span>文案描述与解说</span>
                <span className='text-muted-foreground font-mono text-[10px]'>
                  {postDesc.length} / 2000 字
                </span>
              </Label>
              <Textarea
                rows={4}
                value={postDesc}
                onChange={(e) => setPostDesc(e.target.value)}
                placeholder='写下详细的动态说明...'
                className='bg-background rounded-xl leading-relaxed'
              />
            </div>

            {/* Hashtags Section */}
            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>
                热门话题与标签 (Hashtags)
              </Label>
              <div className='bg-background flex min-h-[52px] flex-wrap items-center gap-2 rounded-xl border p-3'>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className='bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium'
                  >
                    #{tag}
                    <button
                      type='button'
                      onClick={() => handleRemoveTag(tag)}
                      className='hover:text-destructive text-primary/70 ml-1 font-bold'
                    >
                      ×
                    </button>
                  </span>
                ))}

                <div className='flex min-w-[140px] items-center gap-1'>
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    placeholder='添加标签(回车确认)'
                    className='h-7 border-0 px-1 text-xs shadow-none focus-visible:ring-0'
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={handleAddTag}
                    className='h-6 px-2 text-[11px]'
                  >
                    + 添加
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className='flex items-center justify-between border-t pt-4'>
        <Button
          variant='outline'
          onClick={onBack}
          className='gap-1.5 rounded-xl'
        >
          <ChevronLeft className='h-4 w-4' />
          上一步：选择平台
        </Button>

        <Button
          onClick={onStartPublish}
          className='bg-primary text-primary-foreground gap-2 rounded-xl px-8 font-bold shadow-md transition-all hover:shadow-lg'
        >
          <Send className='h-4 w-4' />
          开始一键直连发布
        </Button>
      </div>
    </div>
  )
}
