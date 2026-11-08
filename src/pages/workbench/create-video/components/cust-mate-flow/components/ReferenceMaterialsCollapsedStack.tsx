import { Film, LoaderCircle, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { SignedCreativeImage } from '@/components/business'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/utils/utils'

type StackItem = {
  id: string
  kind: 'image' | 'video'
  url: string
  name: string
  duration?: number
  videoUrl?: string
  uploading: boolean
}

type ReferenceMaterialsCollapsedStackProps = {
  items: StackItem[]
  materialsExpanded: boolean
  canAddReferenceContent: boolean
  refMentionOpen: boolean
  mentionPanel: ReactNode
  onToggleRefMention: () => void
  onReplaceCreativeUrl: (previous: string, next: string) => void
}

export const ReferenceMaterialsCollapsedStack = ({
  items,
  materialsExpanded,
  canAddReferenceContent,
  refMentionOpen,
  mentionPanel,
  onToggleRefMention,
  onReplaceCreativeUrl,
}: ReferenceMaterialsCollapsedStackProps) => {
  return (
    <div
      className={cn(
        'relative mx-auto h-[6.75rem] w-[5.25rem] transition-all duration-200 ease-out',
        materialsExpanded
          ? 'pointer-events-none scale-95 opacity-0'
          : 'scale-100 opacity-100'
      )}
    >
      {items.slice(-3).map((item, index, list) => (
        <div
          key={item.id}
          title={item.name}
          className='bg-background absolute h-24 w-[4.25rem] overflow-hidden rounded-2xl border shadow-sm'
          style={{
            left: `${index * 5}px`,
            top: `${index * 4}px`,
            transform: `rotate(${(index - (list.length - 1) / 2) * 6}deg)`,
            zIndex: index + 1,
          }}
        >
          {item.kind === 'video' ? (
            <video
              src={item.videoUrl}
              muted
              playsInline
              preload='metadata'
              className='size-full object-cover'
            />
          ) : (
            <SignedCreativeImage
              src={item.url}
              alt={item.name}
              className='size-full object-cover'
              onUrlChange={(next, previous) =>
                onReplaceCreativeUrl(previous, next)
              }
            />
          )}
          {item.kind === 'video' ? (
            <span className='absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/65 px-1 py-0.5 text-[9px] text-white'>
              <Film className='size-2.5' />
              {Math.round(item.duration ?? 0)}s
            </span>
          ) : null}
          {item.uploading ? (
            <span className='absolute inset-0 flex items-center justify-center bg-black/45'>
              <LoaderCircle className='size-5 animate-spin text-white' />
            </span>
          ) : null}
        </div>
      ))}
      {canAddReferenceContent && !materialsExpanded ? (
        <Popover open={refMentionOpen}>
          <PopoverAnchor asChild>
            <button
              type='button'
              className='border-border bg-background text-foreground hover:border-primary hover:text-primary absolute right-0 bottom-0 z-20 flex size-8 items-center justify-center rounded-full border shadow-sm'
              onClick={(event) => {
                event.stopPropagation()
                onToggleRefMention()
              }}
            >
              <Plus className='size-4' />
            </button>
          </PopoverAnchor>
          <PopoverContent
            align='start'
            side='right'
            sideOffset={12}
            avoidCollisions={false}
            className='bg-muted border-border w-auto max-w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border p-0 shadow-xl duration-200'
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            {mentionPanel}
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )
}
