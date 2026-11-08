import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }

export type VideoRatio = { id: string; value: string; name: string; status: string; sort_order: number }

export async function listVideoRatios() {
  const { data } = await request.get<ApiResponse<{ total: number; items: VideoRatio[] }>>('/v1/video-ratios')
  if (data.code !== 0) throw new Error(data.msg || '加载视频比例失败')
  return data.data.items
}
