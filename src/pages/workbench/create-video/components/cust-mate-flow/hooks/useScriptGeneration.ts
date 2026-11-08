import { useState } from 'react'
import { toast } from 'sonner'
import { generateAdScripts } from '@/services/api/creativeApi'
import type { DigitalHuman } from '../../DigiHumaPick'
import { type ScriptMode, type ScriptTemplate } from '../../ScriptSelector'
import type { VideoConfigState } from '../../VideConfPane'
import type { CustomDraftData, ReferenceImage, ReferenceVideo } from '../types'
import { buildSeedanceRequest } from '../utils/index'

type UseScriptGenerationParams = {
  referenceMode: 'all' | 'frames'
  firstFrame: string | null
  lastFrame: string | null
  materials: ReferenceImage[]
  referenceVideos: ReferenceVideo[]
  maxReferenceImagesLimit: number
  config: VideoConfigState
  selectedBackgroundMusic?: { url: string }
  selectedHuman: DigitalHuman | null
  selectedScriptTab: string
  customScriptContent: string
  draftOpsRef: React.RefObject<{
    draftId: string
    projectTitle: string
    setDraftId: (id: string) => void
    buildDraftData: (overrides?: Partial<CustomDraftData>) => CustomDraftData
  }>
  setScripts: React.Dispatch<React.SetStateAction<ScriptTemplate[]>>
  setScriptSummary: React.Dispatch<React.SetStateAction<string>>
  setScriptContent: React.Dispatch<React.SetStateAction<string>>
  setActiveScriptMode: React.Dispatch<React.SetStateAction<ScriptMode>>
  setSelectedScriptTab: React.Dispatch<React.SetStateAction<string>>
}

export const useScriptGeneration = ({
  referenceMode,
  firstFrame,
  lastFrame,
  materials,
  referenceVideos,
  maxReferenceImagesLimit,
  config,
  selectedBackgroundMusic,
  selectedHuman,
  selectedScriptTab,
  customScriptContent,
  draftOpsRef,
  setScripts,
  setScriptSummary,
  setScriptContent,
  setActiveScriptMode,
  setSelectedScriptTab,
}: UseScriptGenerationParams) => {
  const [scriptGenerating, setScriptGenerating] = useState(false)

  const handleGenerateScripts = async () => {
    const materialImageUrls =
      referenceMode === 'frames'
        ? [firstFrame, lastFrame].filter((value): value is string =>
            Boolean(value)
          )
        : materials.map((item) => item.url)
    const imageSourceLimit = selectedHuman
      ? maxReferenceImagesLimit - 1
      : maxReferenceImagesLimit
    const imageUrls = Array.from(
      new Set(
        [
          ...materialImageUrls.slice(0, imageSourceLimit),
          ...(selectedHuman?.avatarUrl ? [selectedHuman.avatarUrl] : []),
        ].slice(0, maxReferenceImagesLimit)
      )
    )
    if (imageUrls.length === 0 && referenceVideos.length === 0) {
      toast.error('请先上传产品图片或参考视频')
      return
    }
    setScriptGenerating(true)
    try {
      const result = await generateAdScripts({
        image_urls: imageUrls,
        product_video_url: referenceVideos[0]?.url,
        introduction: '',
        platform: config.platforms[0],
        language: config.language,
        ratio: config.ratio,
        resolution: config.resolution,
        duration: config.duration,
        provider: config.provider,
        bgm: config.bgm === 'bgm-none' ? '' : config.bgm,
        variants_count: config.variantsCount,
        content: buildSeedanceRequest({
          projectTitle: draftOpsRef.current?.projectTitle ?? '',
          draftId: draftOpsRef.current?.draftId ?? '',
          config,
          referenceMode,
          firstFrame,
          lastFrame,
          materials,
          referenceVideos,
          selectedHuman,
          selectedBackgroundMusic,
          promptContent: '__SCRIPT_CONTENT__',
        }).content,
      })
      const nextScripts = result.scripts.map(
        (
          script: {
            title: string
            tag: string
            duration: number
            content: string
          },
          index: number
        ) => ({
          id: `script-${index + 1}`,
          title: script.title,
          tag: script.tag,
          duration: `${script.duration}s`,
          content: script.content,
        })
      )
      const nextScriptContent = nextScripts[0]?.content ?? ''
      const keepCustomTab =
        selectedScriptTab === 'custom' && customScriptContent.trim().length > 0
      setScripts(nextScripts)
      setScriptSummary(result.summary)
      setScriptContent(nextScriptContent)
      if (keepCustomTab) {
        setActiveScriptMode('custom')
        setSelectedScriptTab('custom')
      } else {
        setActiveScriptMode('ai')
        setSelectedScriptTab(nextScripts[0]?.id ?? 'custom')
      }
      toast.success('已生成 4 条电商视频广告脚本')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '广告脚本生成失败')
    } finally {
      setScriptGenerating(false)
    }
  }

  return {
    scriptGenerating,
    handleGenerateScripts,
  }
}
