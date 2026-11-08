import { toast } from 'sonner'
import { deleteCreativeAsset } from '@/services/api/creativeApi'
import type { CreativeMediaPreviewTarget } from '../../CreativeMediaPreview'
import type { ReferenceImage, ReferenceVideo } from '../types'
import {
  isBlobUrl,
  mentionLabelsForAsset,
  revokeBlobUrl,
} from '../utils/index'

type UseMaterialRemoveActionsParams = {
  referenceVideos: ReferenceVideo[]
  setReferenceVideos: React.Dispatch<React.SetStateAction<ReferenceVideo[]>>
  materials: ReferenceImage[]
  setMaterials: React.Dispatch<React.SetStateAction<ReferenceImage[]>>
  firstFrame: string | null
  lastFrame: string | null
  setFirstFrame: React.Dispatch<React.SetStateAction<string | null>>
  setLastFrame: React.Dispatch<React.SetStateAction<string | null>>
  setActivePreviewIndex: React.Dispatch<React.SetStateAction<number>>
  setMaterialPreview: React.Dispatch<
    React.SetStateAction<CreativeMediaPreviewTarget | null>
  >
  onStripMentionLabels: (labels: string[]) => void
}

export const useMaterialRemoveActions = ({
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
}: UseMaterialRemoveActionsParams) => {
  const deleteUnreferencedAssets = async (
    removingURLs: Array<string | null | undefined>,
    retainedURLs: Array<string | null | undefined>
  ) => {
    const retained = new Set(
      retainedURLs.filter((url): url is string => Boolean(url))
    )
    const urls = Array.from(
      new Set(removingURLs.filter((url): url is string => Boolean(url)))
    ).filter((url) => !retained.has(url))
    try {
      await Promise.all(urls.map(deleteCreativeAsset))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '远端素材删除失败')
      throw error
    }
  }

  const handleRemoveReferenceVideo = async (id: string) => {
    const index = referenceVideos.findIndex((item) => item.id === id)
    const video = index >= 0 ? referenceVideos[index] : undefined
    if (!video) return
    const label = /^视频\d+$/.test(video.name.trim())
      ? video.name.trim()
      : `视频${index + 1}`

    const finishLocalRemove = () => {
      revokeBlobUrl(video.url)
      setReferenceVideos((previous) =>
        previous.filter((item) => item.id !== id)
      )
      onStripMentionLabels(mentionLabelsForAsset(label, 'video'))
    }

    if (video.uploading || isBlobUrl(video.url)) {
      finishLocalRemove()
      return
    }

    try {
      await deleteUnreferencedAssets(
        [video.url, ...video.frameUrls],
        [
          ...referenceVideos
            .filter((item) => item.id !== id)
            .flatMap((item) => [item.url, ...item.frameUrls]),
          ...materials.map((item) => item.url),
          firstFrame,
          lastFrame,
        ]
      )
      finishLocalRemove()
    } catch {
      /* 删除失败时保留当前素材状态。 */
    }
  }

  const handleRemoveMaterial = (id: string) => {
    const index = materials.findIndex((item) => item.id === id)
    if (index < 0) return
    const material = materials[index]
    const label = /^图\d+$/.test(material.name.trim())
      ? material.name.trim()
      : `图${
          materials
            .filter((item) => item.type === 'image')
            .findIndex((item) => item.id === id) + 1
        }`

    revokeBlobUrl(material.url)
    setMaterials((prev) => prev.filter((item) => item.id !== id))
    onStripMentionLabels(mentionLabelsForAsset(label, 'image'))
    setActivePreviewIndex(0)
  }

  const handleSwapFrames = () => {
    setFirstFrame(lastFrame)
    setLastFrame(firstFrame)
  }

  const handleDeleteFirstFrame = async () => {
    if (!firstFrame) return
    try {
      await deleteUnreferencedAssets(
        [firstFrame],
        [
          ...materials.map((item) => item.url),
          lastFrame,
          ...referenceVideos.flatMap((video) => [
            video.url,
            ...video.frameUrls,
          ]),
        ]
      )
      setFirstFrame(null)
    } catch {
      /* empty */
    }
  }

  const handleDeleteLastFrame = async () => {
    if (!lastFrame) return
    try {
      await deleteUnreferencedAssets(
        [lastFrame],
        [
          ...materials.map((item) => item.url),
          firstFrame,
          ...referenceVideos.flatMap((video) => [
            video.url,
            ...video.frameUrls,
          ]),
        ]
      )
      setLastFrame(null)
    } catch {
      /* empty */
    }
  }

  const handleReplaceCreativeAssetUrl = (previousUrl: string, nextUrl: string) => {
    if (!previousUrl || !nextUrl || previousUrl === nextUrl) return
    setMaterials((previous) =>
      previous.map((item) =>
        item.url === previousUrl ? { ...item, url: nextUrl } : item
      )
    )
    setFirstFrame((value) => (value === previousUrl ? nextUrl : value))
    setLastFrame((value) => (value === previousUrl ? nextUrl : value))
    setReferenceVideos((previous) =>
      previous.map((video) => ({
        ...video,
        url: video.url === previousUrl ? nextUrl : video.url,
        frameUrls: video.frameUrls.map((frame) =>
          frame === previousUrl ? nextUrl : frame
        ),
      }))
    )
    setMaterialPreview((value) =>
      value?.url === previousUrl ? { ...value, url: nextUrl } : value
    )
  }

  return {
    deleteUnreferencedAssets,
    handleRemoveReferenceVideo,
    handleRemoveMaterial,
    handleSwapFrames,
    handleDeleteFirstFrame,
    handleDeleteLastFrame,
    handleReplaceCreativeAssetUrl,
  }
}
