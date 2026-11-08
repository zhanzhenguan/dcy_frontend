import axios from 'axios'
import { request } from '@/services/request'
import { getApiErrorMessage } from '@/services/api/apiError'

export type VideoContentType = 'text' | 'image_url' | 'video_url' | 'audio_url'

export type VideoGenerationContent = {
  type: VideoContentType
  text?: string
  url?: string
  /** 本平台 OSS 对象键；编辑回填 / 自主上传优先传此字段 */
  file_key?: string
  /** 活动素材库公开 ID；勿填前端本地 materials.id */
  asset_id?: string
  role?:
    | 'first_frame'
    | 'last_frame'
    | 'reference_image'
    | 'reference_video'
    | 'reference_audio'
}

export type CreateVideoGenerationInput = {
  task_id?: string
  provider?: string
  model?: string
  title?: string
  industry?: string
  draft_id?: string
  /** 创作向导完整快照 JSON；生成写入任务主表，显式保存仍走草稿表 */
  draft_data?: string
  language?: string
  platform?: string
  content: VideoGenerationContent[]
  generate_audio?: boolean
  resolution?: string
  ratio?: string
  duration?: number
  watermark?: boolean
}

export type VideoGenerationTask = {
  creator_nickname: string
  creator_avatar_url?: string
  provider: string
  id: string
  provider_task_id: string
  model: string
  title: string
  industry: string
  draft_id: string
  /** 创作向导完整快照；列表通常为空，详情接口返回 */
  draft_data?: string
  /** 投放平台（创建时传入的 name / id / short_name） */
  platform?: string
  status:
    | 'queued'
    | 'running'
    | 'cancelled'
    | 'succeeded'
    | 'failed'
    | 'expired'
  error_code: string
  error_message: string
  video_url: string
  first_frame_url: string
  last_frame_url: string
  file_url: string
  resolution: string
  ratio: string
  duration: number
  input_video_duration: number
  estimated_credits: number
  charged_credits: number
  credit_status: 'none' | 'frozen' | 'charged' | 'released'
  generate_audio: boolean
  /** 当前登录用户对该视频的累计下载次数 */
  download_count?: number
  /** 当前登录用户最近一次下载该视频的 Unix 秒时间戳 */
  last_downloaded_at?: number
  /** 当前登录用户评价：up / down，未评价为空 */
  my_reaction?: 'up' | 'down' | ''
  /** 当前登录用户是否为该视频创建人 */
  is_own?: boolean
  created_at: number
  updated_at: number
}

export type VideoGenerationEstimate = {
  provider: string
  model: string
  model_name: string
  scenario: 'no_input_video' | 'input_video'
  resolution: string
  output_duration: number
  input_video_duration: number
  billable_duration_ms: number
  base_credits: number
  coefficient: number
  estimated_credits: number
}

export type VideoGenerationTaskList = {
  total: number
  items: VideoGenerationTask[]
}

export type VideoGenerationStats = {
  total: number
  succeeded: number
  processing: number
}

export type VideoDraftMode = 'competitive' | 'custom'

export type VideoDraft = {
  creator_nickname: string
  creator_avatar_url?: string
  id: string
  mode: VideoDraftMode
  current_step: number
  draft_data: string
  project_title: string
  industry_name: string
  created_at: number
  updated_at: number
}

export type VideoDraftList = {
  items: VideoDraft[]
}

type ApiResponse<T> = {
  code: number
  msg: string
  data: T
}

function unwrapResponse<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function createVideoGeneration(input: CreateVideoGenerationInput) {
  try {
    const { data } = await request.post<ApiResponse<VideoGenerationTask>>(
      '/v1/video/generations',
      input
    )
    return unwrapResponse(data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '生成任务创建失败，请稍后重试'))
  }
}

export async function getVideoGeneration(id: string) {
  const { data } = await request.get<ApiResponse<VideoGenerationTask>>(
    `/v1/video/generations/${id}`
  )
  return unwrapResponse(data)
}

/** 设置/取消当前用户对本人视频的赞踩；reaction 为空表示取消。 */
export async function setVideoGenerationReaction(
  id: string,
  reaction: 'up' | 'down' | ''
) {
  const { data } = await request.put<ApiResponse<VideoGenerationTask>>(
    `/v1/video/generations/${id}/reaction`,
    { reaction }
  )
  return unwrapResponse(data)
}

export async function listVideoGenerations(params: {
  page: number
  page_size: number
  status?: VideoGenerationTask['status']
  created_from?: number
  created_to?: number
  /** all=数据权限内全部（默认）；self=仅自己提交 */
  scope?: 'all' | 'self'
  /** 按企业分组筛选 */
  group_public_id?: string
  /** 按企业成员筛选（仅 owner） */
  user_public_id?: string
  /** 按草稿过滤（后端支持时生效；前端仍会二次校验 draft_id） */
  draft_id?: string
}) {
  const { scope, group_public_id, user_public_id, ...rest } = params
  const { data } = await request.get<ApiResponse<VideoGenerationTaskList>>(
    '/v1/video/generations',
    {
      params: {
        ...rest,
        ...(scope === 'self' || scope === 'all' ? { scope } : {}),
        ...(group_public_id ? { group_public_id } : {}),
        ...(user_public_id ? { user_public_id } : {}),
      },
    }
  )
  return unwrapResponse(data)
}

