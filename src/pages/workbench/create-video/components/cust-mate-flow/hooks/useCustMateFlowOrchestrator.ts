import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { VideoGenerationTask } from '@/services/api/videoApi'
import { useAuthStore } from '@/stores/authStore'
import { normalizePlatforms } from '../../platformOptions'
import type { VideoConfigState } from '../../VideConfPane'
import type { CustomDraftData, CustomMaterialFlowProps } from '../types'
import {
  createDefaultVideoConfig,
  resolveStudioBootstrap,
  type MentionLabelRename,
} from '../utils/index'
import { useCustMateCatalog } from './useCustMateCatalog'
import { useCustMateDraft } from './useCustMateDraft'
import { useCustMateGeneration } from './useCustMateGeneration'
import { useCustMateMaterials } from './useCustMateMaterials'
import { useCustMateScripts } from './useCustMateScripts'

export const useCustMateFlowOrchestrator = ({
  availableModels = [],
  initialDraft,
  existingTaskId,
  createAsNew = false,
  initialHumanId,
  onStepChange,
  onSuccessTask,
}: Pick<
  CustomMaterialFlowProps,
  | 'availableModels'
  | 'initialDraft'
  | 'existingTaskId'
  | 'createAsNew'
  | 'initialHumanId'
  | 'onStepChange'
  | 'onSuccessTask'
>) => {
  const userId = useAuthStore((state) => state.auth.user?.id ?? '')

  const bootstrap = useMemo(
    () => resolveStudioBootstrap(initialDraft, userId, createAsNew),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const initialData = bootstrap.data

  const [config, setConfig] = useState<VideoConfigState>(() => ({
    ...createDefaultVideoConfig(),
    ...initialData.config,
    platforms: normalizePlatforms(initialData.config?.platforms).length
      ? normalizePlatforms(initialData.config?.platforms)
      : ['tiktok'],
  }))

  const [activeTasks, setActiveTasks] = useState<VideoGenerationTask[]>(
    () => bootstrap.activeTasks ?? []
  )

  const limitsRef = useRef({
    imageMaxSizeBytes: Number.POSITIVE_INFINITY,
    imageMaxSizeMb: Number.POSITIVE_INFINITY,
    maxReferenceImagesLimit: Number.POSITIVE_INFINITY,
    maxReferenceVideosLimit: Number.POSITIVE_INFINITY,
  })

  const stripMentionsRef = useRef<(labels: string[]) => void>(() => {})
  const remapMentionsRef = useRef<(renames: MentionLabelRename[]) => void>(
    () => {}
  )

  const materials = useCustMateMaterials({
    initialData,
    getLimits: () => limitsRef.current,
    onStripMentionLabels: (labels) => stripMentionsRef.current(labels),
    onRemapMentionLabels: (renames) => remapMentionsRef.current(renames),
  })

  const catalog = useCustMateCatalog({
    availableModels,
    config,
    setConfig,
    materials: materials.materials,
    setMaterials: materials.setMaterials,
    referenceVideos: materials.referenceVideos,
    setReferenceVideos: materials.setReferenceVideos,
  })

  limitsRef.current = {
    imageMaxSizeBytes: catalog.referenceLimits.imageMaxSizeBytes,
    imageMaxSizeMb: catalog.referenceLimits.imageMaxSizeMb,
    maxReferenceImagesLimit: catalog.maxReferenceImagesLimit,
    maxReferenceVideosLimit: catalog.maxReferenceVideosLimit,
  }

  const draftOpsRef = useRef({
    draftId: '',
    projectTitle: '',
    setDraftId: (_id: string) => {},
    buildDraftData: (_overrides?: Partial<CustomDraftData>) =>
      ({}) as CustomDraftData,
  })

  const scripts = useCustMateScripts({
    initialData,
    referenceMode: materials.referenceMode,
    firstFrame: materials.firstFrame,
    lastFrame: materials.lastFrame,
    materials: materials.materials,
    referenceVideos: materials.referenceVideos,
    maxReferenceImagesLimit: catalog.maxReferenceImagesLimit,
    config,
    selectedBackgroundMusic: catalog.selectedBackgroundMusic,
    draftOpsRef,
  })

  const getDraftSnapshot = useCallback(
    (): CustomDraftData => ({
      referenceMode: materials.referenceMode,
      firstFrame: materials.firstFrame,
      lastFrame: materials.lastFrame,
      activeSuppTab: materials.activeSuppTab,
      sellingPoints: materials.sellingPoints,
      referenceVideos: materials.referenceVideos,
      materials: materials.materials,
      activePreviewIndex: materials.activePreviewIndex,
      selectedHuman: scripts.selectedHuman,
      scriptContent: scripts.scriptContent,
      customScriptContent: scripts.customScriptContent,
      activeScriptMode: scripts.activeScriptMode,
      selectedScriptTab: scripts.selectedScriptTab,
      scripts: scripts.scripts,
      scriptSummary: scripts.scriptSummary,
      autoGenerateScripts: scripts.autoGenerateScripts,
      config,
    }),
    [materials, scripts, config]
  )

  const draft = useCustMateDraft({
    bootstrap,
    userId,
    onStepChange,
    getDraftSnapshot,
    activeTasks,
  })

  draftOpsRef.current = {
    draftId: draft.draftId,
    projectTitle: draft.projectTitle,
    setDraftId: draft.setDraftId,
    buildDraftData: draft.buildDraftData,
  }

  stripMentionsRef.current = scripts.stripMentionsFromAllScripts
  remapMentionsRef.current = scripts.remapMentionsInAllScripts

  const appliedInitialHuman = useRef(false)
  useEffect(() => {
    if (!initialHumanId || appliedInitialHuman.current) return
    const matched = catalog.digitalHumans.find(
      (human) => human.id === initialHumanId
    )
    if (matched) {
      scripts.handleApplyInitialHuman(matched)
      appliedInitialHuman.current = true
    }
  }, [initialHumanId, catalog.digitalHumans, scripts])

  const generation = useCustMateGeneration({
    userId,
    projectTitle: draft.projectTitle,
    setProjectTitle: draft.setProjectTitle,
    draftId: draft.draftId,
    setDraftId: draft.setDraftId,
    setCurrentStep: draft.setCurrentStep,
    config,
    setConfig,
    referenceMode: materials.referenceMode,
    firstFrame: materials.firstFrame,
    lastFrame: materials.lastFrame,
    materials: materials.materials,
    referenceVideos: materials.referenceVideos,
    selectedHuman: scripts.selectedHuman,
    selectedBackgroundMusic: catalog.selectedBackgroundMusic,
    activeScriptContent: scripts.activeScriptContent,
    hasPendingUploads: materials.hasPendingUploads,
    maxReferenceImagesLimit: catalog.maxReferenceImagesLimit,
    maxReferenceVideosLimit: catalog.maxReferenceVideosLimit,
    bootstrapSource: bootstrap.source,
    initialDraft,
    createAsNew,
    existingTaskId,
    onSuccessTask,
    saveDraft: draft.saveDraft,
    buildDraftData: draft.buildDraftData,
    activeTasks,
    setActiveTasks,
    resetMaterialsForNewProject: () => {
      materials.setReferenceMode('all')
      materials.setFirstFrame(null)
      materials.setLastFrame(null)
      materials.setSellingPoints('')
      materials.setReferenceVideos([])
      materials.setMaterials([])
      materials.setActivePreviewIndex(0)
    },
    resetScriptsForNewProject: () => {
      scripts.setSelectedHuman(null)
      scripts.setScriptContent('')
      scripts.setCustomScriptContent('')
      scripts.setActiveScriptMode('ai')
      scripts.setSelectedScriptTab('custom')
      scripts.setScripts([])
      scripts.setScriptSummary('')
      scripts.setAutoGenerateScripts(true)
    },
  })

  const handleConfigChange = (
    key: keyof VideoConfigState,
    val: unknown
  ) => {
    setConfig((prev) => ({
      ...prev,
      [key]: val as VideoConfigState[keyof VideoConfigState],
    }))
  }

  return {
    config,
    materials,
    catalog,
    scripts,
    draft,
    generation,
    activeTasks,
    setActiveTasks,
    availableModels,
    handleConfigChange,
  }
}
