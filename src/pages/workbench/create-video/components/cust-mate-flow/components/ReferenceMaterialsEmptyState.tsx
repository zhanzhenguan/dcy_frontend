import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/utils/utils'

type ReferenceMaterialsEmptyStateProps = {
  refMentionOpen: boolean
  mentionPanel: ReactNode
  onToggleRefMention: () => void
}

export const ReferenceMaterialsEmptyState = ({
  refMentionOpen,
  mentionPanel,
  onToggleRefMention,
}: ReferenceMaterialsEmptyStateProps) => {
  return (
    <Popover open={refMentionOpen}>
      <PopoverAnchor asChild>
        <button
          type='button'
          className={cn(
            'group border-muted-foreground/40 bg-background relative mx-auto flex aspect-[3/4] w-[6.5rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-all duration-200',
            'hover:border-primary rotate-2 hover:rotate-0'
          )}
          onClick={onToggleRefMention}
        >
          <Plus className='text-muted-foreground group-hover:text-primary size-5 transition-colors' />
          <span className='text-muted-foreground group-hover:text-primary mt-1 text-[10px] transition-colors'>
            参考内容
          </span>
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
  )
}
