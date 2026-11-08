import axios from 'axios'

type ApiErrorResponse = {
  code?: number
  msg?: unknown
  message?: unknown
  error?: unknown
}

function responseMessage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text || /^\d{3}$/.test(text)) return undefined
    try {
      return responseMessage(JSON.parse(text))
    } catch {
      return text
    }
  }

  if (!value || typeof value !== 'object') return undefined
  const response = value as ApiErrorResponse
  return (
    responseMessage(response.msg) ??
    responseMessage(response.message) ??
    responseMessage(response.error)
  )
}

export function getApiErrorMessage(
  error: unknown,
  fallback = '请求失败，请稍后重试'
) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = responseMessage(error.response?.data)
    if (message) return message
    if (error.code === 'ERR_NETWORK') return '无法连接到服务，请确认后端已启动'
    if ((error.response?.status ?? 0) >= 500) {
      return '服务暂时不可用，请稍后重试'
    }
    return fallback
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}
