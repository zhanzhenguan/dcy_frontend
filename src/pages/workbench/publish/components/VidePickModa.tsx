import { Video, Check, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type VideoPublishContent } from '../types'

interface VideoPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videos: VideoPublishContent[]
  selectedVideoId: string
  onSelectVideo: (video: VideoPublishContent) => void
}

export const VideoPickerModal = ({
  open,
  onOpenChange,
  videos,
  selectedVideoId,
  onSelectVideo,
}: VideoPickerModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='rounded-2xl p-6 sm:max-w-2xl'>
        <DialogHeader className='space-y-1.5'>
          <DialogTitle className='flex items-center gap-2 text-lg font-bold'>
            <Video className='text-primary h-5 w-5' />
            选择待发布的生成视频
          </DialogTitle>
          <DialogDescription className='text-xs'>
            从已完成的项目记录中挑选，或直接上传本地本地高清视频文件
          </DialogDescription>
        </DialogHeader>

        <div className='my-4 grid max-h-[400px] grid-cols-1 gap-3 overflow-y-auto pr-1'>
          {videos.map((vid) => {
            const isSelected = vid.id === selectedVideoId

            return (
              <div
                key={vid.id}
                onClick={() => {
                  onSelectVideo(vid)
                  onOpenChange(false)
                }}
                className={`flex cursor-pointer items-center gap-4 rounded-xl border p-3 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-primary/30 shadow-xs ring-1'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                }`}
              >
                <div className='relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border bg-black'>
                  <img
                    src={vid.coverUrl}
                    alt={vid.title}
                    className='h-full w-full object-cover opacity-90'
                  />
                  <div className='absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 font-mono text-[10px] text-white'>
                    {vid.duration}
                  </div>
                </div>

                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex items-center gap-2'>
                    <Badge
                      variant='outline'
                      className='py-0 font-mono text-[10px]'
                    >
                      {vid.ratio}
                    </Badge>

                    <span className='text-muted-foreground font-mono text-[11px]'>
                      {vid.createdAt}
                    </span>
                  </div>
                  <h4 className='text-foreground truncate text-xs font-bold sm:text-sm'>
                    {vid.title}
                  </h4>
                  <p className='text-muted-foreground truncate text-xs'>
                    {vid.description}
                  </p>
                </div>

                {isSelected && (
                  <div className='bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full'>
                    <Check className='h-3.5 w-3.5 stroke-[3]' />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className='flex items-center justify-between gap-3 border-t pt-3'>
          <Button
            variant='outline'
            size='sm'
            className='gap-1.5 rounded-xl border-dashed text-xs'
          >
            <Upload className='h-3.5 w-3.5' />
            上传本地 MP4/MOV 视频
          </Button>

          <Button
            size='sm'
            onClick={() => onOpenChange(false)}
            className='rounded-xl px-5 text-xs'
          >
            确认选择
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
