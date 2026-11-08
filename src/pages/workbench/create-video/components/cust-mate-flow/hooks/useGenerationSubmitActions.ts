import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import { syncCreditBalance } from '@/services/api/creditApi'
import {
  createVideoGeneration,
  type CreateVideoGenerationInput,
  type VideoGenerationTask,
} from '@/services/api/videoApi'
import {
  CREATE_REENTER_EVENT,
  clearAllStudioSessions,
  resetCreateSessionKeepOperations,
  saveStudioSession,
} from '../../studioSession'
import type { VideoConfigState } from '../../VideConfPane'
import { terminalStatuses } from '../constants'
import type { CustomDraftData, ReferenceImage, ReferenceVideo } from '../types'
import { createDefaultVideoConfig, formatLimit, listUnresolvedMentionLabels } from '../utils/index'

type UseGenerationSubmitActionsParams = {
  userId: string
  projectTitle: string
  setProjectTitle: (title: string) => void
  draftId: string
  setDraftId: (id: string) => void
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void
  config: VideoConfigState
  setConfig: React.Dispatch<React.SetStateAction<VideoConfigState>>
  referenceMode: 'all' | 'frames'
  firstFrame: string | null
  materials: ReferenceImage[]
  referenceVideos: ReferenceVideo[]
  activeScriptContent: string
  maxReferenceImagesLimit: number
  maxReferenceVideosLimit: number
  taskIDForSubmission?: string
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
  createSeedanceRequest: (
    promptContent: string,
    useDigitalHumanAssetId?: boolean,
    videoDraftID?: string,
    draftDataJSON?: string
  ) => CreateVideoGenerationInput
}

