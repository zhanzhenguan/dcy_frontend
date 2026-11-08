import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Braces,
  RefreshCw,
  RotateCcw,
  Save,
  TextCursorInput,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getPromptTemplateSettings,
  updatePromptTemplateSettings,
  type PromptPlaceholder,
} from '@/services/api/creativeApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageShell } from '@/components/layout/PageShell'

type PromptDraft = {
  user_prompt: string
}

export const PromptConfiguration = () => {
  const queryClient = useQueryClient()
  const userRef = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState<PromptDraft | null>(null)
  const settingsQuery = useQuery({
    queryKey: ['prompt-template-settings'],
    queryFn: getPromptTemplateSettings,
  })

  const userPrompt = draft?.user_prompt ?? settingsQuery.data?.user_prompt ?? ''

  const dirty = useMemo(() => {
    if (!settingsQuery.data) return false
    return userPrompt !== settingsQuery.data.user_prompt
  }, [settingsQuery.data, userPrompt])

  const mutation = useMutation({
    mutationFn: updatePromptTemplateSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(['prompt-template-settings'], settings)
      setDraft(null)
      toast.success('提示词配置已保存')
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : '提示词配置保存失败'
      ),
  })

  const insertPlaceholder = (placeholder: PromptPlaceholder) => {
    const ref = userRef
    const value = userPrompt
    const start = ref.current?.selectionStart ?? value.length
    const end = ref.current?.selectionEnd ?? value.length
    const next = value.slice(0, start) + placeholder.token + value.slice(end)
    setDraft({
      user_prompt: next,
    })
    requestAnimationFrame(() => {
      const cursor = start + placeholder.token.length
      ref.current?.focus()
      ref.current?.setSelectionRange(cursor, cursor)
    })
  }

  const restoreDefaults = () => {
    if (!settingsQuery.data) return
    setDraft({
      user_prompt: settingsQuery.data.default_user_prompt,
    })
    toast.info('已恢复默认模板，保存后生效')
  }

  const refresh = async () => {
    const result = await settingsQuery.refetch()
    if (result.data) setDraft(null)
  }

  const placeholders = settingsQuery.data?.placeholders ?? []
  const materialPlaceholders = placeholders.filter(
    (item) => item.source === 'material'
  )
  const videoConfigPlaceholders = placeholders.filter(
    (item) => item.source === 'video_config'
  )
  const loading = settingsQuery.isLoading || settingsQuery.isFetching

  return (
    <PageShell
      title='LLM 提示词'
      description='配置自主素材广告脚本生成时发送给模型的提示词模板。'
      actions={
        <>
          <Button
            variant='outline'
            size='icon'
            title='刷新'
            disabled={loading || mutation.isPending}
            onClick={() => void refresh()}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button
            variant='outline'
            title='恢复默认模板'
            disabled={!settingsQuery.data || mutation.isPending}
            onClick={restoreDefaults}
          >
            <RotateCcw />
            恢复默认
          </Button>
          <Button
            disabled={!dirty || mutation.isPending}
            onClick={() =>
              mutation.mutate({
                user_prompt: userPrompt,
              })
            }
          >
            <Save />
            {mutation.isPending ? '保存中' : '保存'}
          </Button>
        </>
      }
      surfaceClassName='space-y-8'
    >
      <section className='space-y-2'>
        <div className='flex items-center justify-between gap-3'>
          <Label htmlFor='user-prompt'>User Prompt</Label>
          <span className='text-muted-foreground text-xs'>
            {userPrompt.length.toLocaleString()} / 20,000
          </span>
        </div>
        <Textarea
          ref={userRef}
          id='user-prompt'
          value={userPrompt}
          disabled={settingsQuery.isLoading}
          onChange={(event) =>
            setDraft({
              user_prompt: event.target.value,
            })
          }
          className='min-h-96 resize-y font-mono text-sm leading-6'
          maxLength={20000}
        />
      </section>

      <section className='border-t pt-6'>
        <div className='flex items-center gap-2'>
          <Braces className='text-primary size-4' />
          <h3 className='font-semibold'>可用占位符</h3>
          <Badge variant='secondary'>插入到当前编辑器</Badge>
        </div>
        <PlaceholderGroup
          title='视频配置参数'
          items={videoConfigPlaceholders}
          onInsert={insertPlaceholder}
        />
        <PlaceholderGroup
          title='素材参数'
          items={materialPlaceholders}
          onInsert={insertPlaceholder}
        />
      </section>
    </PageShell>
  )
}

function PlaceholderGroup({
  title,
  items,
  onInsert,
}: {
  title: string
  items: PromptPlaceholder[]
  onInsert: (item: PromptPlaceholder) => void
}) {
  return (
    <div className='mt-5'>
      <h4 className='text-muted-foreground mb-2 text-xs font-medium'>
        {title}
      </h4>
      <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
        {items.map((item) => (
          <button
            key={item.key}
            type='button'
            title={`插入 ${item.token}`}
            onClick={() => onInsert(item)}
            className='hover:bg-accent flex min-w-0 items-start gap-3 rounded-md border p-3 text-left transition-colors'
          >
            <TextCursorInput className='text-primary mt-0.5 size-4 shrink-0' />
            <span className='min-w-0'>
              <span className='flex flex-wrap items-center gap-2'>
                <span className='text-sm font-medium'>{item.label}</span>
                <code className='bg-muted rounded px-1.5 py-0.5 text-xs'>
                  {item.token}
                </code>
              </span>
              <span className='text-muted-foreground mt-1 block text-xs leading-5'>
                {item.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
