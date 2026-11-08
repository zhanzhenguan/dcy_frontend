import type { CreateVideoGenerationInput } from '@/services/api/videoApi'
import type { DigitalHuman } from '../../DigiHumaPick'
import type { VideoConfigState } from '../../VideConfPane'
import type { ReferenceImage, ReferenceVideo } from '../types'
import { toMediaContent } from './media'

type BuildSeedanceRequestParams = {
  projectTitle: string
  draftId: string
  draftData?: string
  config: VideoConfigState
  referenceMode: 'all' | 'frames'
  firstFrame: string | null
  lastFrame: string | null
  materials: ReferenceImage[]
  referenceVideos: ReferenceVideo[]
  selectedHuman: DigitalHuman | null
  selectedBackgroundMusic?: { url: string }
  promptContent: string
  useDigitalHumanAssetId?: boolean
  videoDraftID?: string
}

export const buildSeedanceRequest = ({
  projectTitle,
  draftId: _draftId,
  draftData,
  config,
  referenceMode,
  firstFrame,
  lastFrame,
  materials,
  referenceVideos,
  selectedHuman,
  selectedBackgroundMusic,
  promptContent,
  useDigitalHumanAssetId = false,
  videoDraftID: _videoDraftID,
}: BuildSeedanceRequestParams): CreateVideoGenerationInput => ({
  title: projectTitle,
  // 生成链路不再挂 draft_id；向导快照只写入任务 draft_data
  draft_data: draftData || undefined,
  language: config.language || undefined,
  platform: config.platforms[0] || undefined,
  ratio: config.ratio,
  duration: config.duration,
  resolution: config.resolution,
  generate_audio: config.bgm !== 'bgm-none',
  content: [
    {
      type: 'text',
      text: `${promptContent}${selectedHuman ? `\n出镜数字人：${selectedHuman.name}，风格：${selectedHuman.tags.join('、')}` : ''}`,
    },
    ...(referenceMode === 'frames'
      ? [
          ...(firstFrame
            ? [
                toMediaContent({
                  type: 'image_url',
                  url: firstFrame,
                  role: 'first_frame',
                }),
              ]
            : []),
          ...(lastFrame
            ? [
                toMediaContent({
                  type: 'image_url',
                  url: lastFrame,
                  role: 'last_frame',
                }),
              ]
            : []),
        ]
      : materials
          .filter((item) => !item.uploading)
          .map((item) =>
            toMediaContent({
              type: 'image_url',
              url: item.url,
              file_key: item.file_key,
              assetId: item.assetId,
              role: 'reference_image',
            })
          )),
    ...(selectedHuman?.avatarUrl ||
    (useDigitalHumanAssetId &&
      selectedHuman?.source === 'seedance' &&
      selectedHuman?.assetId)
      ? [
          toMediaContent({
            type: 'image_url',
            url:
              useDigitalHumanAssetId &&
              selectedHuman.source === 'seedance' &&
              selectedHuman.assetId
                ? `asset://${selectedHuman.assetId}`
                : selectedHuman.avatarUrl!,
            role: 'reference_image',
          }),
        ]
      : []),
    ...referenceVideos
      .filter((video) => !video.uploading)
      .map((video) =>
        toMediaContent({
          type: 'video_url',
          url: video.url,
          file_key: video.file_key,
          assetId: video.assetId,
          role: 'reference_video',
        })
      ),
    ...(config.customBgmFile
      ? [
          toMediaContent({
            type: 'audio_url',
            url: config.customBgmFile.url,
            role: 'reference_audio',
          }),
        ]
      : []),
    ...(selectedBackgroundMusic && config.bgmType === 'preset'
      ? [
          toMediaContent({
            type: 'audio_url',
            url: selectedBackgroundMusic.url,
            role: 'reference_audio',
          }),
        ]
      : []),
  ],
})
