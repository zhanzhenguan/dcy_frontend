import { Film, LoaderCircle, Plus, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { SignedCreativeImage } from '@/components/business'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/utils/utils'
import { formatLimit } from '../utils/index'
import type { ReferenceImage, ReferenceVideo } from '../types'

type DragKind = 'image' | 'video'

type DragState = {
  kind: DragKind
  index: number
}

type ReferenceMaterialsExpandedStripProps = {
  materials: ReferenceImage[]
  referenceVideos: ReferenceVideo[]
  materialsExpanded: boolean
  canAddReferenceContent: boolean
  maxReferenceImagesLimit: number
  maxReferenceVideosLimit: number
  refMentionOpen: boolean
  mentionPanel: ReactNode
  onPreviewMaterial: (url: string) => void
  onPreviewVideo: (url: string) => void
  onRemoveMaterial: (id: string) => void
  onRemoveVideo: (id: string) => void
  onReplaceCreativeUrl: (previous: string, next: string) => void
  onReorderMaterials: (fromIndex: number, toIndex: number) => void
  onReorderVideos: (fromIndex: number, toIndex: number) => void
  onOpenMaterialsExpanded: () => void
  onScheduleCollapseMaterials: () => void
  onKeepExpandedForPopover: () => void
  onToggleRefMention: () => void
  onMaterialsDraggingChange: (dragging: boolean) => void
}

export const ReferenceMaterialsExpandedStrip = ({
  materials,
  referenceVideos,
  materialsExpanded,
  canAddReferenceContent,
  maxReferenceImagesLimit,
  maxReferenceVideosLimit,
  refMentionOpen,
  mentionPanel,
  onPreviewMaterial,
  onPreviewVideo,
  onRemoveMaterial,
  onRemoveVideo,
  onReplaceCreativeUrl,
  onReorderMaterials,
  onReorderVideos,
  onOpenMaterialsExpanded,
  onScheduleCollapseMaterials,
  onKeepExpandedForPopover,
  onToggleRefMention,
  onMaterialsDraggingChange,
}: ReferenceMaterialsExpandedStripProps) => {
  const dragRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const [dragging, setDragging] = useState<DragState | null>(null)
  const [dragOver, setDragOver] = useState<DragState | null>(null)

  const clearDrag = () => {
    dragRef.current = null
    setDragging(null)
    setDragOver(null)
  }

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    kind: DragKind,
    index: number
  ) => {
    dragRef.current = { kind, index }
    suppressClickRef.current = false
    setDragging({ kind, index })
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `${kind}:${index}`)
    onMaterialsDraggingChange(true)
  }

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    kind: DragKind,
    index: number
  ) => {
    const active = dragRef.current
    if (!active || active.kind !== kind) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOver((previous) =>
      previous?.kind === kind && previous.index === index
        ? previous
        : { kind, index }
    )
  }

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    kind: DragKind,
    index: number
  ) => {
    event.preventDefault()
    const active = dragRef.current
    if (!active || active.kind !== kind) {
      clearDrag()
      onMaterialsDraggingChange(false)
      return
    }
    if (active.index !== index) {
      suppressClickRef.current = true
      if (kind === 'image') onReorderMaterials(active.index, index)
      else onReorderVideos(active.index, index)
    }
    clearDrag()
    onMaterialsDraggingChange(false)
  }

  const handleDragEnd = () => {
    clearDrag()
    onMaterialsDraggingChange(false)
  }

  const handlePreviewClick = (preview: () => void) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    preview()
  }

  return (
    <Popover open={refMentionOpen && materialsExpanded}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            'bg-background/95 absolute top-0 left-0 z-50 flex w-max max-w-[min(28rem,70vw)] items-center gap-2 overflow-x-auto rounded-2xl border p-2 shadow-xl backdrop-blur-sm transition-all duration-200 ease-out',
            materialsExpanded
              ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
          )}
          aria-hidden={!materialsExpanded}
          onMouseEnter={onOpenMaterialsExpanded}
          onMouseLeave={() => {
            if (!dragRef.current) onScheduleCollapseMaterials()
          }}
        >
      {materials.map((item, index) => {
        const isDragging =
          dragging?.kind === 'image' && dragging.index === index
        const isOver = dragOver?.kind === 'image' && dragOver.index === index

        return (
          <div
            key={item.id}
            draggable={!item.uploading}
            onDragStart={(event) => handleDragStart(event, 'image', index)}
            onDragOver={(event) => handleDragOver(event, 'image', index)}
            onDrop={(event) => handleDrop(event, 'image', index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'group relative h-24 w-[4.5rem] shrink-0 transition-transform duration-200 ease-out',
              !item.uploading && 'cursor-grab active:cursor-grabbing',
              isDragging && 'scale-95 opacity-40',
              isOver && !isDragging && 'ring-primary -translate-y-0.5 ring-2',
              !isDragging && !isOver && 'hover:-translate-y-0.5'
            )}
          >
            <div
              role='button'
              tabIndex={item.uploading ? -1 : 0}
              title={
                item.uploading
                  ? '上传中…'
                  : `${item.name || '参考内容'}`
              }
              className='bg-background size-full overflow-hidden rounded-2xl border shadow-sm transition-shadow duration-200 group-hover:shadow-md focus-visible:outline-none'
              aria-disabled={item.uploading}
              onClick={() => {
                if (item.uploading) return
                handlePreviewClick(() => onPreviewMaterial(item.url))
              }}
              onKeyDown={(event) => {
                if (item.uploading) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handlePreviewClick(() => onPreviewMaterial(item.url))
                }
              }}
            >
              <SignedCreativeImage
                src={item.url}
                alt={item.name || '参考内容'}
                className='pointer-events-none size-full object-cover transition-transform duration-200 group-hover:scale-105'
                onUrlChange={(next, previous) =>
                  onReplaceCreativeUrl(previous, next)
                }
              />
            </div>
            {item.uploading ? (
              <span className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-black/45'>
                <LoaderCircle className='size-5 animate-spin text-white' />
                <span className='text-[10px] text-white'>上传中</span>
              </span>
            ) : (
              <button
                type='button'
                title='删除'
                aria-label='删除参考图'
                className='absolute top-1 right-1 z-10 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100'
                onClick={(event) => {
                  event.stopPropagation()
                  onRemoveMaterial(item.id)
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <X className='size-3' />
              </button>
            )}
          </div>
        )
      })}
      {referenceVideos.map((video, index) => {
        const isDragging =
          dragging?.kind === 'video' && dragging.index === index
        const isOver = dragOver?.kind === 'video' && dragOver.index === index

        return (
          <div
            key={video.id}
            draggable={!video.uploading}
            onDragStart={(event) => handleDragStart(event, 'video', index)}
            onDragOver={(event) => handleDragOver(event, 'video', index)}
            onDrop={(event) => handleDrop(event, 'video', index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'group relative h-24 w-[4.5rem] shrink-0 transition-transform duration-200 ease-out',
              !video.uploading && 'cursor-grab active:cursor-grabbing',
              isDragging && 'scale-95 opacity-40',
              isOver && !isDragging && 'ring-primary -translate-y-0.5 ring-2',
              !isDragging && !isOver && 'hover:-translate-y-0.5'
            )}
          >
            <div
              role='button'
              tabIndex={video.uploading ? -1 : 0}
              title={
                video.uploading
                  ? '上传中…'
                  : `${video.name || '参考视频'}`
              }
              className='bg-background size-full overflow-hidden rounded-2xl border shadow-sm transition-shadow duration-200 group-hover:shadow-md focus-visible:outline-none'
              aria-disabled={video.uploading}
              onClick={() => {
                if (video.uploading) return
                handlePreviewClick(() => onPreviewVideo(video.url))
              }}
              onKeyDown={(event) => {
                if (video.uploading) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handlePreviewClick(() => onPreviewVideo(video.url))
                }
              }}
            >
              <video
                src={video.url}
                muted
                playsInline
                preload='metadata'
                draggable={false}
                className='pointer-events-none size-full object-cover transition-transform duration-200 group-hover:scale-105'
              />
              <span className='absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/65 px-1 py-0.5 text-[9px] text-white'>
                <Film className='size-2.5' />
                {Math.round(video.duration)}s
              </span>
            </div>
            {video.uploading ? (
              <span className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-black/45'>
                <LoaderCircle className='size-5 animate-spin text-white' />
                <span className='text-[10px] text-white'>上传中</span>
              </span>
            ) : (
              <button
                type='button'
                title='删除'
                aria-label='删除参考视频'
                className='absolute top-1 right-1 z-10 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100'
                onClick={(event) => {
                  event.stopPropagation()
                  onRemoveVideo(video.id)
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <X className='size-3' />
              </button>
            )}
          </div>
        )
      })}
      {canAddReferenceContent && materialsExpanded ? (
        <button
          type='button'
          className='border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary bg-background flex h-24 w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md'
          onClick={onToggleRefMention}
          onMouseEnter={onKeepExpandedForPopover}
        >
          <Plus className='size-4' />
          <span className='mt-0.5 text-[9px] leading-none'>参考</span>
          <span className='text-[9px] leading-none'>
            图{materials.length}/{formatLimit(maxReferenceImagesLimit)}
          </span>
          <span className='text-[9px] leading-none'>
            视频{referenceVideos.length}/
            {formatLimit(maxReferenceVideosLimit)}
          </span>
        </button>
      ) : null}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align='start'
        side='bottom'
        sideOffset={12}
        avoidCollisions={false}
        className='bg-muted border-border w-auto max-w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border p-0 shadow-xl duration-200'
        onOpenAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={onKeepExpandedForPopover}
      >
        {mentionPanel}
      </PopoverContent>
    </Popover>
  )
}
