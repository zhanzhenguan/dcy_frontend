import { request } from '@/services/request'
import { getApiErrorMessage } from '@/services/api/apiError'
import { createId } from '@/utils/utils'
import type { VideoGenerationContent } from '@/services/api/videoApi'

type ApiResponse<T> = { code: number; msg: string; data: T }

export type CreativeAsset = {
  file_key?: string
  url: string
  name: string
  content_type: string
  media_type: 'image' | 'video' | 'audio' | ''
  size: number
}

export type GeneratedAdScript = {
  title: string
  tag: string
  duration: number
  content: string
}

type GeneratedAdScriptPayload = {
  title: string
  content: string
}

export type AdScriptGeneration = {
  summary: string
  scripts: GeneratedAdScript[]
}

export function normalizeAdScriptGeneration(
  payload: unknown,
  duration: number
): AdScriptGeneration {
  if (!Array.isArray(payload) || payload.length !== 4) {
    throw new Error('广告脚本生成响应格式错误')
  }

  const scripts = payload.map((item): GeneratedAdScriptPayload => {
    if (!item || typeof item !== 'object') {
      throw new Error('广告脚本生成响应格式错误')
    }
    const { title, content } = item as Record<string, unknown>
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof content !== 'string' ||
      !content.trim()
    ) {
      throw new Error('广告脚本生成响应格式错误')
    }
    return { title: title.trim(), content: content.trim() }
  })

  return {
    summary: '',
    scripts: scripts.map((script) => ({
      title: script.title,
      tag: 'AI 生成',
      duration,
      content: script.content,
    })),
  }
}

export type PromptPlaceholder = {
  key: string
  token: string
  label: string
  description: string
  source: 'material' | 'video_config'
}

export type PromptTemplateSettings = {
  user_prompt: string
  default_user_prompt: string
  placeholders: PromptPlaceholder[]
}

