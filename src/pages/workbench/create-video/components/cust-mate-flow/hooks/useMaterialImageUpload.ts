import { toast } from 'sonner'
import type { Asset } from '@/services/api/assetLibraryApi'
import {
  uploadCreativeAsset,
  type CreativeAsset,
} from '@/services/api/creativeApi'
import { compressImageFile } from '@/utils/imageCompress'
import { createId } from '@/utils/utils'
import { RECENT_CREATIVE_ASSETS_QUERY_KEY } from '../constants'
import {
  allocateReferenceImageNames,
  formatLimit,
  prependRecentCreativeAssets,
  revokeBlobUrl,
} from '../utils/index'
import type { MaterialUploadDeps } from './materialUploadTypes'

export const useMaterialImageUpload = ({
  getLimits,
  queryClient,
  materials,
  setMaterials,
  setFirstFrame,
  setLastFrame,
  setUploading,
  materialsStackRef,
}: MaterialUploadDeps) => {
  const uploadImageFiles = async (imageFiles: File[]) => {
    const { maxReferenceImagesLimit, imageMaxSizeBytes, imageMaxSizeMb } =
      getLimits()
    if (imageFiles.length === 0) return

    if (materials.length + imageFiles.length > maxReferenceImagesLimit) {
      toast.error(
        `产品图片最多上传 ${formatLimit(maxReferenceImagesLimit)} 张`
      )
      return
    }
    const oversized = imageFiles.find((file) => file.size > imageMaxSizeBytes)
    if (oversized) {
      toast.error(
        `单张图片不能超过 ${formatLimit(imageMaxSizeMb, 'MB')}`
      )
      return
    }

    const pendingImageIds: string[] = []
    const names = allocateReferenceImageNames(materials, imageFiles.length)
    const pendingItems = imageFiles.map((file, index) => {
      const id = createId()
      pendingImageIds.push(id)
      return {
        id,
        url: URL.createObjectURL(file),
        type: 'image' as const,
        name: names[index],
        uploading: true,
      }
    })
    setMaterials((prev) => [...prev, ...pendingItems])
    materialsStackRef.current?.expandMaterials()

    try {
      const compressedFiles = await Promise.all(
        imageFiles.map((file) => compressImageFile(file))
      )
      const assets = await Promise.all(
        compressedFiles.map(uploadCreativeAsset)
      )
      const uploadedById = new Map(
        pendingItems.map((item, index) => [
          item.id,
          {
            url: assets[index].url,
            file_key: assets[index].file_key || undefined,
            previewUrl: item.url,
          },
        ])
      )
      setMaterials((prev) =>
        prev.map((item) => {
          const uploaded = uploadedById.get(item.id)
          if (!uploaded) return item
          revokeBlobUrl(uploaded.previewUrl)
          return {
            ...item,
            url: uploaded.url,
            file_key: uploaded.file_key,
            uploading: false,
          }
        })
      )
      queryClient.setQueryData<CreativeAsset[]>(
        RECENT_CREATIVE_ASSETS_QUERY_KEY,
        (prev) => prependRecentCreativeAssets(prev, assets)
      )
      toast.success(`成功上传 ${assets.length} 张产品图片`)
    } catch (error) {
      setMaterials((prev) =>
        prev.filter((item) => {
          if (!pendingImageIds.includes(item.id)) return true
          revokeBlobUrl(item.url)
          return false
        })
      )
      throw error
    }
  }

  const handleSelectRecentImage = async (asset: CreativeAsset) => {
    const { maxReferenceImagesLimit, imageMaxSizeBytes, imageMaxSizeMb } =
      getLimits()
    if (!asset.url) {
      toast.error('素材无效')
      return
    }
    const recentKey = asset.file_key || asset.url.split('?')[0]
    if (materials.length >= maxReferenceImagesLimit) {
      toast.error(
        `产品图片最多上传 ${formatLimit(maxReferenceImagesLimit)} 张`
      )
      return
    }
    if (
      Number.isFinite(imageMaxSizeBytes) &&
      asset.size > imageMaxSizeBytes
    ) {
      toast.error(
        `单张图片不能超过 ${formatLimit(imageMaxSizeMb, 'MB')}`
      )
      return
    }
    if (
      materials.some((item) => {
        const key = item.file_key || item.url.split('?')[0]
        return key === recentKey || item.url === asset.url
      })
    ) {
      toast.error('该素材已在当前项目中')
      return
    }

    setMaterials((prev) => [
      ...prev,
      {
        id: createId(),
        url: asset.url,
        type: 'image' as const,
        name: allocateReferenceImageNames(prev, 1)[0],
        file_key: asset.file_key || undefined,
      },
    ])
    toast.success('已加入参考内容')
  }

  const handleSelectLibraryAssets = (assets: Asset[]) => {
    const { maxReferenceImagesLimit, imageMaxSizeBytes, imageMaxSizeMb } =
      getLimits()
    const images = assets.filter((asset) => asset.asset_type === 'image')
    const existingIds = new Set(
      materials.map((item) => item.assetId).filter(Boolean)
    )
    const existingUrls = new Set(
      materials.map((item) => item.url.split('?')[0]).filter(Boolean)
    )
    const available = images.filter((asset) => {
      if (existingIds.has(asset.id)) return false
      const urlKey = asset.preview_url.split('?')[0]
      if (urlKey && existingUrls.has(urlKey)) return false
      return true
    })
    const remaining = maxReferenceImagesLimit - materials.length
    if (available.length === 0) {
      toast.error('该素材已在当前项目中')
      return
    }
    if (remaining <= 0) {
      toast.error(
        `产品图片最多上传 ${formatLimit(maxReferenceImagesLimit)} 张`
      )
      return
    }
    const oversized = available.find(
      (asset) =>
        Number.isFinite(imageMaxSizeBytes) &&
        asset.file_size > imageMaxSizeBytes
    )
    if (oversized) {
      toast.error(
        `单张图片不能超过 ${formatLimit(imageMaxSizeMb, 'MB')}`
      )
      return
    }
    const selected = available.slice(0, remaining)
    const names = allocateReferenceImageNames(materials, selected.length)
    const next = selected.map((asset, index) => ({
      id: asset.id,
      assetId: asset.id,
      url: asset.preview_url,
      type: 'image' as const,
      name: names[index],
    }))
    setMaterials((current) => [...current, ...next])
    if (available.length > remaining)
      toast.message(
        `产品图片最多保留 ${formatLimit(maxReferenceImagesLimit)} 张`
      )
    toast.success(
      selected.length === 1
        ? '已加入参考内容'
        : `已加入 ${selected.length} 个素材空间图片`
    )
  }

  const handleFirstFrameUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const asset = await uploadCreativeAsset(files[0])
      setFirstFrame(asset.url)
      toast.success('首帧画面已上传')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '首帧上传失败')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleLastFrameUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const asset = await uploadCreativeAsset(files[0])
      setLastFrame(asset.url)
      toast.success('尾帧画面已上传')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '尾帧上传失败')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return {
    uploadImageFiles,
    handleSelectRecentImage,
    handleSelectLibraryAssets,
    handleFirstFrameUpload,
    handleLastFrameUpload,
  }
}
