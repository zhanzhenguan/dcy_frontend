import { Plus, X, ArrowUpDown } from 'lucide-react'
import { SignedCreativeImage } from '@/components/business'
import type { CreativeMediaPreviewTarget } from '../../CreativeMediaPreview'

type FramesReferencePanelProps = {
  firstFrame: string | null
  lastFrame: string | null
  onPreview: (target: CreativeMediaPreviewTarget) => void
  onReplaceCreativeUrl: (previous: string, next: string) => void
  onFirstFrameUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onLastFrameUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSwapFrames: () => void
  onDeleteFirstFrame: () => void
  onDeleteLastFrame: () => void
}

export const FramesReferencePanel = ({
  firstFrame,
  lastFrame,
  onPreview,
  onReplaceCreativeUrl,
  onFirstFrameUpload,
  onLastFrameUpload,
  onSwapFrames,
  onDeleteFirstFrame,
  onDeleteLastFrame,
}: FramesReferencePanelProps) => {
  return (
    <div className='flex w-full shrink-0 flex-col items-center gap-1 md:me-3'>
      {firstFrame ? (
        <div className='group border-muted-foreground/40 bg-background relative flex aspect-[3/4] w-[4.5rem] overflow-hidden rounded-xl border'>
          <button
            type='button'
            title='查看大图'
            className='size-full'
            onClick={() => onPreview({ kind: 'image', url: firstFrame })}
          >
            <SignedCreativeImage
              src={firstFrame}
              alt='首帧'
              className='size-full object-cover transition-transform duration-200 group-hover:scale-105'
              onUrlChange={(next, previous) =>
                onReplaceCreativeUrl(previous, next)
              }
            />
          </button>
          <button
            type='button'
            title='删除'
            aria-label='删除首帧'
            className='absolute top-1 right-1 z-10 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100'
            onClick={(event) => {
              event.stopPropagation()
              onDeleteFirstFrame()
            }}
          >
            <X className='size-3' />
          </button>
        </div>
      ) : (
        <label className='group border-muted-foreground/40 bg-background hover:border-primary relative flex aspect-[3/4] w-[4.5rem] rotate-3 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed transition-all duration-200 hover:rotate-0'>
          <Plus className='text-muted-foreground group-hover:text-primary size-4 transition-colors' />
          <span className='text-muted-foreground group-hover:text-primary mt-0.5 text-[10px] transition-colors'>
            首帧
          </span>
          <input
            type='file'
            accept='image/*'
            className='hidden'
            onChange={onFirstFrameUpload}
          />
        </label>
      )}
      <button
        type='button'
        className='text-muted-foreground hover:text-primary flex size-5 shrink-0 items-center justify-center rounded-full transition-colors'
        aria-label='交换首尾帧'
        onClick={onSwapFrames}
      >
        <ArrowUpDown className='size-3' />
      </button>
      {lastFrame ? (
        <div className='group border-muted-foreground/40 bg-background relative flex aspect-[3/4] w-[4.5rem] overflow-hidden rounded-xl border'>
          <button
            type='button'
            title='查看大图'
            className='size-full'
            onClick={() => onPreview({ kind: 'image', url: lastFrame })}
          >
            <SignedCreativeImage
              src={lastFrame}
              alt='尾帧'
              className='size-full object-cover transition-transform duration-200 group-hover:scale-105'
              onUrlChange={(next, previous) =>
                onReplaceCreativeUrl(previous, next)
              }
            />
          </button>
          <button
            type='button'
            title='删除'
            aria-label='删除尾帧'
            className='absolute top-1 right-1 z-10 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100'
            onClick={(event) => {
              event.stopPropagation()
              onDeleteLastFrame()
            }}
          >
            <X className='size-3' />
          </button>
        </div>
      ) : (
        <label className='group border-muted-foreground/40 bg-background hover:border-primary relative flex aspect-[3/4] w-[4.5rem] rotate-3 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed transition-all duration-200 hover:rotate-0'>
          <Plus className='text-muted-foreground group-hover:text-primary size-4 transition-colors' />
          <span className='text-muted-foreground group-hover:text-primary mt-0.5 text-[10px] transition-colors'>
            尾帧
          </span>
          <input
            type='file'
            accept='image/*'
            className='hidden'
            onChange={onLastFrameUpload}
          />
        </label>
      )}
    </div>
  )
}
