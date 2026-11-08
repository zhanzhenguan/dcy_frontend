import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import {
  creditAccountQueryKey,
  refreshSessionCreditBalance,
} from '@/services/api/creditApi'
import { canViewCreditDetails } from '@/utils/tenantAccess'
import {
  VIDEO_TASK_RESYNC_EVENT,
  VIDEO_TASK_STATUS_EVENT,
  type VideoTaskStatusEventDetail,
} from '@/hooks/useMessageNotifications'

/** 会影响积分冻结/扣费/释放的任务状态；running 不改余额，无需刷账户。 */
const CREDIT_AFFECTING_STATUSES = new Set([
  'queued',
  'succeeded',
  'failed',
  'cancelled',
  'expired',
])

const CREDIT_REFRESH_DEBOUNCE_MS = 800

/**
 * 登录态下按当前租户同步积分：
 * - 个人组织 → 个人积分
 * - 企业租户 → 仅 owner 可拉企业积分（非 owner 不请求接口）
 * - 窗口聚焦 / 视频任务终态时刷新；对状态事件防抖，避免生成时连打 /credit/account
 */
export function useSyncTenantCredits() {
  const queryClient = useQueryClient()
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const tenantId = tenant?.public_id
  const allowed = canViewCreditDetails(tenant)
  const debounceRef = useRef<number | undefined>(undefined)

  const query = useQuery({
    queryKey: creditAccountQueryKey(tenantId),
    queryFn: () => refreshSessionCreditBalance(tenantId),
    enabled: allowed && Boolean(tenantId),
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  useEffect(() => {
    if (!allowed || !tenantId) return

    const scheduleRefresh = () => {
      if (debounceRef.current !== undefined) {
        window.clearTimeout(debounceRef.current)
      }
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = undefined
        void queryClient.invalidateQueries({
          queryKey: creditAccountQueryKey(tenantId),
        })
      }, CREDIT_REFRESH_DEBOUNCE_MS)
    }

    const onStatus = (event: Event) => {
      const detail = (event as CustomEvent<VideoTaskStatusEventDetail>).detail
      if (detail?.status && !CREDIT_AFFECTING_STATUSES.has(detail.status)) {
        return
      }
      scheduleRefresh()
    }

    window.addEventListener(VIDEO_TASK_STATUS_EVENT, onStatus)
    window.addEventListener(VIDEO_TASK_RESYNC_EVENT, scheduleRefresh)
    return () => {
      if (debounceRef.current !== undefined) {
        window.clearTimeout(debounceRef.current)
      }
      window.removeEventListener(VIDEO_TASK_STATUS_EVENT, onStatus)
      window.removeEventListener(VIDEO_TASK_RESYNC_EVENT, scheduleRefresh)
    }
  }, [allowed, tenantId, queryClient])

  return query
}
