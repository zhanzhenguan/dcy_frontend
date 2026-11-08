import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  VIDEO_TASK_RESYNC_EVENT,
  VIDEO_TASK_STATUS_EVENT,
  type VideoTaskStatusEventDetail,
} from '@/hooks/useMessageNotifications'
import { getVideoGeneration, type VideoGenerationTask } from '@/services/api/videoApi'
import { terminalStatuses } from '../constants'

type UseGenerationTaskPollingParams = {
  activeTasks: VideoGenerationTask[]
  setActiveTasks: React.Dispatch<React.SetStateAction<VideoGenerationTask[]>>
}

function applyStatusEvent(
  task: VideoGenerationTask,
  detail: VideoTaskStatusEventDetail
): VideoGenerationTask {
  if (task.id !== detail.task_id) return task
  const nextStatus = detail.status as VideoGenerationTask['status']
  if (task.status === nextStatus) return task
  return {
    ...task,
    status: nextStatus,
    error_message: detail.error_message || task.error_message,
    title: detail.title || task.title,
  }
}

function notifyTerminalTransition(
  previous: VideoGenerationTask,
  next: VideoGenerationTask
) {
  if (next.status === 'succeeded' && previous.status !== 'succeeded') {
    toast.success(`视频 ${next.id.slice(0, 8)} 生成完成`)
  }
  if (next.status === 'failed' && previous.status !== 'failed') {
    toast.error(next.error_message || '视频生成失败')
  }
}

function isMissingMedia(task: VideoGenerationTask) {
  return (
    !(task.file_url || task.video_url) ||
    !(task.first_frame_url || task.last_frame_url)
  )
}

/** WS 推送通常只有状态，成功后补拉首帧/成片地址 */
async function fetchTask(taskId: string) {
  try {
    return await getVideoGeneration(taskId)
  } catch {
    return null
  }
}

