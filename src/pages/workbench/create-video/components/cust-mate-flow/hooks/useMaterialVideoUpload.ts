import { toast } from 'sonner'
import {
  uploadCreativeAsset,
  type CreativeAsset,
} from '@/services/api/creativeApi'
import { createId } from '@/utils/utils'
import { RECENT_CREATIVE_ASSETS_QUERY_KEY } from '../constants'
import {
  formatLimit,
  inspectRemoteReferenceVideo,
  inspectVideo,
  isSupportedReferenceVideo,
  isSupportedReferenceVideoAsset,
  prependRecentCreativeAssets,
  revokeBlobUrl,
} from '../utils/index'
import type { MaterialUploadDeps } from './materialUploadTypes'

export const useMaterialVideoUpload = ({
  getLimits,
  queryClient,
  referenceVideos,
  setReferenceVideos,
  setUploading,
  materialsStackRef,
}: MaterialUploadDeps) => {
  const uploadReferenceVideoFiles = async (selectedFiles: File[]) => {
    const { maxReferenceVideosLimit } = getLimits()
    if (selectedFiles.length === 0) return
    if (referenceVideos.length + selectedFiles.length > maxReferenceVideosLimit) {
      throw new Error(
        `参考视频最多上传 ${formatLimit(maxReferenceVideosLimit)} 个`
      )
    }
    if (!selectedFiles.every(isSupportedReferenceVideo)) {
      throw new Error('参考视频仅支持 MP4/MOV')
    }
    const inspections = await Promise.all(selectedFiles.map(inspectVideo))

    const pendingItems = selectedFiles.map((file, index) => {
      const inspection = inspections[index]
      return {
        id: createId(),
        name: file.name || `视频${referenceVideos.length + index + 1}`,
        url: URL.createObjectURL(file),
        size: file.size,
        duration: inspection.duration,
        frameUrls: [] as string[],
        uploading: true,
        file,
      }
    })
    const pendingIds = pendingItems.map((item) => item.id)
    setReferenceVideos((previous) => [
      ...previous,
      ...pendingItems.map(({ file: _file, ...video }) => video),
    ])
    materialsStackRef.current?.expandMaterials()

    try {
      const videos = await Promise.all(
        pendingItems.map(async (item) => {
          const asset = await uploadCreativeAsset(item.file)
          return {
            id: item.id,
            previewUrl: item.url,
            name: asset.name,
            url: asset.url,
            size: asset.size,
            duration: item.duration,
            frameUrls: [] as string[],
            file_key: asset.file_key || undefined,
            asset,
          }
        })
      )
      const uploadedById = new Map(videos.map((video) => [video.id, video]))
      setReferenceVideos((previous) =>
        previous.map((item) => {
          const uploaded = uploadedById.get(item.id)
          if (!uploaded) return item
          revokeBlobUrl(uploaded.previewUrl)
          return {
            id: uploaded.id,
            name: uploaded.name,
            url: uploaded.url,
            size: uploaded.size,
            duration: uploaded.duration,
            frameUrls: uploaded.frameUrls,
            file_key: uploaded.file_key,
            uploading: false,
          }
        })
      )
      queryClient.setQueryData<CreativeAsset[]>(
        RECENT_CREATIVE_ASSETS_QUERY_KEY,
        (prev) =>
          prependRecentCreativeAssets(
            prev,
            videos.map((item) => item.asset)
          )
      )
      toast.success(`成功上传 ${videos.length} 个参考视频`)
    } catch (error) {
      setReferenceVideos((previous) =>
        previous.filter((item) => {
          if (!pendingIds.includes(item.id)) return true
          revokeBlobUrl(item.url)
          return false
        })
      )
      throw error
    }
  }

  const handleSelectRecentVideo = async (asset: CreativeAsset) => {
    const { maxReferenceVideosLimit } = getLimits()
    if (!asset.url) {
      toast.error('素材无效')
      return
    }
    if (!isSupportedReferenceVideoAsset(asset)) {
      toast.error('参考视频仅支持 MP4/MOV')
      return
    }
    const recentKey = asset.file_key || asset.url.split('?')[0]
    if (referenceVideos.length >= maxReferenceVideosLimit) {
      toast.error(
        `参考视频最多上传 ${formatLimit(maxReferenceVideosLimit)} 个`
      )
      return
    }
    if (
      referenceVideos.some((item) => {
        const key = item.file_key || item.url.split('?')[0]
        return key === recentKey || item.url === asset.url
      })
    ) {
      toast.error('该素材已在当前项目中')
      return
    }

    setUploading(true)
    try {
      const inspection = await inspectRemoteReferenceVideo(asset.url, {
        fileKey: asset.file_key,
        knownSize: asset.size,
      })

      if (inspection.url !== asset.url) {
        queryClient.setQueryData<CreativeAsset[]>(
          RECENT_CREATIVE_ASSETS_QUERY_KEY,
          (previous) =>
            (previous ?? []).map((item) =>
              item.url === asset.url ||
              (asset.file_key && item.file_key === asset.file_key)
                ? { ...item, url: inspection.url }
                : item
            )
        )
      }

      setReferenceVideos((previous) => [
        ...previous,
        {
          id: createId(),
          name: asset.name,
          url: inspection.url,
          size: inspection.size || asset.size || 0,
          duration: inspection.duration,
          frameUrls: [],
          file_key: asset.file_key || undefined,
        },
      ])
      toast.success('已加入参考视频')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加入参考视频失败')
    } finally {
      setUploading(false)
    }
  }

  return {
    uploadReferenceVideoFiles,
    handleSelectRecentVideo,
  }
}
