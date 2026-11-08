import { cn } from '@/utils/utils'
import type { CreativeMediaPreviewTarget } from '../../CreativeMediaPreview'
import { PromptMentionField, type PromptMentionFieldHandle } from '../../PromptMentionField'
import type { MentionAsset } from '../../MentionAssetsPanel'
import { VideoStudioToolbar } from '../../VideoStudioToolbar'
import type { ModelCatalogItem } from '../types'
import type { ReferenceImage, ReferenceVideo } from '../types'
import { FramesReferencePanel } from './FramesReferencePanel'
import {
  ReferenceMaterialsStack,
  type ReferenceMaterialsStackHandle,
} from './ReferenceMaterialsStack'
import { ScriptTabsPanel } from './ScriptTabsPanel'
import { StudioFooterBar } from './StudioFooterBar'

type StudioWorkspaceProps = {
  config: import('../../VideConfPane').VideoConfigState
  referenceMode: 'all' | 'frames'
  availableModels: ModelCatalogItem[]
  userLocale?: string
  mentionableImages: MentionAsset[]
  promptResolveAssets: MentionAsset[]
  selectedDigitalHuman: { name: string; avatarUrl: string } | null
  scriptGenerating: boolean
  hasPendingUploads: boolean
  firstFrame: string | null
  lastFrame: string | null
  materials: ReferenceImage[]
  referenceVideos: ReferenceVideo[]
  maxReferenceImagesLimit: number
  maxReferenceVideosLimit: number
  scriptTabs: Array<{ id: string; title: string }>
  selectedScriptTab: string
  promptFocused: boolean
  promptValue: string
  promptFieldRef: React.RefObject<PromptMentionFieldHandle | null>
  materialsStackRef: React.RefObject<ReferenceMaterialsStackHandle | null>
  creditBalance: number
  estimatedCredits: number
  estimateError: Error | null
  estimateLoading: boolean
  savingDraft: boolean
  isGenerating: boolean
  hasInflightTasks: boolean
  activeTasksCount: number
  onConfigChange: (
    key: keyof import('../../VideConfPane').VideoConfigState,
    val: unknown
  ) => void
  onReferenceModeChange: (mode: 'all' | 'frames') => void
  onSelectMentionImage: (image: MentionAsset) => void
  onOpenDigitalHuman: () => void
  onClearDigitalHuman: () => void
  onGeneratePrompt: () => void
  onMaterialUploadClick: () => void
  excludedLibraryAssetIds: string[]
  onSelectLibraryAssets: (
    assets: import('@/services/api/assetLibraryApi').Asset[]
  ) => void
  onSelectRecentCreativeAsset: (
    asset: import('@/services/api/creativeApi').CreativeAsset
  ) => void | Promise<void>
  onPreviewMaterial: (target: CreativeMediaPreviewTarget) => void
  onRemoveMaterial: (id: string) => void
  onRemoveReferenceVideo: (id: string) => void
  onReorderMaterials: (fromIndex: number, toIndex: number) => void
  onReorderReferenceVideos: (fromIndex: number, toIndex: number) => void
  onReplaceCreativeUrl: (previous: string, next: string) => void
  onFirstFrameUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onLastFrameUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSwapFrames: () => void
  onDeleteFirstFrame: () => void
  onDeleteLastFrame: () => void
  onSelectScriptTab: (tabId: string) => void
  onPromptChange: (value: string) => void
  /** 粘贴提示词后按图片引用顺序对齐参考图 */
  onResolvePastedPrompt?: (nextValue: string) => string
  onPromptFocus: () => void
  onPromptBlur: () => void
  onSaveDraft: () => void
  onGenerate: () => void
  onRegenerate: () => void
  onCreateNewVideo: () => void
  onSaveDraftAfterModeChange: () => void
}

