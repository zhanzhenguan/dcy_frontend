import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { estimateVideoGeneration } from '@/services/api/videoApi'
import type { VideoConfigState } from '../../VideConfPane'
import type { ReferenceImage, ReferenceVideo } from '../types'
import { toMediaContent } from '../utils/index'

type UseVideoEstimateParams = {
  config: VideoConfigState
  materials: ReferenceImage[]
  referenceVideos: ReferenceVideo[]
  hasPendingUploads: boolean
}

export const useVideoEstimate = ({
  config,
  materials,
  referenceVideos,
  hasPendingUploads,
}: UseVideoEstimateParams) => {
  const readyMaterials = materials.filter((item) => !item.uploading)
  const readyReferenceVideos = referenceVideos.filter(
    (video) => !video.uploading
  )
  const hasReadyReferenceVideo = readyReferenceVideos.length > 0
  const readyReferenceVideoDuration = hasReadyReferenceVideo
    ? Math.ceil(
        readyReferenceVideos.reduce((total, video) => total + video.duration, 0)
      )
    : undefined

  const estimateQuery = useQuery({
    queryKey: [
      'custom-video-estimate',
      config.provider,
      config.resolution,
      config.duration,
      hasReadyReferenceVideo,
      readyReferenceVideoDuration,
      readyReferenceVideos
        .map((video) => video.file_key || video.assetId || video.url)
        .join('|'),
      readyMaterials
        .map((item) => item.file_key || item.assetId || item.url)
        .join('|'),
    ],
    queryFn: () =>
      estimateVideoGeneration({
        provider: config.provider,
        resolution: config.resolution,
        duration: config.duration,
        ratio: config.ratio,
        content: [
          ...readyMaterials.map((item) =>
            toMediaContent({
              type: 'image_url',
              url: item.url,
              file_key: item.file_key,
              assetId: item.assetId,
              role: 'reference_image',
            })
          ),
          ...readyReferenceVideos.map((video) =>
            toMediaContent({
              type: 'video_url',
              url: video.url,
              file_key: video.file_key,
              assetId: video.assetId,
              role: 'reference_video',
            })
          ),
        ],
      }),
    enabled: Boolean(
      config.provider &&
        config.resolution &&
        config.duration &&
        !hasPendingUploads
    ),
    retry: false,
  })

  useEffect(() => {
    if (!estimateQuery.isError) return
    toast.error(
      estimateQuery.error instanceof Error
        ? estimateQuery.error.message
        : '积分预估失败，请稍后重试'
    )
  }, [estimateQuery.isError, estimateQuery.error])

  const estimatedCredits = estimateQuery.data?.estimated_credits ?? 0

  return {
    estimateQuery,
    estimatedCredits,
  }
}
