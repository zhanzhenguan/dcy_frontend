import { Download, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type AssetBatchToolbarProps = {
  selectedCount: number
  deleting?: boolean
  downloading?: boolean
  downloadDisabled?: boolean
  onDelete: () => void
  onDownload: () => void
  onCancel: () => void
}

export const AssetBatchToolbar = ({
  selectedCount,
  deleting = false,
  downloading = false,
  downloadDisabled = false,
  onDelete,
  onDownload,
  onCancel,
}: AssetBatchToolbarProps) => {
  const busy = deleting || downloading
  return (
    <div className='bg-card flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 shadow-xs'>
      <p className='text-foreground text-sm font-medium'>
        已选择{' '}
        <span className='text-primary tabular-nums'>{selectedCount}</span>{' '}
        项内容
      </p>

      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='secondary'
          size='sm'
          className='h-8 gap-1.5'
          disabled={selectedCount === 0 || busy}
          onClick={onDelete}
        >
          <Trash2 className='size-3.5' />
          删除
        </Button>
        <Button
          type='button'
          variant='secondary'
          size='sm'
          className='h-8 gap-1.5'
          disabled={selectedCount === 0 || busy || downloadDisabled}
          title={
            downloadDisabled ? '仅已完成的视频支持下载' : undefined
          }
          onClick={onDownload}
        >
          <Download className='size-3.5' />
          {downloading ? '打包中…' : '下载'}
        </Button>
      </div>

      <div className='bg-border mx-1 hidden h-5 w-px sm:block' />

      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='text-muted-foreground hover:text-foreground ms-auto h-8 gap-1.5'
        onClick={onCancel}
      >
        <X className='size-3.5' />
        取消选择
      </Button>
    </div>
  )
}
