import { FileAudio, FileImage, Film } from 'lucide-react'
import { cn } from '@/utils/utils'
import type { MentionAsset } from './MentionAssetsPanel'

type MentionImagePickerProps = {
  assets: MentionAsset[]
  onSelect: (asset: MentionAsset) => void
}

const CATEGORY_ORDER = [
  { kind: 'image' as const, label: '图片' },
  { kind: 'video' as const, label: '视频' },
  { kind: 'audio' as const, label: '音频' },
]

function AssetThumb({ asset }: { asset: MentionAsset }) {
  if (asset.kind === 'image' && asset.url) {
    return (
      <img
        src={asset.url}
        alt={asset.name}
        className='size-full object-cover'
      />
    )
  }
  if (asset.kind === 'video') {
    if (asset.posterUrl || asset.url) {
      return (
        <span className='relative size-full'>
          {asset.posterUrl ? (
            <img
              src={asset.posterUrl}
              alt={asset.name}
              className='size-full object-cover'
            />
          ) : (
            <video
              src={asset.url}
              muted
              playsInline
              preload='metadata'
              className='size-full object-cover'
            />
          )}
          <span className='absolute inset-0 flex items-center justify-center bg-black/25'>
            <Film className='size-3.5 text-white' />
          </span>
        </span>
      )
    }
    return <Film className='text-muted-foreground size-4' />
  }
  return <FileAudio className='text-muted-foreground size-4' />
}

/** @ 菜单：按图片 / 视频 / 音频分类，顺序与已上传素材一致 */
export const MentionImagePicker = ({
  assets = [],
  onSelect,
}: MentionImagePickerProps) => {
  const sections = CATEGORY_ORDER.map((category) => ({
    ...category,
    items: assets.filter((item) => item.kind === category.kind),
  })).filter((section) => section.items.length > 0)

  if (sections.length === 0) {
    return (
      <div className='text-muted-foreground flex flex-col items-center justify-center gap-2 px-4 py-6 text-center text-xs'>
        <FileImage className='size-8 opacity-40' />
        <p>暂无可用素材</p>
        <p className='text-[11px] opacity-80'>请先上传图片、视频或音频</p>
      </div>
    )
  }

  return (
    <div className='max-h-72 overflow-y-auto py-1'>
      {sections.map((section) => (
        <div key={section.kind} className='px-1.5 pb-1'>
          <div className='text-muted-foreground px-2 py-1.5 text-[11px] font-medium tracking-wide'>
            {section.label}
          </div>
          <div className='space-y-0.5'>
            {section.items.map((asset) => (
              <button
                key={asset.id}
                type='button'
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                  'hover:bg-muted focus-visible:bg-muted focus-visible:outline-none'
                )}
                onClick={() => onSelect(asset)}
              >
                <span className='bg-muted flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border'>
                  <AssetThumb asset={asset} />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='text-foreground block truncate text-sm'>
                    {asset.name}
                  </span>
                  {asset.kind === 'video' &&
                  typeof asset.duration === 'number' ? (
                    <span className='text-muted-foreground text-[11px]'>
                      {Math.round(asset.duration)}s
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
