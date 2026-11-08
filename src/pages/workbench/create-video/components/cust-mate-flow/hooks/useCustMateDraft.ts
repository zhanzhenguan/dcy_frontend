import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { saveVideoDraft } from '@/services/api/videoApi'
import type { VideoGenerationTask } from '@/services/api/videoApi'
import { saveStudioSession } from '../../studioSession'
import type { VideoConfigState } from '../../VideConfPane'
import type { CustomDraftData } from '../types'
import { resolveStudioBootstrap, serializeVideoConfig } from '../utils/index'

export type CustMateBootstrap = ReturnType<typeof resolveStudioBootstrap>

type UseCustMateDraftParams = {
  bootstrap: ReturnType<typeof resolveStudioBootstrap>
  userId: string
  onStepChange?: (step: number) => void
  getDraftSnapshot: () => CustomDraftData
  activeTasks: VideoGenerationTask[]
}

export const useCustMateDraft = ({
  bootstrap,
  userId,
  onStepChange,
  getDraftSnapshot,
  activeTasks,
}: UseCustMateDraftParams) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(
    bootstrap.currentStep
  )
  const [draftId, setDraftId] = useState(bootstrap.draftId)
  const [projectTitle, setProjectTitle] = useState(bootstrap.projectTitle)
  const [savingDraft, setSavingDraft] = useState(false)

  useEffect(() => {
    onStepChange?.(currentStep)
  }, [currentStep, onStepChange])

  const buildDraftData = (
    overrides: Partial<CustomDraftData> = {},
    configOverride?: Partial<VideoConfigState>
  ): CustomDraftData => {
    const snapshot = getDraftSnapshot()
    const { config: configFromOverride, ...rest } = overrides
    const mergedConfig = configOverride
      ? { ...snapshot.config!, ...configOverride }
      : configFromOverride
        ? { ...snapshot.config!, ...configFromOverride }
        : snapshot.config

    return {
      ...snapshot,
      ...rest,
      config: serializeVideoConfig(mergedConfig!),
    }
  }

  const sessionBaselineReadyRef = useRef(bootstrap.source !== 'draft-server')
  const sessionBaselineRef = useRef(
    bootstrap.source === 'draft-server' ? '' : JSON.stringify(bootstrap.data)
  )

  useEffect(() => {
    if (bootstrap.source !== 'draft-server') return
    const timer = window.setTimeout(() => {
      sessionBaselineRef.current = JSON.stringify(getDraftSnapshot())
      sessionBaselineReadyRef.current = true
    }, 1600)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const snapshot = getDraftSnapshot()
      const serialized = JSON.stringify(snapshot)

      if (bootstrap.source === 'draft-server') {
        if (!sessionBaselineReadyRef.current) return
        if (serialized === sessionBaselineRef.current) return
      }

      saveStudioSession(userId, {
        draftId,
        projectTitle,
        currentStep,
        draftData: snapshot as Record<string, unknown>,
        activeTasks,
        dirty: true,
      })
    }, 200)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userId,
    draftId,
    projectTitle,
    currentStep,
    activeTasks,
    getDraftSnapshot,
  ])

  const saveDraft = async (
    nextStep: 1 | 2 | 3 | 4,
    targetDraftId = draftId,
    draftData = buildDraftData(),
    _manualSave = true
  ) => {
    setSavingDraft(true)
    try {
      const draft = await saveVideoDraft({
        id: targetDraftId || undefined,
        mode: 'custom',
        current_step: nextStep,
        draft_data: JSON.stringify(draftData),
        manual_save: true,
      })
      setDraftId(draft.id)
      if (draft.project_title) setProjectTitle(draft.project_title)
      saveStudioSession(userId, {
        draftId: draft.id,
        projectTitle: draft.project_title || projectTitle,
        currentStep: nextStep,
        draftData: draftData as Record<string, unknown>,
        activeTasks,
        dirty: true,
      })
      sessionBaselineRef.current = JSON.stringify(draftData)
      sessionBaselineReadyRef.current = true
      return draft
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '草稿保存失败')
      return null
    } finally {
      setSavingDraft(false)
    }
  }

  return {
    bootstrap,
    currentStep,
    setCurrentStep,
    draftId,
    setDraftId,
    projectTitle,
    setProjectTitle,
    savingDraft,
    buildDraftData,
    saveDraft,
    initialData: bootstrap.data,
  }
}
