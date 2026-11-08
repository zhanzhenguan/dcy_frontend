import { useState } from 'react'
import { FileText, Wand2, RefreshCw, Check } from 'lucide-react'
import { cn } from '@/utils/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

export type ScriptTemplate = {
  id: string
  title: string
  tag: string
  duration: string
  badgeText?: string
  content: string
}

export type ScriptMode = 'ai' | 'custom'

const mockScripts: ScriptTemplate[] = [
  {
    id: 'script-1',
    title: '痛点引出型',
    tag: '电商带货 · 高转化',
    duration: '15s',
    badgeText: 'HOT',
    content:
      '你还在用旧款搞得手忙脚乱吗？今天给你推荐这款爆款神器！不仅颜值超高，细节质感更是拉满，一键上手省时又高效。限时特惠，赶快点击下方链接入手吧！',
  },
  {
    id: 'script-2',
    title: '卖点拆解型',
    tag: '测评体验 · 详细讲解',
    duration: '30s',
    badgeText: 'NEW',
    content:
      '为什么大家都抢着买这款产品？第一，工艺材质顶级；第二，细节设计超贴心；第三，性价比吊打同类竞品。看完这篇测评你就明白为什么好评率高达99%！',
  },
  {
    id: 'script-3',
    title: '沉浸开箱型',
    tag: '种草风 · 真实感',
    duration: '20s',
    content:
      '包裹终于收到了！沉浸式开箱这一刻真的太惊艳了。精致的包装加上顶级触感，不管是自用还是送人都无可挑剔。赶紧来看看这神仙质感！',
  },
  {
    id: 'script-4',
    title: '对比反转型',
    tag: '反转剧情 · 吸引眼球',
    duration: '15s',
    badgeText: 'HOT',
    content:
      '以前用普通产品天天被吐槽，直到换上了它，效果直接提升一个维度！前后对比简直不敢相信，早用早享受，这波入股绝对不亏！',
  },
]

type ScriptSelectorProps = {
  value: string
  onChange: (script: string) => void
  initialMode?: ScriptMode
  mode?: ScriptMode
  onModeChange?: (mode: ScriptMode) => void
  customValue?: string
  onCustomChange?: (script: string) => void
  scripts?: ScriptTemplate[]
  summary?: string
  isGenerating?: boolean
  onRegenerate?: () => Promise<void>
  productName?: string
  features?: string
}

