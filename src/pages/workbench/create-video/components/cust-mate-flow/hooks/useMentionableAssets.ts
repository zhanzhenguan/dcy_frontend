import { useMemo } from 'react'
import type { DigitalHuman } from '../../DigiHumaPick'
import type { VideoConfigState } from '../../VideConfPane'
import type { ReferenceImage, ReferenceVideo } from '../types'

type UseMentionableAssetsParams = {
  materials: ReferenceImage[]
  referenceVideos: ReferenceVideo[]
  config: VideoConfigState
  selectedHuman: DigitalHuman | null
}

export const useMentionableAssets = ({
  materials,
  referenceVideos,
  config,
  selectedHuman,
}: UseMentionableAssetsParams) => {
  const mentionableAssets = useMemo(() => {
    const images = materials
      .filter((item) => item.type === 'image' && !item.uploading)
      .map((item, index) => ({
        id: item.id,
        url: item.url,
        kind: 'image' as const,
        name: /^图\d+$/.test(item.name.trim())
          ? item.name.trim()
          : `图${index + 1}`,
      }))

    const videos = referenceVideos
      .filter((video) => !video.uploading)
      .map((video, index) => ({
        id: video.id,
        url: video.url,
        kind: 'video' as const,
        name: /^视频\d+$/.test(video.name.trim())
          ? video.name.trim()
          : `视频${index + 1}`,
        posterUrl: video.frameUrls[0],
        duration: video.duration,
      }))

    const audios = config.customBgmFile
      ? [
          {
            id: 'custom-bgm',
            url: config.customBgmFile.url,
            kind: 'audio' as const,
            name: '音频1',
          },
        ]
      : []

    return [...images, ...videos, ...audios]
  }, [materials, referenceVideos, config.customBgmFile])

  const promptResolveAssets = useMemo(() => {
    if (!selectedHuman?.avatarUrl) return mentionableAssets

    const imageCount = mentionableAssets.filter(
      (item) => item.kind === 'image'
    ).length
    const humanAsset = {
      id: `digital-human-${selectedHuman.id}`,
      url: selectedHuman.avatarUrl,
      kind: 'image' as const,
      name: `图${imageCount + 1}`,
    }
    const images = mentionableAssets.filter((item) => item.kind === 'image')
    const rest = mentionableAssets.filter((item) => item.kind !== 'image')
    return [...images, humanAsset, ...rest]
  }, [mentionableAssets, selectedHuman])

  return {
    mentionableAssets,
    promptResolveAssets,
  }
}
