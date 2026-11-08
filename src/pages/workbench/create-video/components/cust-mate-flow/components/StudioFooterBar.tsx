import {
  LoaderCircle,
  Play,
  Plus,
  RefreshCw,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type StudioFooterBarProps = {
  creditBalance: number
  estimatedCredits: number
  variantsCount: number
  estimateError?: Error | null
  estimateLoading: boolean
  savingDraft: boolean
  isGenerating: boolean
  hasInflightTasks: boolean
  scriptGenerating: boolean
  hasPendingUploads: boolean
  hasActiveTasks: boolean
  onSaveDraft: () => void
  onGenerate: () => void
  onRegenerate: () => void
  onCreateNewVideo: () => void
}

export const StudioFooterBar = ({
  creditBalance,
  estimatedCredits,
  variantsCount,
  estimateError,
  estimateLoading,
  savingDraft,
  isGenerating,
  scriptGenerating,
  hasPendingUploads,
  hasActiveTasks,
  onSaveDraft,
  onGenerate,
  onRegenerate,
  onCreateNewVideo,
}: StudioFooterBarProps) => {
  const totalEstimate = estimatedCredits * (variantsCount || 1)
  const busy =
    isGenerating ||
    scriptGenerating ||
    hasPendingUploads ||
    savingDraft ||
    estimateLoading ||
    Boolean(estimateError)

  return (
    <div className='bg-muted/20 flex shrink-0 flex-col items-stretch justify-between gap-3 border-t px-5 py-4 sm:flex-row sm:items-center'>
      <div className='text-muted-foreground flex min-w-0 flex-col gap-1 text-sm'>
        {estimateError ? (
          <p className='text-destructive break-words font-medium'>
            {estimateError.message || '积分预估失败'}
          </p>
        ) : (
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            <span>
              预计消耗:{' '}
              <span className='text-foreground font-semibold'>
                {totalEstimate}
              </span>{' '}
              积分
            </span>
            <span className='text-border hidden sm:inline'>|</span>
            <span>
              当前余额:{' '}
              {estimatedCredits > 0 ? (
                <>
                  <span className='line-through opacity-60'>
                    {creditBalance.toLocaleString('en-US')}
                  </span>{' '}
                  <span className='text-foreground font-semibold'>
                    {Math.max(0, creditBalance - totalEstimate).toLocaleString(
                      'en-US'
                    )}
                  </span>
                </>
              ) : (
                <span className='text-foreground font-semibold'>
                  {creditBalance.toLocaleString('en-US')}
                </span>
              )}{' '}
              积分
            </span>
          </div>
        )}
      </div>

      {hasActiveTasks ? (
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={onSaveDraft}
            disabled={savingDraft || isGenerating || hasPendingUploads}
            className='h-11 gap-2 px-5 text-base font-semibold'
          >
            {savingDraft ? (
              <>
                <LoaderCircle className='size-4 animate-spin' />
                保存中...
              </>
            ) : (
              <>
                <Save className='size-4' />
                保存
              </>
            )}
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={onCreateNewVideo}
            disabled={isGenerating || savingDraft}
            className='h-11 gap-2 px-5 text-base font-semibold'
          >
            <Plus className='size-4' />
            重新创建
          </Button>
          <Button
            type='button'
            onClick={onRegenerate}
            disabled={busy}
            className='h-11 gap-2 px-8 text-base font-semibold'
          >
            {isGenerating ? (
              <>
                <LoaderCircle className='size-4 animate-spin' />
                生成中...
              </>
            ) : (
              <>
                <RefreshCw className='size-4' />
                再次生成
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={onSaveDraft}
            disabled={savingDraft || isGenerating || hasPendingUploads}
            className='h-11 gap-2 px-5 text-base font-semibold'
          >
            {savingDraft ? (
              <>
                <LoaderCircle className='size-4 animate-spin' />
                保存中...
              </>
            ) : (
              <>
                <Save className='size-4' />
                保存
              </>
            )}
          </Button>
          <Button
            onClick={onGenerate}
            disabled={busy}
            className='h-11 gap-2 px-8 text-base font-semibold'
          >
            {isGenerating ? (
              <>
                <LoaderCircle className='size-4 animate-spin' />
                生成中...
              </>
            ) : (
              <>
                <Play className='size-4 fill-current' />
                生成视频
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