function inferMediaTypeFromAsset(asset: {
  media_type?: string
  content_type?: string
  file_key?: string
  url?: string
  name?: string
}): CreativeAsset['media_type'] {
  const explicit = (asset.media_type ?? '').toLowerCase().trim()
  if (explicit === 'image' || explicit === 'video' || explicit === 'audio') {
    return explicit
  }

  const contentType = (asset.content_type ?? '').toLowerCase()
  if (contentType.startsWith('image/')) return 'image'
  if (contentType.startsWith('video/')) return 'video'
  if (contentType.startsWith('audio/')) return 'audio'

  const source = `${asset.file_key ?? ''} ${asset.url ?? ''} ${asset.name ?? ''}`.toLowerCase()
  if (/\.(jpe?g|png|webp|gif|bmp|heic)(\?|#|$)/i.test(source)) return 'image'
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(source)) return 'video'
  if (/\.(mp3|wav|m4a|aac|ogg)(\?|#|$)/i.test(source)) return 'audio'
  return ''
}

function normalizeCreativeAsset(raw: Partial<CreativeAsset> & Record<string, unknown>): CreativeAsset {
  const url = typeof raw.url === 'string' ? raw.url : ''
  const fileKey =
    typeof raw.file_key === 'string'
      ? raw.file_key
      : typeof raw.fileKey === 'string'
        ? raw.fileKey
        : ''
  const name = typeof raw.name === 'string' ? raw.name : ''
  const contentType =
    typeof raw.content_type === 'string'
      ? raw.content_type
      : typeof raw.contentType === 'string'
        ? raw.contentType
        : ''
  const mediaType = inferMediaTypeFromAsset({
    media_type:
      typeof raw.media_type === 'string'
        ? raw.media_type
        : typeof raw.mediaType === 'string'
          ? raw.mediaType
          : '',
    content_type: contentType,
    file_key: fileKey,
    url,
    name,
  })

  return {
    file_key: fileKey || undefined,
    url,
    name: name || fileKey.split('/').pop() || '素材',
    content_type: contentType,
    media_type: mediaType,
    size: typeof raw.size === 'number' ? raw.size : 0,
  }
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

/** 上传前用 UUID 重命名，避免 OSS / 元数据重名 */
function renameFileWithUuid(file: File) {
  const extFromName = file.name.includes('.')
    ? file.name.split('.').pop()?.toLowerCase()
    : ''
  const extFromType = file.type.includes('/')
    ? file.type.split('/')[1]?.replace('jpeg', 'jpg')
    : ''
  const ext = (extFromName || extFromType || 'bin').replace(/^\./, '')
  return new File([file], `${createId()}.${ext}`, {
    type: file.type || undefined,
    lastModified: file.lastModified,
  })
}

export async function uploadCreativeAsset(file: File) {
  const uploadFile = renameFileWithUuid(file)
  const form = new FormData()
  form.append('file', uploadFile)
  try {
    const { data } = await request.post<ApiResponse<CreativeAsset>>(
      '/v1/creative/assets',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return normalizeCreativeAsset(unwrap(data) as CreativeAsset)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, `${uploadFile.name} 上传失败`))
  }
}

export async function listCreativeAssets() {
  try {
    // 后端返回最近上传成功的素材（最多 30 条）；列表项通常仅有 file_key / url。
    const { data } = await request.get<ApiResponse<CreativeAsset[]>>(
      '/v1/creative/assets'
    )
    const payload = unwrap(data)
    const items = Array.isArray(payload) ? payload : []
    return items.map((item) => normalizeCreativeAsset(item as CreativeAsset))
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '最近上传素材加载失败'))
  }
}

export async function deleteCreativeAsset(url: string) {
  const { data } = await request.delete<ApiResponse<Record<string, never>>>(
    '/v1/creative/assets',
    { data: { url } }
  )
  return unwrap(data)
}

export type PresignCreativeAssetsInput = {
  file_keys?: string[]
  urls?: string[]
}

export type PresignCreativeAssetItem = {
  file_key: string
  url: string
}

/** 从已签名 OSS/COS URL 提取对象 key（去掉域名与 query） */
export function extractCreativeFileKey(urlOrKey: string) {
  const raw = urlOrKey.trim()
  if (!raw) return ''
  if (!/^https?:\/\//i.test(raw)) {
    return raw.replace(/^\//, '').split('?')[0] ?? ''
  }
  try {
    const parsed = new URL(raw)
    return parsed.pathname.replace(/^\//, '')
  } catch {
    return raw.split('?')[0]?.replace(/^\//, '') ?? ''
  }
}

function readPresignUrl(row: Record<string, unknown>) {
  const candidates = [
    row.url,
    row.signed_url,
    row.signedUrl,
    row.presigned_url,
    row.presign_url,
    row.download_url,
    row.downloadUrl,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function readPresignFileKey(row: Record<string, unknown>, url: string) {
  if (typeof row.file_key === 'string' && row.file_key.trim()) {
    return row.file_key.trim()
  }
  if (typeof row.fileKey === 'string' && row.fileKey.trim()) {
    return row.fileKey.trim()
  }
  return extractCreativeFileKey(url)
}

function mapPresignRow(item: unknown): PresignCreativeAssetItem | null {
  if (!item || typeof item !== 'object') return null
  const row = item as Record<string, unknown>
  const url = readPresignUrl(row)
  const fileKey = readPresignFileKey(row, url)
  if (!url) return null
  return { file_key: fileKey, url }
}

function normalizePresignItems(
  payload: unknown,
  requested: PresignCreativeAssetsInput
): PresignCreativeAssetItem[] {
  // 实际接口：{ items: [{ file_key, url, expires_in }] }
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const row = payload as Record<string, unknown>
    if (Array.isArray(row.items)) {
      return row.items
        .map(mapPresignRow)
        .filter((item): item is PresignCreativeAssetItem => Boolean(item))
    }

    const urls = Array.isArray(row.urls)
      ? row.urls.filter((item): item is string => typeof item === 'string')
      : []
    const keys = Array.isArray(row.file_keys)
      ? row.file_keys.filter((item): item is string => typeof item === 'string')
      : Array.isArray(row.fileKeys)
        ? row.fileKeys.filter((item): item is string => typeof item === 'string')
        : (requested.file_keys ?? [])

    if (urls.length > 0) {
      return urls.map((url, index) => ({
        file_key: keys[index] || extractCreativeFileKey(url),
        url,
      }))
    }
  }

  if (Array.isArray(payload)) {
    return payload
      .map(mapPresignRow)
      .filter((item): item is PresignCreativeAssetItem => Boolean(item))
  }

  return []
}

/** POST /v1/creative/assets/presign — 批量换签（过期 URL / file_key） */
export async function presignCreativeAssets(
  input: PresignCreativeAssetsInput
): Promise<PresignCreativeAssetItem[]> {
  const file_keys = Array.from(
    new Set(
      (input.file_keys ?? [])
        .map((item) => extractCreativeFileKey(item))
        .filter(Boolean)
    )
  )
  const urls = Array.from(new Set((input.urls ?? []).filter(Boolean)))
  if (file_keys.length === 0 && urls.length === 0) return []

  try {
    const { data } = await request.post<ApiResponse<unknown>>(
      '/v1/creative/assets/presign',
      { file_keys, urls }
    )
    return normalizePresignItems(unwrap(data), { file_keys, urls })
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '素材链接换签失败'))
  }
}

export async function generateAdScripts(input: {
  image_urls: string[]
  product_video_url?: string
  introduction?: string
  platform?: string
  language?: string
  ratio?: string
  resolution?: string
  duration?: number
  provider?: string
  model?: string
  bgm?: string
  variants_count?: number
  content?: VideoGenerationContent[]
}) {
  try {
    const { data } = await request.post<ApiResponse<unknown>>(
      '/v1/creative/ad-scripts',
      input
    )
    return normalizeAdScriptGeneration(unwrap(data), input.duration ?? 0)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '广告脚本生成失败'))
  }
}

export async function getPromptTemplateSettings() {
  try {
    const { data } = await request.get<ApiResponse<PromptTemplateSettings>>(
      '/v1/admin/creative/prompt-templates'
    )
    return unwrap(data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '提示词配置加载失败'))
  }
}

export async function updatePromptTemplateSettings(input: {
  user_prompt: string
}) {
  try {
    const { data } = await request.put<ApiResponse<PromptTemplateSettings>>(
      '/v1/admin/creative/prompt-templates',
      input
    )
    return unwrap(data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '提示词配置保存失败'))
  }
}
