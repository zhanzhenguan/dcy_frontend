import {
  type CreativeAsset,
} from '@/services/api/creativeApi'
import { requestCreativeUrlPresign } from '@/services/api/creativePresign'
import type { VideoGenerationContent } from '@/services/api/videoApi'

export function isBlobUrl(url: string) {
  return url.startsWith('blob:')
}

export function revokeBlobUrl(url: string | null | undefined) {
  if (url && isBlobUrl(url)) {
    URL.revokeObjectURL(url)
  }
}

/** 组装提交给后端的媒体 content 项：优先 file_key / asset_id，本地 id 绝不作为 asset_id */
export function toMediaContent(input: {
  type: 'image_url' | 'video_url' | 'audio_url'
  url?: string | null
  file_key?: string | null
  assetId?: string | null
  role:
    | 'first_frame'
    | 'last_frame'
    | 'reference_image'
    | 'reference_video'
    | 'reference_audio'
}): VideoGenerationContent {
  const content: VideoGenerationContent = {
    type: input.type,
    role: input.role,
  }
  const fileKey = input.file_key?.trim()
  const assetId = input.assetId?.trim()
  const url = input.url?.trim()
  if (fileKey) {
    content.file_key = fileKey
    if (url) content.url = url
    return content
  }
  if (assetId) {
    content.asset_id = assetId
    return content
  }
  if (url) content.url = url
  return content
}

async function inspectVideoSource(src: string, revokeObjectUrl?: string) {
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.playsInline = true
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('无法读取参考视频时长'))
      video.src = src
    })

    if (!Number.isFinite(video.duration) || video.duration === Infinity) {
      await new Promise<void>((resolve, reject) => {
        const onDurationChange = () => {
          if (Number.isFinite(video.duration) && video.duration > 0) {
            cleanup()
            resolve()
          }
        }
        const onError = () => {
          cleanup()
          reject(new Error('无法读取参考视频时长'))
        }
        const cleanup = () => {
          video.removeEventListener('durationchange', onDurationChange)
          video.removeEventListener('error', onError)
        }
        video.addEventListener('durationchange', onDurationChange)
        video.addEventListener('error', onError)
        try {
          video.currentTime = 1e101
        } catch {
          cleanup()
          reject(new Error('无法读取参考视频时长'))
        }
      })
      try {
        video.currentTime = 0
      } catch {
        /* ignore */
      }
    }

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error('参考视频时长无效')
    }
    return { duration: video.duration }
  } finally {
    video.removeAttribute('src')
    video.load()
    if (revokeObjectUrl) URL.revokeObjectURL(revokeObjectUrl)
  }
}

export async function inspectVideo(file: File) {
  const url = URL.createObjectURL(file)
  return inspectVideoSource(url, url)
}

/** 用 HEAD Content-Length 估算远端文件大小（CORS/拒绝时返回 0） */
export async function probeRemoteFileSize(url: string) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit',
    })
    if (!response.ok) return 0
    const length = response.headers.get('content-length')
    const size = length ? Number(length) : 0
    return Number.isFinite(size) && size > 0 ? size : 0
  } catch {
    return 0
  }
}

/**
 * 最近使用等远端视频：读取时长供展示；size 为 0 时尝试 HEAD 补齐。
 * 签名过期时先换签再读。时长合规性由接口校验。
 */
export async function inspectRemoteReferenceVideo(
  url: string,
  options?: { fileKey?: string; knownSize?: number }
) {
  const tryInspect = async (playableUrl: string) => {
    const [{ duration }, probedSize] = await Promise.all([
      inspectVideoSource(playableUrl),
      options?.knownSize && options.knownSize > 0
        ? Promise.resolve(0)
        : probeRemoteFileSize(playableUrl),
    ])
    return {
      duration,
      size:
        options?.knownSize && options.knownSize > 0
          ? options.knownSize
          : probedSize,
      url: playableUrl,
    }
  }

  try {
    return await tryInspect(url)
  } catch (firstError) {
    const nextUrl = await requestCreativeUrlPresign(url, options?.fileKey)
    if (!nextUrl || nextUrl === url) throw firstError
    return tryInspect(nextUrl)
  }
}

export function isSupportedReferenceVideo(file: File) {
  return (
    file.type === 'video/mp4' ||
    file.type === 'video/quicktime' ||
    /\.(mp4|mov)$/i.test(file.name)
  )
}

export function isSupportedReferenceVideoAsset(asset: {
  content_type?: string
  name?: string
  url?: string
  file_key?: string
}) {
  const contentType = (asset.content_type ?? '').toLowerCase()
  if (contentType === 'video/mp4' || contentType === 'video/quicktime') {
    return true
  }
  const source = `${asset.name ?? ''} ${asset.url ?? ''} ${asset.file_key ?? ''}`
  return /\.(mp4|mov)(\?|#|$)/i.test(source)
}

export function isImageFile(file: File) {
  return (
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name)
  )
}

export function prependRecentCreativeAssets(
  previous: CreativeAsset[] | undefined,
  assets: CreativeAsset[]
) {
  const next = [...assets, ...(previous ?? [])]
  const seen = new Set<string>()
  return next.filter((item) => {
    const key = item.file_key || item.url.split('?')[0]
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