export const useGenerationTaskPolling = ({
  activeTasks,
  setActiveTasks,
}: UseGenerationTaskPollingParams) => {
  const activeTasksRef = useRef(activeTasks)
  const mediaHydrateAttemptedRef = useRef(new Set<string>())

  useEffect(() => {
    activeTasksRef.current = activeTasks
  }, [activeTasks])

  useEffect(() => {
    const pendingSucceeded = new Map<string, number>()
    const hydrating = new Set<string>()

    const mergeHydratedTask = (fresh: VideoGenerationTask) => {
      setActiveTasks((latest) => {
        const currentTask = latest.find((task) => task.id === fresh.id)
        if (!currentTask) return latest
        notifyTerminalTransition(currentTask, fresh)
        return latest.map((task) => (task.id === fresh.id ? fresh : task))
      })
    }

    const ensureMedia = (taskId: string) => {
      if (hydrating.has(taskId)) return
      const current = activeTasksRef.current.find((task) => task.id === taskId)
      if (current && !isMissingMedia(current)) return
      hydrating.add(taskId)
      mediaHydrateAttemptedRef.current.add(taskId)
      void fetchTask(taskId)
        .then((fresh) => {
          if (fresh) mergeHydratedTask(fresh)
        })
        .finally(() => {
          hydrating.delete(taskId)
        })
    }

    const commitSucceeded = (detail: VideoTaskStatusEventDetail) => {
      setActiveTasks((latest) => {
        const currentTask = latest.find((task) => task.id === detail.task_id)
        if (!currentTask || currentTask.status === 'succeeded') return latest
        const next = applyStatusEvent(currentTask, detail)
        if (next === currentTask) return latest
        notifyTerminalTransition(currentTask, next)
        return latest.map((task) => (task.id === next.id ? next : task))
      })
      ensureMedia(detail.task_id)
    }

    const onStatus = (event: Event) => {
      const detail = (event as CustomEvent<VideoTaskStatusEventDetail>).detail
      if (!detail?.task_id || !detail.status) return

      const matched = activeTasksRef.current.find(
        (task) => task.id === detail.task_id
      )
      if (!matched) return

      if (
        matched.status === 'queued' &&
        detail.status === 'succeeded' &&
        !pendingSucceeded.has(detail.task_id)
      ) {
        setActiveTasks((current) =>
          current.map((task) =>
            task.id === detail.task_id ? { ...task, status: 'running' } : task
          )
        )
        const timer = window.setTimeout(() => {
          pendingSucceeded.delete(detail.task_id)
          commitSucceeded(detail)
        }, 1200)
        pendingSucceeded.set(detail.task_id, timer)
        return
      }

      if (detail.status === 'running' || detail.status === 'succeeded') {
        const timer = pendingSucceeded.get(detail.task_id)
        if (timer) {
          window.clearTimeout(timer)
          pendingSucceeded.delete(detail.task_id)
        }
      }

      setActiveTasks((current) => {
        const currentTask = current.find((task) => task.id === detail.task_id)
        if (!currentTask) return current
        const next = applyStatusEvent(currentTask, detail)
        if (next === currentTask) return current
        notifyTerminalTransition(currentTask, next)
        return current.map((task) => (task.id === next.id ? next : task))
      })

      if (detail.status === 'succeeded') {
        ensureMedia(detail.task_id)
      }
    }
    window.addEventListener(VIDEO_TASK_STATUS_EVENT, onStatus)
    return () => {
      window.removeEventListener(VIDEO_TASK_STATUS_EVENT, onStatus)
      pendingSucceeded.forEach((timer) => window.clearTimeout(timer))
      pendingSucceeded.clear()
    }
  }, [setActiveTasks])

  // 成功态缺媒体时补拉一次（页面恢复 / 刷新后仍在列表的情况）
  useEffect(() => {
    const missing = activeTasks.filter(
      (task) =>
        task.status === 'succeeded' &&
        isMissingMedia(task) &&
        !mediaHydrateAttemptedRef.current.has(task.id)
    )
    if (missing.length === 0) return

    missing.forEach((task) => mediaHydrateAttemptedRef.current.add(task.id))

    let cancelled = false
    void Promise.all(missing.map((task) => fetchTask(task.id))).then(
      (freshTasks) => {
        if (cancelled) return
        setActiveTasks((current) =>
          current.map((task) => {
            const fresh = freshTasks.find((item) => item?.id === task.id)
            if (!fresh) return task
            if (
              fresh.file_url === task.file_url &&
              fresh.video_url === task.video_url &&
              fresh.first_frame_url === task.first_frame_url &&
              fresh.last_frame_url === task.last_frame_url
            ) {
              return task
            }
            return { ...task, ...fresh }
          })
        )
      }
    )
    return () => {
      cancelled = true
    }
  }, [activeTasks, setActiveTasks])

  useEffect(() => {
    const resync = () => {
      const inflight = activeTasks.filter(
        (task) => !terminalStatuses.has(task.status)
      )
      const succeededMissingMedia = activeTasks.filter(
        (task) => task.status === 'succeeded' && isMissingMedia(task)
      )
      const seen = new Set<string>()
      const toFetch = [...inflight, ...succeededMissingMedia].filter((task) => {
        if (seen.has(task.id)) return false
        seen.add(task.id)
        return true
      })
      if (toFetch.length === 0) return
      void Promise.all(
        toFetch.map(async (task) => {
          try {
            return await getVideoGeneration(task.id)
          } catch {
            return task
          }
        })
      ).then((freshTasks) => {
        setActiveTasks((current) =>
          current.map((task) => {
            const fresh = freshTasks.find((item) => item.id === task.id)
            if (!fresh) return task
            if (
              fresh.status === task.status &&
              fresh.file_url === task.file_url &&
              fresh.video_url === task.video_url &&
              fresh.first_frame_url === task.first_frame_url
            ) {
              return task
            }
            notifyTerminalTransition(task, fresh)
            return fresh
          })
        )
      })
    }
    window.addEventListener(VIDEO_TASK_RESYNC_EVENT, resync)
    return () => window.removeEventListener(VIDEO_TASK_RESYNC_EVENT, resync)
  }, [activeTasks, setActiveTasks])
}
