import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useAuthStore } from '@/stores/authStore'
import { getUnreadInAppMessageCount } from '@/services/api/messageApi'

export const MESSAGE_NOTIFICATIONS_CHANGED = 'message-notifications-changed'
export const VIDEO_TASK_STATUS_EVENT = 'video-task-status'
/** WebSocket 连上（含重连）后触发，用于对齐掉线期间漏推的视频状态。 */
export const VIDEO_TASK_RESYNC_EVENT = 'video-task-resync'

export type VideoTaskStatusEventDetail = {
  task_id: string
  status: string
  title?: string
  error_message?: string
  updated_at?: number
}

type RealtimeEnvelope = {
  type: string
  user_id?: number
  data?: unknown
}

const socketReconnectInitialDelayMs = 1_000
const socketReconnectMaxDelayMs = 30_000

function reconnectDelay(attempt: number) {
  const delay = Math.min(
    socketReconnectInitialDelayMs * 2 ** attempt,
    socketReconnectMaxDelayMs
  )
  return Math.min(
    delay + Math.floor(Math.random() * Math.min(delay, 1_000)),
    socketReconnectMaxDelayMs
  )
}

type MessageNotifications = {
  unreadCount: number
  refresh: () => Promise<void>
}

const MessageNotificationsContext = createContext<MessageNotifications | null>(
  null
)

export function MessageNotificationsProvider({
  children,
}: {
  children: ReactNode
}) {
  const accessToken = useAuthStore((state) => state.auth.accessToken)
  const [unreadCount, setUnreadCount] = useState(0)
  const refresh = useCallback(async () => {
    try {
      const { count } = await getUnreadInAppMessageCount()
      setUnreadCount(count)
    } catch {
      // 保留最后一次成功读取的数字，避免短暂网络故障清空提醒。
    }
  }, [])

  useEffect(() => {
    if (!accessToken) {
      setUnreadCount(0)
      return
    }
    let active = true
    let socket: WebSocket | undefined
    let reconnectTimer: number | undefined
    let reconnectAttempts = 0
    void refresh()

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const connect = () => {
      reconnectTimer = undefined
      socket = new WebSocket(
        `${protocol}//${window.location.host}/api/v1/messages/socket`,
        ['jwt', accessToken]
      )
      socket.onopen = () => {
        if (!active) return
        reconnectAttempts = 0
        window.dispatchEvent(new Event(MESSAGE_NOTIFICATIONS_CHANGED))
        window.dispatchEvent(new Event(VIDEO_TASK_RESYNC_EVENT))
      }
      socket.onmessage = (event) => {
        if (!active) return
        try {
          const envelope = JSON.parse(String(event.data)) as RealtimeEnvelope
          if (envelope.type === 'video_task_status') {
            window.dispatchEvent(
              new CustomEvent<VideoTaskStatusEventDetail>(
                VIDEO_TASK_STATUS_EVENT,
                { detail: envelope.data as VideoTaskStatusEventDetail }
              )
            )
            return
          }
          if (envelope.type === 'message') {
            window.dispatchEvent(new Event(MESSAGE_NOTIFICATIONS_CHANGED))
          }
        } catch {
          window.dispatchEvent(new Event(MESSAGE_NOTIFICATIONS_CHANGED))
        }
      }
      socket.onclose = () => {
        if (active) {
          const delay = reconnectDelay(reconnectAttempts)
          reconnectAttempts += 1
          reconnectTimer = window.setTimeout(connect, delay)
        }
      }
    }
    connect()

    window.addEventListener(MESSAGE_NOTIFICATIONS_CHANGED, refresh)
    return () => {
      active = false
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
      socket?.close()
      window.removeEventListener(MESSAGE_NOTIFICATIONS_CHANGED, refresh)
    }
  }, [accessToken, refresh])

  return createElement(
    MessageNotificationsContext.Provider,
    { value: { unreadCount, refresh } },
    children
  )
}

export function useMessageNotifications() {
  const notifications = useContext(MessageNotificationsContext)
  if (!notifications) {
    throw new Error(
      'useMessageNotifications 必须在 MessageNotificationsProvider 内使用'
    )
  }
  return notifications
}
