import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore, type AuthSession } from '@/stores/authStore'

export const API_BASE_URL = '/api'

type RetryableRequest = InternalAxiosRequestConfig & {
  _retry?: boolean
}

type ApiResponse<T> = {
  code: number
  msg: string
  data: T
}

function isExpiredSessionError(error: AxiosError) {
  if (error.response?.status !== 403) return false
  const payload = error.response.data
  if (!payload || typeof payload !== 'object' || !('msg' in payload))
    return false
  return (
    typeof payload.msg === 'string' && payload.msg.includes('登录状态已失效')
  )
}

// 强制退出登录：清空会话并跳转登录页。仅在 Redis 中 jti 已失效
// （或后端返回 403 标记登录态失效）时被调用。
function forceSignOut(reason: string) {
  const { auth } = useAuthStore.getState()
  // 防止重复触发
  if (!auth.session) {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in'
    }
    return
  }
  auth.reset()
  if (typeof window !== 'undefined') {
    const redirect = window.location.href
    window.location.href = `/sign-in?redirect=${encodeURIComponent(redirect)}&reason=${encodeURIComponent(reason)}`
  }
}

let refreshRequest: Promise<AuthSession> | null = null

/** 默认请求超时（毫秒）；上传等长耗时可在单次请求里覆盖 */
export const REQUEST_TIMEOUT_MS = 180_000

export const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
})

request.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().auth.accessToken
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

request.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const failed = error.config as RetryableRequest | undefined

    // 后端 403（jti 已失效等）→ 直接强制退出，不允许继续请求刷新。
    if (isExpiredSessionError(error)) {
      forceSignOut('会话已过期，请重新登录')
      return Promise.reject(error)
    }

    const skipsRefresh = ['/v1/auth/login', '/v1/auth/refresh'].includes(
      failed?.url ?? ''
    )

    if (
      error.response?.status !== 401 ||
      !failed ||
      failed._retry ||
      skipsRefresh
    ) {
      return Promise.reject(error)
    }

    const { auth } = useAuthStore.getState()
    const session = auth.session
    if (
      !session?.refresh_token ||
      session.refresh_token_expire_at <= Date.now() / 1000
    ) {
      auth.reset()
      return Promise.reject(error)
    }

    failed._retry = true

    try {
      refreshRequest ??= axios
        .post<ApiResponse<AuthSession>>(
          `${API_BASE_URL}/v1/auth/refresh`,
          {
            refresh_token: session.refresh_token,
            client_name: 'video-pipeline-web',
          },
          { timeout: REQUEST_TIMEOUT_MS }
        )
        .then(({ data }) => {
          if (data.code !== 0) throw new Error(data.msg || '刷新登录状态失败')
          return data.data
        })
        .finally(() => {
          refreshRequest = null
        })

      const refreshedSession = await refreshRequest
      useAuthStore.getState().auth.setSession(refreshedSession)
      failed.headers.Authorization = `Bearer ${refreshedSession.access_token}`
      return request(failed)
    } catch (refreshError) {
      useAuthStore.getState().auth.reset()
      return Promise.reject(refreshError)
    }
  }
)
