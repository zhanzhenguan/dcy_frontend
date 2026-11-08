import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdownMenu'

type AccountRowActionsProps = {
  onEdit: () => void
  onDelete: () => void
}

export const AccountRowActions = ({
  onEdit,
  onDelete,
}: AccountRowActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-8'
          aria-label='账号操作'
        >
          <MoreHorizontal className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-36'>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className='size-4' />
          更新账号
        </DropdownMenuItem>
        <DropdownMenuItem variant='destructive' onSelect={onDelete}>
          <Trash2 className='size-4' />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
