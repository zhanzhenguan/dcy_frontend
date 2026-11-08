import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { CreativeMediaPreviewTarget } from '../../CreativeMediaPreview'
import type { ReferenceMaterialsStackHandle } from '../components/ReferenceMaterialsStack'
import type { ReferenceImage, ReferenceVideo } from '../types'
import { getInitialReferenceVideos, moveListItem, planMaterialsAlignToMentionOrder, renumberReferenceNames } from '../utils/index'
import type { MentionLabelRename } from '../utils/index'
import { useMaterialRemoveActions } from './useMaterialRemoveActions'
import { useMaterialUploadActions } from './useMaterialUploadActions'

type UseCustMateMaterialsParams = {
  initialData: {
    referenceMode?: 'all' | 'frames'
    firstFrame?: string | null
    lastFrame?: string | null
    activeSuppTab?: 'video' | 'selling'
    sellingPoints?: string
    referenceVideos?: ReferenceVideo[]
    materials?: ReferenceImage[]
    activePreviewIndex?: number
  }
  getLimits: () => {
    imageMaxSizeBytes: number
    imageMaxSizeMb: number
    maxReferenceImagesLimit: number
    maxReferenceVideosLimit: number
  }
  onStripMentionLabels: (labels: string[]) => void
  onRemapMentionLabels: (renames: MentionLabelRename[]) => void
}

export const useCustMateMaterials = ({
  initialData,
  getLimits,
  onStripMentionLabels,
  onRemapMentionLabels,
}: UseCustMateMaterialsParams) => {
  const queryClient = useQueryClient()

  const [referenceMode, setReferenceMode] = useState<'all' | 'frames'>(
    initialData.referenceMode ?? 'all'
  )
  const [firstFrame, setFirstFrame] = useState<string | null>(
    initialData.firstFrame ?? null
  )
  const [lastFrame, setLastFrame] = useState<string | null>(
    initialData.lastFrame ?? null
  )
  const [activeSuppTab] = useState<'video' | 'selling'>(
    initialData.activeSuppTab ?? 'video'
  )
  const [sellingPoints, setSellingPoints] = useState(
    initialData.sellingPoints ?? ''
  )
  const [referenceVideos, setReferenceVideos] = useState<ReferenceVideo[]>(() =>
    getInitialReferenceVideos(initialData)
  )
  const [materials, setMaterials] = useState<ReferenceImage[]>(
    initialData.materials ?? []
  )
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(
    initialData.activePreviewIndex ?? 0
  )
  const [uploading, setUploading] = useState(false)
  const [materialPreview, setMaterialPreview] =
    useState<CreativeMediaPreviewTarget | null>(null)

  const materialUploadInputRef = useRef<HTMLInputElement>(null)
  const materialsStackRef = useRef<ReferenceMaterialsStackHandle>(null)

  const hasPendingUploads =
    uploading ||
    materials.some((item) => item.uploading) ||
    referenceVideos.some((item) => item.uploading)

  const uploadActions = useMaterialUploadActions({
    getLimits,
    queryClient,
    referenceVideos,
    setReferenceVideos,
    materials,
    setMaterials,
    setFirstFrame,
    setLastFrame,
    setUploading,
    materialsStackRef,
  })

  const removeActions = useMaterialRemoveActions({
    referenceVideos,
    setReferenceVideos,
    materials,
    setMaterials,
    firstFrame,
    lastFrame,
    setFirstFrame,
    setLastFrame,
    setActivePreviewIndex,
    setMaterialPreview,
    onStripMentionLabels,
  })

  const handleReorderMaterials = (fromIndex: number, toIndex: number) => {
    const moved = moveListItem(materials, fromIndex, toIndex)
    if (moved === materials) return
    const { items, renames } = renumberReferenceNames(moved, 'image')
    setMaterials(items)
    onRemapMentionLabels(renames)
  }

  const handleReorderReferenceVideos = (fromIndex: number, toIndex: number) => {
    const moved = moveListItem(referenceVideos, fromIndex, toIndex)
    if (moved === referenceVideos) return
    const { items, renames } = renumberReferenceNames(moved, 'video')
    setReferenceVideos(items)
    onRemapMentionLabels(renames)
  }

  /** 按提示词 @图N 首次出现顺序对齐参考图；返回重命名映射供同步文案 */
  const alignMaterialsToImageMentionOrder = (mentionOrder: number[]) => {
    const plan = planMaterialsAlignToMentionOrder(materials, mentionOrder)
    if (!plan) return [] as MentionLabelRename[]
    setMaterials(plan.items)
    return plan.renames
  }

  return {
    referenceMode,
    setReferenceMode,
    firstFrame,
    setFirstFrame,
    lastFrame,
    setLastFrame,
    activeSuppTab,
    sellingPoints,
    setSellingPoints,
    referenceVideos,
    setReferenceVideos,
    materials,
    setMaterials,
    activePreviewIndex,
    setActivePreviewIndex,
    uploading,
    hasPendingUploads,
    materialPreview,
    setMaterialPreview,
    materialUploadInputRef,
    materialsStackRef,
    handleReorderMaterials,
    handleReorderReferenceVideos,
    alignMaterialsToImageMentionOrder,
    ...removeActions,
    ...uploadActions,
  }
}