export const ScriptSelector = ({
  value,
  onChange,
  initialMode = 'ai',
  mode: controlledMode,
  onModeChange,
  customValue,
  onCustomChange,
  scripts = mockScripts,
  summary,
  isGenerating: externalGenerating = false,
  onRegenerate,
  productName,
  features,
}: ScriptSelectorProps) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    scripts[0]?.id ?? ''
  )
  const [localMode, setLocalMode] = useState<ScriptMode>(initialMode)
  const [localCustomScriptContent, setLocalCustomScriptContent] = useState(
    initialMode === 'custom' ? value : ''
  )
  const [localScripts, setLocalScripts] = useState<ScriptTemplate[]>(scripts)
  const [localGenerating, setLocalGenerating] = useState(false)
  const isGenerating = externalGenerating || localGenerating
  const mode = controlledMode ?? localMode
  const customScriptContent = customValue ?? localCustomScriptContent

  const handleSelectTemplate = (tpl: ScriptTemplate) => {
    setSelectedTemplateId(tpl.id)
    onChange(tpl.content)
  }

  const handleCardContentChange = (id: string, text: string) => {
    setLocalScripts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, content: text } : item))
    )
    if (selectedTemplateId === id) {
      onChange(text)
    }
  }

  const handleRegenerate = async () => {
    if (onRegenerate) {
      await onRegenerate()
      return
    }
    setLocalGenerating(true)
    setLocalScripts((previous) =>
      previous.map((item) => ({
        ...item,
        content: `【AI全新定制·${item.title}】\n${productName ? `针对 [${productName}]` : '这款特色产品'}：${features || '主打顶级工艺与实用性'}。黄金3秒强吸引，直击购买痛点。`,
      }))
    )
    setLocalGenerating(false)
  }

  const handleSwitchMode = (targetMode: ScriptMode) => {
    if (controlledMode === undefined) setLocalMode(targetMode)
    onModeChange?.(targetMode)
    if (targetMode === 'custom') {
      if (!onCustomChange) onChange(customScriptContent)
    } else {
      const activeTpl =
        localScripts.find((item) => item.id === selectedTemplateId) ??
        localScripts[0]
      if (activeTpl) {
        setSelectedTemplateId(activeTpl.id)
        onChange(activeTpl.content)
      }
    }
  }

  return (
    <div className='bg-card flex min-h-0 flex-1 flex-col space-y-4 rounded-xl border p-4 shadow-sm'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h3 className='flex items-center gap-2 text-base font-semibold'>
            <FileText className='text-primary size-4' />
            脚本生成
          </h3>
          <p className='text-muted-foreground text-xs'>
            AI
            根据你提供的素材与卖点，自动生成4组多风格口播脚本，每组可单独编辑和调试。
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 gap-1.5 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400'
            onClick={() => void handleRegenerate()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <RefreshCw className='size-3.5 animate-spin' />
            ) : (
              <Wand2 className='size-3.5' />
            )}
            重新生成4组脚本
          </Button>
        </div>
      </div>

      {summary && (
        <div className='bg-muted/40 rounded-md border px-3 py-2 text-xs leading-relaxed'>
          <span className='font-medium'>素材总结：</span>
          <span className='text-muted-foreground'>{summary}</span>
        </div>
      )}

      {/* Mode Tabs */}
      <div className='flex items-center justify-between border-b pb-2 text-xs'>
        <div className='flex gap-4'>
          <button
            type='button'
            className={cn(
              'border-b-2 pb-1.5 font-medium transition-colors',
              mode === 'ai'
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
            onClick={() => handleSwitchMode('ai')}
          >
            ✨ AI 智能脚本生成 (4组风格)
          </button>
          <button
            type='button'
            className={cn(
              'border-b-2 pb-1.5 font-medium transition-colors',
              mode === 'custom'
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
            onClick={() => handleSwitchMode('custom')}
          >
            ✍️ 自定义脚本
          </button>
        </div>
      </div>

      {/* 4 Cards Grid / Custom Textarea */}
      {mode === 'ai' ? (
        isGenerating ? (
          <div className='space-y-3'>
            <div className='bg-primary/5 border-primary/20 text-primary flex animate-pulse items-center gap-2 rounded-lg border px-3 py-2 text-xs'>
              <Wand2 className='size-3.5 animate-spin' />
              <span className='font-medium'>
                AI 正在根据素材与卖点智能生成 4 组口播脚本，请稍候...
              </span>
            </div>
            <div className='grid grid-cols-1 gap-3.5 sm:grid-cols-2'>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className='border-border bg-card relative flex flex-col justify-between space-y-3 rounded-lg border p-3.5 shadow-sm'
                >
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between gap-2'>
                      <div className='flex items-center gap-2'>
                        <Skeleton className='h-4 w-20' />
                        <Skeleton className='h-3.5 w-8 rounded-full' />
                        <Skeleton className='h-3 w-8' />
                      </div>
                      <Skeleton className='h-4 w-24 rounded-full' />
                    </div>
                    <div className='space-y-2 pt-1'>
                      <Skeleton className='h-3.5 w-full' />
                      <Skeleton className='h-3.5 w-[92%]' />
                      <Skeleton className='h-3.5 w-[80%]' />
                    </div>
                  </div>
                  <div className='flex items-center justify-between border-t pt-2.5'>
                    <Skeleton className='h-3 w-10' />
                    <Skeleton className='h-7 w-24 rounded-md' />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-3.5 sm:grid-cols-2'>
            {localScripts.length === 0 && (
              <div className='text-muted-foreground col-span-full rounded-md border border-dashed p-6 text-center text-xs'>
                暂无脚本，请点击右上角“重新生成4组脚本”。
              </div>
            )}
            {localScripts.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id
              return (
                <div
                  key={tpl.id}
                  className={cn(
                    'relative flex flex-col justify-between rounded-lg border p-3.5 transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-primary/30 shadow-sm ring-1'
                      : 'border-border bg-background hover:border-primary/40'
                  )}
                >
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between gap-2'>
                      <div className='flex items-center gap-2'>
                        <span className='text-foreground text-xs font-bold'>
                          {tpl.title}
                        </span>
                        {tpl.badgeText && (
                          <Badge className='bg-amber-500 px-1 py-0 text-[9px] text-white'>
                            {tpl.badgeText}
                          </Badge>
                        )}
                        <span className='text-muted-foreground text-[10px]'>
                          {tpl.duration}
                        </span>
                      </div>
                      <Badge variant='outline' className='h-4 py-0 text-[10px]'>
                        {tpl.tag}
                      </Badge>
                    </div>

                    <Textarea
                      rows={3}
                      value={tpl.content}
                      onChange={(e) =>
                        handleCardContentChange(tpl.id, e.target.value)
                      }
                      className='bg-background/80 resize-none text-xs'
                    />
                  </div>

                  <div className='mt-3 flex items-center justify-between border-t pt-2 text-xs'>
                    <span className='text-muted-foreground text-[10px]'>
                      {tpl.content.length} 字
                    </span>
                    <Button
                      size='sm'
                      variant={isSelected ? 'default' : 'outline'}
                      className='h-7 gap-1 text-xs'
                      onClick={() => handleSelectTemplate(tpl)}
                    >
                      {isSelected ? (
                        <>
                          <Check className='size-3.5' />
                          已应用此脚本
                        </>
                      ) : (
                        '选择此脚本'
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        <div className='flex min-h-0 flex-1 flex-col space-y-2'>
          <Textarea
            placeholder='输入自定义文案口播脚本...'
            value={customScriptContent}
            onChange={(e) => {
              if (customValue === undefined) {
                setLocalCustomScriptContent(e.target.value)
              }
              if (onCustomChange) {
                onCustomChange(e.target.value)
              } else {
                onChange(e.target.value)
              }
            }}
            className='min-h-[220px] flex-1 resize-none font-sans text-xs leading-relaxed'
          />
          <div className='text-muted-foreground text-right text-[11px]'>
            {customScriptContent.length} 字
          </div>
        </div>
      )}
    </div>
  )
}
