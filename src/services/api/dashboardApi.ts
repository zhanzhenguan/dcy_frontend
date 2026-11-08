import { request } from '@/services/request'
import { getApiErrorMessage } from './apiError'

// 工作台概览统计：积分消耗、素材库、本月生成、发布、团队与待处理任务。
export type DashboardSummary = {
  credit_consumed: number
  credit_consumed_prev: number
  asset_total: number
  asset_total_bytes: number
  month_generated: number
  month_published: number
  team_member_total: number
  team_group_total: number
  active_member_total: number
  pending_task_total: number
  pending_queued: number
  pending_running: number
}

// 按日计数项，日期为东八区自然日 yyyy-MM-dd。
export type DashboardDailyCount = {
  date: string
  count: number
}

export type DashboardDailyList = {
  items: DashboardDailyCount[]
}

// 活跃榜单成员行：本月生成数与积分消耗。
export type DashboardRankMember = {
  rank: number
  nickname: string
  email: string
  avatar: string
  generated: number
  consumed: number
}

export type DashboardTrend = {
  items: DashboardDailyCount[]
  total_generated: number
  active_members: number
  daily_avg: number
  ranking: DashboardRankMember[]
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

export async function getDashboardSummary() {
  try {
    const { data } = await request.get<ApiResponse<DashboardSummary>>(
      '/v1/dashboard/summary'
    )
    return unwrapResponse(data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '工作台统计加载失败，请稍后重试'))
  }
}

export async function getDashboardCalendar(days = 30) {
  try {
    const { data } = await request.get<ApiResponse<DashboardDailyList>>(
      '/v1/dashboard/calendar',
      { params: { days } }
    )
    return unwrapResponse(data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '创作日历加载失败，请稍后重试'))
  }
}

export async function getDashboardTrend(range: 7 | 14 | 30 = 7) {
  try {
    const { data } = await request.get<ApiResponse<DashboardTrend>>(
      '/v1/dashboard/trend',
      { params: { range } }
    )
    return unwrapResponse(data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '创作趋势加载失败，请稍后重试'))
  }
}
