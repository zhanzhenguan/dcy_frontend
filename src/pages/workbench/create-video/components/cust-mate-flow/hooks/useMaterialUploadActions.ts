import { toast } from 'sonner'
import type { CreativeAsset } from '@/services/api/creativeApi'
import { isImageFile, isSupportedReferenceVideo, isSupportedReferenceVideoAsset } from '../utils/index'
import type { MaterialUploadDeps } from './materialUploadTypes'
import { useMaterialImageUpload } from './useMaterialImageUpload'
import { useMaterialVideoUpload } from './useMaterialVideoUpload'

export const useMaterialUploadActions = (deps: MaterialUploadDeps) => {
  const videoUpload = useMaterialVideoUpload(deps)
  const imageUpload = useMaterialImageUpload(deps)

  const handleMaterialUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const imageFiles = files.filter(isImageFile)
    const videoFiles = files.filter(isSupportedReferenceVideo)
    const unsupported = files.filter(
      (file) => !isImageFile(file) && !isSupportedReferenceVideo(file)
    )
    if (unsupported.length > 0) {
      toast.error('参考内容仅支持图片，以及 MP4/MOV 参考视频')
    }
    if (imageFiles.length === 0 && videoFiles.length === 0) {
      e.target.value = ''
      return
    }

    deps.setUploading(true)
    try {
      if (imageFiles.length > 0) {
        await imageUpload.uploadImageFiles(imageFiles)
      }
      if (videoFiles.length > 0) {
        await videoUpload.uploadReferenceVideoFiles(videoFiles)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '参考内容上传失败')
    } finally {
      deps.setUploading(false)
      e.target.value = ''
    }
  }

  const handleSelectRecentCreativeAsset = async (asset: CreativeAsset) => {
    const isVideo =
      asset.media_type === 'video' || isSupportedReferenceVideoAsset(asset)
    const isImage =
      asset.media_type === 'image' ||
      asset.media_type === '' ||
      (asset.content_type ?? '').startsWith('image/')

    if (isVideo) {
      await videoUpload.handleSelectRecentVideo(asset)
      return
    }
    if (!isImage) {
      toast.error('仅支持选择图片或 MP4/MOV 参考视频')
      return
    }
    await imageUpload.handleSelectRecentImage(asset)
  }

  const handleSelectLibraryAssets = async (
    assets: import('@/services/api/assetLibraryApi').Asset[]
  ) => {
    const images = assets.filter((asset) => asset.asset_type === 'image')
    const videos = assets.filter((asset) => asset.asset_type === 'video')
    if (images.length > 0) {
      imageUpload.handleSelectLibraryAssets(images)
    }
    for (const video of videos) {
      await videoUpload.handleSelectRecentVideo({
        url: video.preview_url,
        name: video.name,
        content_type: video.mime_type || 'video/mp4',
        media_type: 'video',
        size: video.file_size,
      })
    }
  }

  return {
    handleMaterialUpload,
    handleSelectRecentCreativeAsset,
    handleSelectLibraryAssets,
    handleFirstFrameUpload: imageUpload.handleFirstFrameUpload,
    handleLastFrameUpload: imageUpload.handleLastFrameUpload,
  }
}
