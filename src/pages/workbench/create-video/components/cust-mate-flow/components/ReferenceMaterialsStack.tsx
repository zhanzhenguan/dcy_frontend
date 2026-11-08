import { forwardRef, useMemo } from 'react'
import type { CreativeAsset } from '@/services/api/creativeApi'
import { MentionAssetsPanel } from '../../MentionAssetsPanel'
import type { ReferenceImage, ReferenceVideo } from '../types'
import { ReferenceMaterialsCollapsedStack } from './ReferenceMaterialsCollapsedStack'
import { ReferenceMaterialsEmptyState } from './ReferenceMaterialsEmptyState'
import { ReferenceMaterialsExpandedStrip } from './ReferenceMaterialsExpandedStrip'
import { useReferenceMaterialsExpand } from '../hooks/useReferenceMaterialsExpand'

export type ReferenceMaterialsStackHandle = {
  closeMentionPopover: () => void
  expandMaterials: () => void
  scheduleCollapseMaterials: () => void
}

type ReferenceMaterialsStackProps = {
  materials: ReferenceImage[]
  referenceVideos: ReferenceVideo[]
  maxReferenceImagesLimit: number
  maxReferenceVideosLimit: number
  onUploadClick: () => void
  excludedLibraryAssetIds: string[]
  onSelectLibraryAssets: (
    assets: import('@/services/api/assetLibraryApi').Asset[]
  ) => void
  onSelectRecent: (asset: CreativeAsset) => void | Promise<void>
  onPreviewAsset?: (target: {
    kind: 'image' | 'video'
    url: string
  }) => void
  onPreviewMaterial: (url: string) => void
  onPreviewVideo: (url: string) => void
  onRemoveMaterial: (id: string) => void
  onRemoveVideo: (id: string) => void
  onReplaceCreativeUrl: (previous: string, next: string) => void
  onReorderMaterials: (fromIndex: number, toIndex: number) => void
  onReorderVideos: (fromIndex: number, toIndex: number) => void
}

export const ReferenceMaterialsStack = forwardRef<
  ReferenceMaterialsStackHandle,
  ReferenceMaterialsStackProps
>(
  (
    {
      materials,
      referenceVideos,
      maxReferenceImagesLimit,
      maxReferenceVideosLimit,
      onUploadClick,
      excludedLibraryAssetIds,
      onSelectLibraryAssets,
      onSelectRecent,
      onPreviewAsset,
      onPreviewMaterial,
      onPreviewVideo,
      onRemoveMaterial,
      onRemoveVideo,
      onReplaceCreativeUrl,
      onReorderMaterials,
      onReorderVideos,
    },
    ref
  ) => {
    const expand = useReferenceMaterialsExpand(ref)

    const hasReferenceContent =
      materials.length > 0 || referenceVideos.length > 0
    const canAddReferenceContent =
      materials.length < maxReferenceImagesLimit ||
      referenceVideos.length < maxReferenceVideosLimit

    const referenceStackItems = useMemo(
      () => [
        ...materials.map((item) => ({
          id: item.id,
          kind: 'image' as const,
          url: item.url,
          name: item.name || '参考内容',
          uploading: Boolean(item.uploading),
        })),
        ...referenceVideos.map((video) => ({
          id: video.id,
          kind: 'video' as const,
          url: video.url,
          name: video.name || '参考视频',
          duration: video.duration,
          videoUrl: video.url,
          uploading: Boolean(video.uploading),
        })),
      ],
      [materials, referenceVideos]
    )

    const mentionAssetsPanel = (
      <MentionAssetsPanel
        key={expand.refMentionOpen ? 'open' : 'closed'}
        active={expand.refMentionOpen}
        onUpload={onUploadClick}
        onSelectRecent={onSelectRecent}
        onSelectLibraryAssets={onSelectLibraryAssets}
        onPreview={onPreviewAsset}
        excludedLibraryAssetIds={excludedLibraryAssetIds}
        onClose={expand.closeMentionPopover}
      />
    )

    return (
      <div className='shrink-0 overflow-visible px-1 pt-1 md:me-3'>
        {!hasReferenceContent ? (
          <ReferenceMaterialsEmptyState
            refMentionOpen={expand.refMentionOpen}
            mentionPanel={mentionAssetsPanel}
            onToggleRefMention={expand.toggleRefMention}
          />
        ) : (
          <div
            className='relative z-40'
            onMouseEnter={expand.openMaterialsExpanded}
            onMouseLeave={expand.scheduleCollapseMaterials}
          >
            <ReferenceMaterialsCollapsedStack
              items={referenceStackItems}
              materialsExpanded={expand.materialsExpanded}
              canAddReferenceContent={canAddReferenceContent}
              refMentionOpen={expand.refMentionOpen}
              mentionPanel={mentionAssetsPanel}
              onToggleRefMention={expand.toggleRefMention}
              onReplaceCreativeUrl={onReplaceCreativeUrl}
            />
            <ReferenceMaterialsExpandedStrip
              materials={materials}
              referenceVideos={referenceVideos}
              materialsExpanded={expand.materialsExpanded}
              canAddReferenceContent={canAddReferenceContent}
              maxReferenceImagesLimit={maxReferenceImagesLimit}
              maxReferenceVideosLimit={maxReferenceVideosLimit}
              refMentionOpen={expand.refMentionOpen}
              mentionPanel={mentionAssetsPanel}
              onPreviewMaterial={onPreviewMaterial}
              onPreviewVideo={onPreviewVideo}
              onRemoveMaterial={onRemoveMaterial}
              onRemoveVideo={onRemoveVideo}
              onReplaceCreativeUrl={onReplaceCreativeUrl}
              onReorderMaterials={onReorderMaterials}
              onReorderVideos={onReorderVideos}
              onOpenMaterialsExpanded={expand.openMaterialsExpanded}
              onScheduleCollapseMaterials={expand.scheduleCollapseMaterials}
              onKeepExpandedForPopover={expand.keepMaterialsExpandedForPopover}
              onToggleRefMention={expand.toggleRefMention}
              onMaterialsDraggingChange={expand.setMaterialsDragging}
            />
          </div>
        )}
      </div>
    )
  }
)

ReferenceMaterialsStack.displayName = 'ReferenceMaterialsStack'