export const useGenerationSubmitActions = ({
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
}: UseGenerationSubmitActionsParams) => {
  const queryClient = useQueryClient()
  const [submitting, setSubmitting] = useState(false)
  const submitLock = useRef(false)

  const buildMentionAssetsForPrompt = () => {
    const images = materials
      .filter((item) => item.type === 'image' && !item.uploading)
      .map((item, index) => ({
        name: /^图\d+$/.test(item.name.trim())
          ? item.name.trim()
          : `图${index + 1}`,
        kind: 'image',
      }))
    const videos = referenceVideos
      .filter((video) => !video.uploading)
      .map((video, index) => ({
        name: /^视频\d+$/.test(video.name.trim())
          ? video.name.trim()
          : `视频${index + 1}`,
        kind: 'video',
      }))
    const audios = config.customBgmFile
      ? [{ name: '音频1', kind: 'audio' }]
      : []
    return [...images, ...videos, ...audios]
  }

  const validateStudioReady = () => {
    if (referenceMode === 'frames' && !firstFrame) {
      toast.error('在首/尾帧模式下，请先指定或上传首帧画面')
      return false
    }
    if (
      referenceMode === 'all' &&
      materials.length === 0 &&
      referenceVideos.length === 0
    ) {
      toast.error('请先上传产品图片或参考视频')
      return false
    }
    if (!activeScriptContent.trim()) {
      toast.error('请选定或输入脚本文案')
      return false
    }
    // 生成仍按原逻辑：只接受能对应到当前参考素材的 @图N / @视频N / @音频N
    const unresolved = listUnresolvedMentionLabels(
      activeScriptContent,
      buildMentionAssetsForPrompt()
    )
    if (unresolved.length > 0) {
      toast.error('提示词中有无效素材引用，请点击红色标签重新选择')
      return false
    }
    return true
  }

  const handleSubmit = async (options?: { reuseTaskId?: boolean }) => {
    if (submitLock.current) return
    submitLock.current = true
    setSubmitting(true)
    try {
      if (!config.provider) {
        throw new Error('当前没有可用的视频生成供应商')
      }
      if (materials.length > maxReferenceImagesLimit) {
        throw new Error(
          `当前供应商最多支持 ${formatLimit(maxReferenceImagesLimit)} 张参考图片`
        )
      }
      if (referenceVideos.length > maxReferenceVideosLimit) {
        throw new Error(
          `当前供应商最多支持 ${formatLimit(maxReferenceVideosLimit)} 个参考视频`
        )
      }
      const draftSnapshot = buildDraftData()
      const draftDataJSON = JSON.stringify(draftSnapshot)
      // 生成只写任务主表 draft_data，不关联/写入草稿表
      const seedanceRequest = createSeedanceRequest(
        activeScriptContent,
        true,
        undefined,
        draftDataJSON
      )
      const reuseTaskId = Boolean(options?.reuseTaskId && taskIDForSubmission)
      const createCount = reuseTaskId ? 1 : config.variantsCount || 1
      const created: VideoGenerationTask[] = []
      let failedCount = 0
      let lastCreateError: unknown
      // 每个任务一创建成功就立刻进列表，避免等齐 N 个时中间的 running WS 被丢掉
      await Promise.all(
        Array.from({ length: createCount }, async () => {
          try {
            const task = await createVideoGeneration({
              task_id: reuseTaskId ? taskIDForSubmission : undefined,
              provider: config.provider,
              ...seedanceRequest,
            })
            created.push(task)
            // 只保留这一批；上一批不打断，可在「我的项目」查看
            setActiveTasks([...created])
            onSuccessTask?.(task)
          } catch (error) {
            failedCount += 1
            lastCreateError = error
          }
        })
      )
      if (created.length === 0) {
        throw new Error(
          getApiErrorMessage(lastCreateError, '创建视频任务失败')
        )
      }
      // 创建成功后积分通常已冻结，立即同步可用余额
      void syncCreditBalance(queryClient).catch(() => undefined)
      saveStudioSession(userId, {
        draftId,
        projectTitle,
        currentStep: 4,
        draftData: draftSnapshot as Record<string, unknown>,
        activeTasks: created,
        dirty: true,
      })
      if (failedCount > 0) {
        toast.warning(
          `已创建 ${created.length} 个任务，${failedCount} 个创建失败：${getApiErrorMessage(lastCreateError, '请稍后重试')}`
        )
      } else {
        toast.success(`已创建 ${created.length} 个自主素材视频任务`)
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, '创建视频任务失败'))
    } finally {
      setSubmitting(false)
      submitLock.current = false
    }
  }

  const handleStudioGenerate = async () => {
    if (!validateStudioReady()) return
    void handleSubmit({ reuseTaskId: true })
  }

  /** 用当前配置再发起一批，本页列表替换为新任务；上一批不打断，可在「我的项目」查看 */
  const handleRegenerate = async () => {
    if (!validateStudioReady()) return
    void handleSubmit()
  }

  /** 清空当前创作（等同侧栏再进创建），进行中的任务仍可在「我的项目」查看 */
  const handleCreateNewVideo = () => {
    if (submitLock.current) return
    resetCreateSessionKeepOperations(userId)
    window.dispatchEvent(new Event(CREATE_REENTER_EVENT))
    toast.success('已开始新视频，生成中的任务可在「我的项目」查看')
  }

  const handleSaveStudioDraft = async () => {
    if (!validateStudioReady()) return
    const draft = await saveDraft(4, draftId, buildDraftData(), true)
    if (draft) toast.success('草稿已保存')
  }

  const handleContinueWithOriginalMaterials = async () => {
    setDraftId('')
    setActiveTasks([])
    setCurrentStep(2)
    saveStudioSession(userId, {
      draftId: '',
      projectTitle,
      currentStep: 2,
      draftData: buildDraftData() as Record<string, unknown>,
      activeTasks: [],
      dirty: true,
    })
    toast.success('已复制原工程并带入原素材，可继续选择数字人')
  }

  const handleContinueWithNewMaterials = async () => {
    const newDraftData = buildDraftData({
      referenceMode: 'all',
      firstFrame: null,
      lastFrame: null,
      activeSuppTab: 'video',
      sellingPoints: '',
      referenceVideos: [],
      materials: [],
      activePreviewIndex: 0,
      selectedHuman: null,
      scriptContent: '',
      customScriptContent: '',
      activeScriptMode: 'ai',
      selectedScriptTab: 'custom',
      scripts: [],
      scriptSummary: '',
      autoGenerateScripts: true,
      config: createDefaultVideoConfig(),
    })
    clearAllStudioSessions(userId)
    setDraftId('')
    setProjectTitle('')
    resetMaterialsForNewProject()
    resetScriptsForNewProject()
    setConfig(createDefaultVideoConfig())
    setActiveTasks([])
    setCurrentStep(1)
    saveStudioSession(userId, {
      draftId: '',
      projectTitle: '',
      currentStep: 1,
      draftData: newDraftData as Record<string, unknown>,
      activeTasks: [],
      dirty: true,
    })
    toast.success('已复制新工程，请添加新素材')
  }

  /** 仅提交请求中：用于生成按钮 loading，不等待任务跑完 */
  const isGenerating = submitting
  const hasInflightTasks = activeTasks.some(
    (task) => !terminalStatuses.has(task.status)
  )

  return {
    submitting,
    handleStudioGenerate,
    handleRegenerate,
    handleCreateNewVideo,
    handleSaveStudioDraft,
    handleContinueWithOriginalMaterials,
    handleContinueWithNewMaterials,
    isGenerating,
    hasInflightTasks,
  }
}
