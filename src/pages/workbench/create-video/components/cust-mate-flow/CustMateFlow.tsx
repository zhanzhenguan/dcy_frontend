import { StudioDialogs } from './components/StudioDialogs'
import { StudioWorkspace } from './components/StudioWorkspace'
import { useCustMateFlowOrchestrator } from './hooks/useCustMateFlowOrchestrator'
import type { CustomMaterialFlowProps } from './types'
import { remapMentionTokens } from './utils/index'
import { extractImageMentionOrder } from '../promptMentionClipboard'

export const CustomMaterialFlow = ({
  availableModels = [],
  creditBalance = 856,
  onSuccessTask,
  initialDraft,
  existingTaskId,
  createAsNew = false,
  initialHumanId,
  onStepChange,
  userLocale,
}: CustomMaterialFlowProps) => {
  const flow = useCustMateFlowOrchestrator({
    availableModels,
    initialDraft,
    existingTaskId,
    createAsNew,
    initialHumanId,
    onStepChange,
    onSuccessTask,
  })

  const {
    config,
      materials,
    catalog,
      scripts,
    draft,
    generation,
        activeTasks,
    setActiveTasks,
    handleConfigChange,
  } = flow

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <StudioWorkspace
          config={config}
        referenceMode={materials.referenceMode}
          availableModels={availableModels}
          userLocale={userLocale}
        mentionableImages={scripts.mentionableAssets}
        promptResolveAssets={scripts.promptResolveAssets}
          selectedDigitalHuman={
          scripts.selectedHuman?.avatarUrl
              ? {
                name: scripts.selectedHuman.name,
                avatarUrl: scripts.selectedHuman.avatarUrl,
                }
              : null
          }
        scriptGenerating={scripts.scriptGenerating}
        hasPendingUploads={materials.hasPendingUploads}
        firstFrame={materials.firstFrame}
        lastFrame={materials.lastFrame}
        materials={materials.materials}
        referenceVideos={materials.referenceVideos}
        maxReferenceImagesLimit={catalog.maxReferenceImagesLimit}
        maxReferenceVideosLimit={catalog.maxReferenceVideosLimit}
        scriptTabs={scripts.scriptTabs}
        selectedScriptTab={scripts.selectedScriptTab}
        promptFocused={scripts.promptFocused}
        promptValue={scripts.promptValue}
        promptFieldRef={scripts.promptFieldRef}
        materialsStackRef={materials.materialsStackRef}
        creditBalance={creditBalance}
        estimatedCredits={generation.estimatedCredits}
        estimateError={
          generation.estimateQuery.error instanceof Error
            ? generation.estimateQuery.error
            : null
        }
        estimateLoading={generation.estimateQuery.isLoading}
        savingDraft={draft.savingDraft}
        isGenerating={generation.isGenerating}
        hasInflightTasks={generation.hasInflightTasks}
        activeTasksCount={activeTasks.length}
        onConfigChange={handleConfigChange}
        onReferenceModeChange={materials.setReferenceMode}
        onSelectMentionImage={scripts.handleInsertMentionImage}
        onOpenDigitalHuman={() => scripts.setHumanPickerOpen(true)}
        onClearDigitalHuman={scripts.handleClearDigitalHuman}
        onGeneratePrompt={() => void scripts.handleGenerateScripts()}
        onMaterialUploadClick={() =>
          materials.materialUploadInputRef.current?.click()
        }
        excludedLibraryAssetIds={[
          ...materials.materials
            .map((item) => item.assetId)
            .filter((id): id is string => Boolean(id)),
          ...materials.referenceVideos
            .map((item) => item.assetId)
            .filter((id): id is string => Boolean(id)),
        ]}
        onSelectLibraryAssets={materials.handleSelectLibraryAssets}
        onSelectRecentCreativeAsset={materials.handleSelectRecentCreativeAsset}
        onPreviewMaterial={materials.setMaterialPreview}
        onRemoveMaterial={materials.handleRemoveMaterial}
        onRemoveReferenceVideo={(id) =>
          void materials.handleRemoveReferenceVideo(id)
        }
        onReorderMaterials={materials.handleReorderMaterials}
        onReorderReferenceVideos={materials.handleReorderReferenceVideos}
        onReplaceCreativeUrl={materials.handleReplaceCreativeAssetUrl}
        onFirstFrameUpload={materials.handleFirstFrameUpload}
        onLastFrameUpload={materials.handleLastFrameUpload}
        onSwapFrames={materials.handleSwapFrames}
        onDeleteFirstFrame={() => void materials.handleDeleteFirstFrame()}
        onDeleteLastFrame={() => void materials.handleDeleteLastFrame()}
        onSelectScriptTab={scripts.handleSelectScriptTab}
        onPromptChange={scripts.handleSetPromptValue}
        onResolvePastedPrompt={(nextValue) => {
          const order = extractImageMentionOrder(nextValue)
          const renames = materials.alignMaterialsToImageMentionOrder(order)
          if (renames.length === 0) return nextValue
          scripts.remapMentionsInAllScripts(renames)
          return remapMentionTokens(nextValue, renames)
        }}
        onPromptFocus={() => scripts.setPromptFocused(true)}
        onPromptBlur={() => scripts.setPromptFocused(false)}
        onSaveDraft={() => void generation.handleSaveStudioDraft()}
        onGenerate={() => void generation.handleStudioGenerate()}
        onRegenerate={() => void generation.handleRegenerate()}
        onCreateNewVideo={generation.handleCreateNewVideo}
        onSaveDraftAfterModeChange={() => undefined}
      />

      <StudioDialogs
        materialUploadInputRef={materials.materialUploadInputRef}
        onMaterialUpload={materials.handleMaterialUpload}
        materialPreview={materials.materialPreview}
        onCloseMaterialPreview={() => materials.setMaterialPreview(null)}
        onReplaceCreativeUrl={materials.handleReplaceCreativeAssetUrl}
        resultVideoUrl={generation.resultVideoUrl}
        onResultVideoOpenChange={(open) => {
          if (!open) generation.setResultVideoUrl(null)
        }}
        onResultVideoUrlChange={generation.setResultVideoUrl}
        activeTasks={activeTasks}
        onSetActiveTasks={setActiveTasks}
        humanPickerOpen={scripts.humanPickerOpen}
        onHumanPickerOpenChange={scripts.setHumanPickerOpen}
        digitalHumans={catalog.digitalHumans}
        digitalHumansLoading={catalog.digitalHumanQuery.isLoading}
        selectedHuman={scripts.selectedHuman}
        onSelectHuman={(human) => {
          scripts.setSelectedHuman(human)
          scripts.setHumanPickerOpen(false)
        }}
        onClearHuman={() => {
          scripts.handleClearDigitalHuman()
          scripts.setHumanPickerOpen(false)
        }}
        onPreviewTask={generation.setResultVideoUrl}
      />
    </div>
  )
}
