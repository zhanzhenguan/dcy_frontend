import { History, ExternalLink, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type PublishHistoryRecord } from '../types'
import { PlatformIcon } from './PlatformIcons'

interface PublishHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  records: PublishHistoryRecord[]
}

export const PublishHistoryModal = ({
  open,
  onOpenChange,
  records,
}: PublishHistoryModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='rounded-2xl p-6 sm:max-w-2xl'>
        <DialogHeader className='space-y-1.5'>
          <DialogTitle className='flex items-center gap-2 text-lg font-bold'>
            <History className='text-primary h-5 w-5' />
            直连发布历史归档
          </DialogTitle>
          <DialogDescription className='text-xs'>
            查看过去的视频分发记录与各个社交平台的上线动态状态
          </DialogDescription>
        </DialogHeader>

        <div className='my-3 max-h-[450px] space-y-4 overflow-y-auto pr-1'>
          {records.map((rec) => (
            <div
              key={rec.id}
              className='bg-card hover:border-primary/30 space-y-3 rounded-xl border p-4 shadow-xs transition-all'
            >
              <div className='flex items-center gap-3'>
                <img
                  src={rec.coverUrl}
                  alt={rec.title}
                  className='h-12 w-20 shrink-0 rounded-lg border bg-black object-cover'
                />
                <div className='min-w-0 flex-1 space-y-1'>
                  <h4 className='text-foreground truncate text-xs font-bold sm:text-sm'>
                    {rec.title}
                  </h4>
                  <div className='text-muted-foreground flex items-center gap-3 font-mono text-[11px]'>
                    <span className='flex items-center gap-1'>
                      <Calendar className='h-3 w-3' />
                      {rec.publishedAt}
                    </span>
                    <span>成功同步 {rec.totalPlatforms} 个平台</span>
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-2 border-t pt-2 text-xs sm:grid-cols-3'>
                {rec.platforms.map((p) => (
                  <div
                    key={p.platformId}
                    className='bg-muted/30 flex items-center justify-between gap-1.5 rounded-lg border p-2'
                  >
                    <div className='flex min-w-0 items-center gap-1.5'>
                      <PlatformIcon
                        platformId={p.platformId}
                        className='h-3.5 w-3.5 shrink-0'
                      />
                      <span className='truncate text-[11px] font-medium'>
                        {p.platformName}
                      </span>
                    </div>

                    {p.postUrl ? (
                      <a
                        href={p.postUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-primary flex shrink-0 items-center gap-0.5 text-[10px] font-medium hover:underline'
                      >
                        已就绪
                        <ExternalLink className='h-2.5 w-2.5' />
                      </a>
                    ) : (
                      <Badge variant='outline' className='py-0 text-[9px]'>
                        已处理
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className='flex justify-end border-t pt-2'>
          <Button
            size='sm'
            onClick={() => onOpenChange(false)}
            className='rounded-xl px-5 text-xs'
          >
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
