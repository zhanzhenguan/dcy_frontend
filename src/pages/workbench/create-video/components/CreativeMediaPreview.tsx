import { X } from 'lucide-react'
import { requestCreativeUrlPresign } from '@/services/api/creativePresign'
import { SignedCreativeImage } from '@/components/business'

export type CreativeMediaPreviewTarget = {
  kind: 'image' | 'video'
  url: string
}

type CreativeMediaPreviewProps = {
  target: CreativeMediaPreviewTarget | null
  onClose: () => void
  /** 换签成功后同步业务 state（素材 / 首尾帧 / 当前预览 url） */
  onUrlChange?: (nextUrl: string, previousUrl: string) => void
  imageAlt?: string
}

/**
 * 参考内容 / 首尾帧等创意素材的全屏大图 / 视频预览。
 */
export const CreativeMediaPreview = ({
  target,
  onClose,
  onUrlChange,
  imageAlt = '图片预览',
}: CreativeMediaPreviewProps) => {
  if (!target) return null

  return (
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center bg-black/80'
      role='dialog'
      aria-modal='true'
      aria-label={target.kind === 'video' ? '视频预览' : '图片预览'}
      onClick={onClose}
    >
      <button
        type='button'
        title='关闭'
        aria-label='关闭'
        className='absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90'
        onClick={onClose}
      >
        <X className='size-4' />
      </button>
      {target.kind === 'video' ? (
        <video
          src={target.url}
          controls
          muted
          loop
          playsInline
          preload='metadata'
          className='max-h-[85vh] max-w-[90vw] rounded-lg bg-black object-contain'
          onClick={(event) => event.stopPropagation()}
          onMouseEnter={(event) => {
            void event.currentTarget.play().catch(() => {
              /* 忽略自动播放策略拦截 */
            })
          }}
          onMouseLeave={(event) => {
            event.currentTarget.pause()
          }}
          onError={() => {
            const previous = target.url
            void requestCreativeUrlPresign(previous)
              .then((next) => {
                if (!next || next === previous) return
                onUrlChange?.(next, previous)
              })
              .catch(() => {
                /* 保留当前地址，避免预览中断 */
              })
          }}
        />
      ) : (
        <SignedCreativeImage
          src={target.url}
          alt={imageAlt}
          className='max-h-[85vh] max-w-[90vw] object-contain'
          onClick={(event) => event.stopPropagation()}
          onUrlChange={onUrlChange}
        />
      )}
    </div>
  )
}
