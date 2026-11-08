import { useState } from 'react'
import type { VideoDraft, VideoGenerationTask } from '@/services/api/videoApi'
import type { DigitalHuman } from '../../DigiHumaPick'
import type { VideoConfigState } from '../../VideConfPane'
import type { CustomDraftData, ReferenceImage, ReferenceVideo } from '../types'
import { buildSeedanceRequest } from '../utils/index'
import { useGenerationSubmitActions } from './useGenerationSubmitActions'
import { useGenerationTaskPolling } from './useGenerationTaskPolling'
import { useVideoEstimate } from './useVideoEstimate'

type UseCustMateGenerationParams = {
  userId: string
  projectTitle: string
  setProjectTitle: (title: string) => void
  draftId: string
  setDraftId?: (id: string) => void
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void
  config: VideoConfigState
  setConfig: React.Dispatch<React.SetStateAction<VideoConfigState>>
  referenceMode: 'all' | 'frames'
  firstFrame: string | null
  lastFrame: string | null
  materials: ReferenceImage[]
  referenceVideos: ReferenceVideo[]
  selectedHuman: DigitalHuman | null
  selectedBackgroundMusic?: { url: string; code: string }
  activeScriptContent: string
  hasPendingUploads: boolean
  maxReferenceImagesLimit: number
  maxReferenceVideosLimit: number
  bootstrapSource: string
  initialDraft?: VideoDraft
  createAsNew: boolean
  existingTaskId?: string
  onSuccessTask?: (task: VideoGenerationTask) => void
  saveDraft: (
    nextStep: 1 | 2 | 3 | 4,
    targetDraftId?: string,
    draftData?: CustomDraftData,
    manualSave?: boolean
  ) => Promise<{ id: string; project_title?: string } | null>
  buildDraftData: (overrides?: Partial<CustomDraftData>) => CustomDraftData
  activeTasks: VideoGenerationTask[]
  setActiveTasks: React.Dispatch<React.SetStateAction<VideoGenerationTask[]>>
  resetMaterialsForNewProject: () => void
  resetScriptsForNewProject: () => void
}

export const useCustMateGeneration = ({
  userId,
  projectTitle,
  setProjectTitle,
  draftId,
  setDraftId,
  setCurrentStep,
  config,
  setConfig,
  referenceMode,
  firstFrame,
  lastFrame,
  materials,
  referenceVideos,
  selectedHuman,
  selectedBackgroundMusic,
  activeScriptContent,
  hasPendingUploads,
  maxReferenceImagesLimit,
  maxReferenceVideosLimit,
  bootstrapSource,
  initialDraft,
  createAsNew,
  existingTaskId,
  onSuccessTask,
  saveDraft,
  buildDraftData,
  activeTasks,
  setActiveTasks,
  resetMaterialsForNewProject,
  resetScriptsForNewProject,
}: UseCustMateGenerationParams) => {
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null)

  const { estimateQuery, estimatedCredits } = useVideoEstimate({
    config,
    materials,
    referenceVideos,
    hasPendingUploads,
  })

  const taskIDForSubmission =
    !createAsNew &&
    bootstrapSource !== 'create' &&
    Boolean(initialDraft?.id) &&
    draftId === initialDraft?.id
      ? existingTaskId
      : undefined

  const createSeedanceRequest = (
    promptContent: string,
    useDigitalHumanAssetId = false,
    videoDraftID = draftId,
    draftDataJSON?: string
  ) =>
    buildSeedanceRequest({
      projectTitle,
      draftId,
      draftData: draftDataJSON,
      config,
      referenceMode,
      firstFrame,
      lastFrame,
      materials,
      referenceVideos,
      selectedHuman,
      selectedBackgroundMusic,
      promptContent,
      useDigitalHumanAssetId,
      videoDraftID,
    })

  useGenerationTaskPolling({ activeTasks, setActiveTasks })

  const submitActions = useGenerationSubmitActions({
    userId,
    projectTitle,
    setProjectTitle,
    draftId,
    setDraftId: setDraftId ?? (() => undefined),
    setCurrentStep,
    config,
    setConfig,
    referenceMode,
    firstFrame,
    materials,
    referenceVideos,
    activeScriptContent,
    maxReferenceImagesLimit,
    maxReferenceVideosLimit,
    taskIDForSubmission,
    onSuccessTask,
    saveDraft,
    buildDraftData,
    activeTasks,
    setActiveTasks,
    resetMaterialsForNewProject,
    resetScriptsForNewProject,
    createSeedanceRequest,
  })

  const allSucceeded =
    activeTasks.length > 0 &&
    activeTasks.every((task) => task.status === 'succeeded')

  return {
    submitting: submitActions.submitting,
    activeTasks,
    setActiveTasks,
    resultVideoUrl,
    setResultVideoUrl,
    estimateQuery,
    estimatedCredits,
    handleStudioGenerate: submitActions.handleStudioGenerate,
    handleRegenerate: submitActions.handleRegenerate,
    handleCreateNewVideo: submitActions.handleCreateNewVideo,
    handleSaveStudioDraft: submitActions.handleSaveStudioDraft,
    handleContinueWithOriginalMaterials:
      submitActions.handleContinueWithOriginalMaterials,
    handleContinueWithNewMaterials: submitActions.handleContinueWithNewMaterials,
    allSucceeded,
    isGenerating: submitActions.isGenerating,
    hasInflightTasks: submitActions.hasInflightTasks,
  }
}