export const StudioWorkspace = ({
  config,
  referenceMode,
  availableModels,
  userLocale,
  mentionableImages,
  promptResolveAssets,
  selectedDigitalHuman,
  scriptGenerating,
  hasPendingUploads,
  firstFrame,
  lastFrame,
  materials,
  referenceVideos,
  maxReferenceImagesLimit,
  maxReferenceVideosLimit,
  scriptTabs,
  selectedScriptTab,
  promptFocused,
  promptValue,
  promptFieldRef,
  materialsStackRef,
  creditBalance,
  estimatedCredits,
  estimateError,
  estimateLoading,
  savingDraft,
  isGenerating,
  hasInflightTasks,
  activeTasksCount,
  onConfigChange,
  onReferenceModeChange,
  onSelectMentionImage,
  onOpenDigitalHuman,
  onClearDigitalHuman,
  onGeneratePrompt,
  onMaterialUploadClick,
  excludedLibraryAssetIds,
  onSelectLibraryAssets,
  onSelectRecentCreativeAsset,
  onPreviewMaterial,
  onRemoveMaterial,
  onRemoveReferenceVideo,
  onReorderMaterials,
  onReorderReferenceVideos,
  onReplaceCreativeUrl,
  onFirstFrameUpload,
  onLastFrameUpload,
  onSwapFrames,
  onDeleteFirstFrame,
  onDeleteLastFrame,
  onSelectScriptTab,
  onPromptChange,
  onResolvePastedPrompt,
  onPromptFocus,
  onPromptBlur,
  onSaveDraft,
  onGenerate,
  onRegenerate,
  onCreateNewVideo,
  onSaveDraftAfterModeChange,
}: StudioWorkspaceProps) => {
  return (
    <div className='bg-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-sm'>
      <VideoStudioToolbar
        config={config}
        referenceMode={referenceMode}
        availableModels={availableModels}
        userLocale={userLocale}
        currentImages={mentionableImages}
        onSelectMentionImage={onSelectMentionImage}
        onOpenDigitalHuman={onOpenDigitalHuman}
        selectedDigitalHuman={selectedDigitalHuman}
        onClearDigitalHuman={onClearDigitalHuman}
        onGeneratePrompt={onGeneratePrompt}
        generatePromptPending={scriptGenerating}
        generatePromptDisabled={hasPendingUploads}
        onReferenceModeChange={(mode) => {
          onReferenceModeChange(mode)
          onSaveDraftAfterModeChange()
        }}
        onChange={onConfigChange}
      />

      <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pt-5 pb-4 md:flex-row md:items-stretch md:gap-0 md:px-5 md:pt-6 md:pb-5'>
        <div
          className={cn(
            'relative z-30 flex w-full shrink-0 flex-col gap-3 overflow-visible pl-2 md:-mr-0.5 md:h-full md:w-52'
          )}
        >
          {referenceMode === 'frames' ? (
            <FramesReferencePanel
              firstFrame={firstFrame}
              lastFrame={lastFrame}
              onPreview={onPreviewMaterial}
              onReplaceCreativeUrl={onReplaceCreativeUrl}
              onFirstFrameUpload={onFirstFrameUpload}
              onLastFrameUpload={onLastFrameUpload}
              onSwapFrames={onSwapFrames}
              onDeleteFirstFrame={onDeleteFirstFrame}
              onDeleteLastFrame={onDeleteLastFrame}
            />
          ) : (
            <ReferenceMaterialsStack
              ref={materialsStackRef}
              materials={materials}
              referenceVideos={referenceVideos}
              maxReferenceImagesLimit={maxReferenceImagesLimit}
              maxReferenceVideosLimit={maxReferenceVideosLimit}
              onUploadClick={onMaterialUploadClick}
              excludedLibraryAssetIds={excludedLibraryAssetIds}
              onSelectLibraryAssets={onSelectLibraryAssets}
              onSelectRecent={onSelectRecentCreativeAsset}
              onPreviewAsset={onPreviewMaterial}
              onPreviewMaterial={(url) =>
                onPreviewMaterial({ kind: 'image', url })
              }
              onPreviewVideo={(url) =>
                onPreviewMaterial({ kind: 'video', url })
              }
              onRemoveMaterial={onRemoveMaterial}
              onRemoveVideo={onRemoveReferenceVideo}
              onReplaceCreativeUrl={onReplaceCreativeUrl}
              onReorderMaterials={onReorderMaterials}
              onReorderVideos={onReorderReferenceVideos}
            />
          )}

          <ScriptTabsPanel
            scriptTabs={scriptTabs}
            selectedScriptTab={selectedScriptTab}
            promptFocused={promptFocused}
            onSelectScriptTab={onSelectScriptTab}
          />
        </div>

        <div
          className={cn(
            'bg-surface relative z-0 flex min-h-[20rem] flex-1 flex-col overflow-hidden rounded-xl border-2 md:min-h-0 md:rounded-l-xl',
            promptFocused ? 'border-primary' : 'border-border'
          )}
          onMouseEnter={() =>
            materialsStackRef.current?.scheduleCollapseMaterials()
          }
        >
          <PromptMentionField
            ref={promptFieldRef}
            value={promptValue}
            onChange={onPromptChange}
            images={mentionableImages}
            resolveImages={promptResolveAssets}
            onResolvePastedPrompt={onResolvePastedPrompt}
            placeholder='描述您想要生成的视频画面、动作、氛围等。可以使用 @ 引用已上传的图片、视频或音频（如图1、视频1）...'
            onFocus={onPromptFocus}
            onBlur={onPromptBlur}
          />
        </div>
      </div>

      <StudioFooterBar
        creditBalance={creditBalance}
        estimatedCredits={estimatedCredits}
        variantsCount={config.variantsCount || 1}
        estimateError={estimateError}
        estimateLoading={estimateLoading}
        savingDraft={savingDraft}
        isGenerating={isGenerating}
        hasInflightTasks={hasInflightTasks}
        scriptGenerating={scriptGenerating}
        hasPendingUploads={hasPendingUploads}
        hasActiveTasks={activeTasksCount > 0}
        onSaveDraft={onSaveDraft}
        onGenerate={onGenerate}
        onRegenerate={onRegenerate}
        onCreateNewVideo={onCreateNewVideo}
      />
    </div>
  )
}