export async function deleteVideoGeneration(id: string) {
  const { data } = await request.delete<ApiResponse<Record<string, never>>>(
    `/v1/video/generations/${id}`
  )
  return unwrapResponse(data)
}

export type BatchDeleteVideoGenerationsResult = {
  requested: number
  deleted: number
  failed_ids: string[]
  failed_draft_ids: string[]
}

export async function batchDeleteVideoGenerations(input: {
  ids?: string[]
  draft_ids?: string[]
}) {
  const { data } = await request.post<
    ApiResponse<BatchDeleteVideoGenerationsResult>
  >('/v1/video/generations/batch-delete', {
    ids: input.ids ?? [],
    draft_ids: input.draft_ids ?? [],
  })
  return unwrapResponse(data)
}

export type BatchDownloadVideoGenerationsResult = {
  mode: 'file' | 'zip' | string
  download_url: string
  filename: string
  count: number
  failed_ids: string[]
}

export async function batchDownloadVideoGenerations(ids: string[]) {
  const { data } = await request.post<
    ApiResponse<BatchDownloadVideoGenerationsResult>
  >('/v1/video/generations/batch-download', { ids })
  return unwrapResponse(data)
}

export async function getVideoGenerationStats(params?: {
  created_from?: number
  created_to?: number
  /** all=数据权限内全部（默认）；self=仅自己提交 */
  scope?: 'all' | 'self'
  group_public_id?: string
  user_public_id?: string
}) {
  const { data } = await request.get<ApiResponse<VideoGenerationStats>>(
    '/v1/video/generations/stats',
    {
      params: {
        ...(params?.created_from && params.created_from > 0
          ? { created_from: params.created_from }
          : {}),
        ...(params?.created_to && params.created_to > 0
          ? { created_to: params.created_to }
          : {}),
        ...(params?.scope === 'self' || params?.scope === 'all'
          ? { scope: params.scope }
          : {}),
        ...(params?.group_public_id
          ? { group_public_id: params.group_public_id }
          : {}),
        ...(params?.user_public_id
          ? { user_public_id: params.user_public_id }
          : {}),
      },
    }
  )
  return unwrapResponse(data)
}

export async function saveVideoDraft(input: {
  id?: string
  mode: VideoDraftMode
  current_step: number
  draft_data: string
  manual_save?: boolean
}) {
  const { data } = await request.post<ApiResponse<VideoDraft>>(
    '/v1/video/drafts',
    input
  )
  return unwrapResponse(data)
}

export async function getVideoDraft(id: string) {
  const { data } = await request.get<ApiResponse<VideoDraft>>(
    `/v1/video/drafts/${id}`
  )
  return unwrapResponse(data)
}

export async function listVideoDrafts(params?: {
  /** all=数据权限内全部（默认）；self=仅自己提交 */
  scope?: 'all' | 'self'
  group_public_id?: string
  user_public_id?: string
}) {
  const { data } = await request.get<ApiResponse<VideoDraftList>>(
    '/v1/video/drafts',
    {
      params: {
        ...(params?.scope === 'self' || params?.scope === 'all'
          ? { scope: params.scope }
          : {}),
        ...(params?.group_public_id
          ? { group_public_id: params.group_public_id }
          : {}),
        ...(params?.user_public_id
          ? { user_public_id: params.user_public_id }
          : {}),
      },
    }
  )
  return unwrapResponse(data)
}

export async function deleteVideoDraft(id: string) {
  const { data } = await request.delete<ApiResponse<Record<string, never>>>(
    `/v1/video/drafts/${id}`
  )
  return unwrapResponse(data)
}

export async function estimateVideoGeneration(input: {
  provider: string
  model?: string
  resolution: string
  ratio?: string
  duration: number
  content?: VideoGenerationContent[]
}) {
  try {
    const { data } = await request.post<ApiResponse<VideoGenerationEstimate>>(
      '/v1/video/generations/estimate',
      input
    )
    // 业务失败：直接抛出服务端 msg
    if (data.code !== 0) {
      throw new Error(data.msg || '积分预估失败')
    }
    return data.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const payload = error.response?.data as
        | { msg?: unknown; message?: unknown; error?: unknown; detail?: unknown }
        | string
        | undefined
      const serverMsg =
        typeof payload === 'string'
          ? payload.trim()
          : payload && typeof payload === 'object'
            ? [payload.msg, payload.message, payload.error, payload.detail]
                .map((item) =>
                  typeof item === 'string' ? item.trim() : undefined
                )
                .find(Boolean)
            : undefined
      throw new Error(serverMsg || getApiErrorMessage(error, '积分预估失败'))
    }
    if (error instanceof Error && error.message) throw error
    throw new Error(getApiErrorMessage(error, '积分预估失败'))
  }
}
