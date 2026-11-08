import { useCallback, useMemo, useRef, useState } from 'react'
import type { DigitalHuman } from '../../DigiHumaPick'
import { type MentionAsset } from '../../MentionAssetsPanel'
import { type PromptMentionFieldHandle } from '../../PromptMentionField'
import { type ScriptMode, type ScriptTemplate } from '../../ScriptSelector'
import type { VideoConfigState } from '../../VideConfPane'
import type { CustomDraftData, ReferenceImage, ReferenceVideo } from '../types'
import { mentionLabelsForAsset, remapMentionTokens, stripMentionTokens } from '../utils/index'
import type { MentionLabelRename } from '../utils/index'
import { useMentionableAssets } from './useMentionableAssets'
import { useScriptGeneration } from './useScriptGeneration'

type UseCustMateScriptsParams = {
  initialData: {
    selectedHuman?: DigitalHuman | null
    scriptContent?: string
    customScriptContent?: string
    activeScriptMode?: ScriptMode
    selectedScriptTab?: string
    scripts?: ScriptTemplate[]
    scriptSummary?: string
    autoGenerateScripts?: boolean
  }
  referenceMode: 'all' | 'frames'
  firstFrame: string | null
  lastFrame: string | null
  materials: ReferenceImage[]
  referenceVideos: ReferenceVideo[]
  maxReferenceImagesLimit: number
  config: VideoConfigState
  selectedBackgroundMusic?: { url: string }
  draftOpsRef: React.RefObject<{
    draftId: string
    projectTitle: string
    setDraftId: (id: string) => void
    buildDraftData: (overrides?: Partial<CustomDraftData>) => CustomDraftData
  }>
}

export const useCustMateScripts = ({
  initialData,
  referenceMode,
  firstFrame,
  lastFrame,
  materials,
  referenceVideos,
  maxReferenceImagesLimit,
  config,
  selectedBackgroundMusic,
  draftOpsRef,
}: UseCustMateScriptsParams) => {
  const initialScriptMode: ScriptMode = initialData.activeScriptMode ?? 'ai'
  const [selectedHuman, setSelectedHuman] = useState<DigitalHuman | null>(
    initialData.selectedHuman ?? null
  )
  const [activeScriptMode, setActiveScriptMode] =
    useState<ScriptMode>(initialScriptMode)
  const [scriptContent, setScriptContent] = useState(
    initialScriptMode === 'ai' ? (initialData.scriptContent ?? '') : ''
  )
  const [customScriptContent, setCustomScriptContent] = useState(
    initialData.customScriptContent ??
      (initialScriptMode === 'custom' ? (initialData.scriptContent ?? '') : '')
  )
  const [scripts, setScripts] = useState<ScriptTemplate[]>(
    initialData.scripts ?? []
  )
  const [scriptSummary, setScriptSummary] = useState(
    initialData.scriptSummary ?? ''
  )
  const [autoGenerateScripts, setAutoGenerateScripts] = useState(
    initialData.autoGenerateScripts ?? true
  )
  const [selectedScriptTab, setSelectedScriptTab] = useState<string>(
    () => initialData.selectedScriptTab ?? 'custom'
  )
  const [humanPickerOpen, setHumanPickerOpen] = useState(false)
  const [promptFocused, setPromptFocused] = useState(false)

  const promptFieldRef = useRef<PromptMentionFieldHandle>(null)

  const activeScriptContent =
    activeScriptMode === 'custom' ? customScriptContent : scriptContent

  const stripMentionsFromAllScripts = useCallback((labels: string[]) => {
    const strip = (text: string) => stripMentionTokens(text, labels)
    setScriptContent((prev) => strip(prev))
    setCustomScriptContent((prev) => strip(prev))
    setScripts((prev) =>
      prev.map((item) => ({ ...item, content: strip(item.content) }))
    )
  }, [])

  const remapMentionsInAllScripts = useCallback(
    (renames: MentionLabelRename[]) => {
      if (renames.length === 0) return
      const apply = (text: string) => remapMentionTokens(text, renames)
      setScriptContent((prev) => {
        const next = apply(prev)
        return next === prev ? prev : next
      })
      setCustomScriptContent((prev) => {
        const next = apply(prev)
        return next === prev ? prev : next
      })
      setScripts((prev) => {
        let changed = false
        const next = prev.map((item) => {
          const content = apply(item.content)
          if (content !== item.content) changed = true
          return content === item.content ? item : { ...item, content }
        })
        return changed ? next : prev
      })
    },
    []
  )

  const { mentionableAssets, promptResolveAssets } = useMentionableAssets({
    materials,
    referenceVideos,
    config,
    selectedHuman,
  })

  const { scriptGenerating, handleGenerateScripts } = useScriptGeneration({
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
  })

  const handleSelectScriptTab = (tabId: string) => {
    setSelectedScriptTab(tabId)
    if (tabId === 'custom') {
      setActiveScriptMode('custom')
    } else {
      setActiveScriptMode('ai')
      const matched = scripts.find((script) => script.id === tabId)
      if (matched) setScriptContent(matched.content)
    }
    setPromptFocused(true)
    queueMicrotask(() => promptFieldRef.current?.focus())
  }

  const scriptTabs = useMemo(
    () =>
      [{ id: 'custom', title: '自定义' }, ...scripts] as Array<{
        id: string
        title: string
      }>,
    [scripts]
  )

  const promptValue =
    activeScriptMode === 'custom' ? customScriptContent : scriptContent

  const handleSetPromptValue = (value: string) => {
    if (activeScriptMode === 'custom') {
      setCustomScriptContent(value)
      return
    }
    setScriptContent(value)
    setScripts((prev) =>
      prev.map((item) =>
        item.id === selectedScriptTab ? { ...item, content: value } : item
      )
    )
  }

  const handleInsertMentionImage = (image: MentionAsset) => {
    setPromptFocused(true)
    queueMicrotask(() => {
      const field = promptFieldRef.current
      if (field) {
        field.focus()
        field.insertMention(image)
        return
      }
      const label = image.name || '图1'
      const token = `@${label}`
      handleSetPromptValue(
        promptValue
          ? `${promptValue}${/\s$/.test(promptValue) ? '' : ' '}${token} `
          : `${token} `
      )
    })
  }

  const handleClearDigitalHuman = () => {
    const imageCount = materials.filter(
      (item) => item.type === 'image' && !item.uploading
    ).length
    const label = `图${imageCount + 1}`
    stripMentionsFromAllScripts(mentionLabelsForAsset(label, 'image'))
    setSelectedHuman(null)
  }

  const handleApplyInitialHuman = useCallback((human: DigitalHuman) => {
    setSelectedHuman(human)
  }, [])

  return {
    selectedHuman,
    setSelectedHuman,
    activeScriptMode,
    setActiveScriptMode,
    scriptContent,
    setScriptContent,
    customScriptContent,
    setCustomScriptContent,
    scripts,
    setScripts,
    scriptSummary,
    setScriptSummary,
    autoGenerateScripts,
    setAutoGenerateScripts,
    scriptGenerating,
    selectedScriptTab,
    setSelectedScriptTab,
    humanPickerOpen,
    setHumanPickerOpen,
    promptFocused,
    setPromptFocused,
    promptFieldRef,
    activeScriptContent,
    stripMentionsFromAllScripts,
    remapMentionsInAllScripts,
    mentionableAssets,
    promptResolveAssets,
    handleGenerateScripts,
    handleSelectScriptTab,
    scriptTabs,
    promptValue,
    handleSetPromptValue,
    handleInsertMentionImage,
    handleClearDigitalHuman,
    handleApplyInitialHuman,
  }
}
