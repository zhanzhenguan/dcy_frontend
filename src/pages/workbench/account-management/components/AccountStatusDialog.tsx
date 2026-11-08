import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/utils/utils'
import {
  getStatusTagToneProps,
  resolveAccountStatusTags,
  type AccountStatusTag,
  type ManagedAccount,
} from '../types'

type AccountStatusDialogProps = {
  account: ManagedAccount | null
  statusTags: AccountStatusTag[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AccountStatusDialog = ({
  account,
  statusTags,
  open,
  onOpenChange,
}: AccountStatusDialogProps) => {
  if (!account) return null

  const activeTags = resolveAccountStatusTags(account.statuses, statusTags)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>账号状态</DialogTitle>
          <DialogDescription>
            {account.name}
            {account.remark ? ` · ${account.remark}` : ''}
          </DialogDescription>
        </DialogHeader>

        {activeTags.length === 0 ? (
          <div className='text-muted-foreground rounded-lg border border-dashed px-3 py-8 text-center text-sm'>
            未设置状态
          </div>
        ) : (
          <div className='flex flex-wrap gap-2 py-1'>
            {activeTags.map((tag) => {
              const tone = getStatusTagToneProps(tag)
              return (
                <span
                  key={tag.id}
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                    tone.className
                  )}
                  style={tone.style}
                >
                  {tag.label}
                </span>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
