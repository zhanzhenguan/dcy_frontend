import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  approveTenantJoinRequest,
  listTenantJoinRequests,
  rejectTenantJoinRequest,
} from '@/services/api/tenantApi'
import { useAuthStore } from '@/stores/authStore'
import { isCurrentEnterpriseOwner } from '@/utils/tenantAccess'
import { Button } from '@/components/ui/button'

/** 团队成员页「待审核」Tab 内容；仅企业 Owner 可操作。 */
export const OrganizationJoinRequestsPanel = () => {
  const queryClient = useQueryClient()
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const canAccess = isCurrentEnterpriseOwner(tenant)

  const requestsQuery = useQuery({
    queryKey: ['tenant-join-requests', tenant?.public_id, 'pending'],
    queryFn: () => listTenantJoinRequests('pending'),
    enabled: canAccess && Boolean(tenant?.public_id),
  })

  const approveMutation = useMutation({
    mutationFn: approveTenantJoinRequest,
    onSuccess: () => {
      toast.success('已通过加入申请')
      void queryClient.invalidateQueries({ queryKey: ['tenant-join-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['tenant-members'] })
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '通过加入申请失败')),
  })

  const rejectMutation = useMutation({
    mutationFn: (requestPublicId: string) =>
      rejectTenantJoinRequest(requestPublicId),
    onSuccess: () => {
      toast.success('已拒绝加入申请')
      void queryClient.invalidateQueries({ queryKey: ['tenant-join-requests'] })
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '拒绝加入申请失败')),
  })

  const busy = approveMutation.isPending || rejectMutation.isPending
  const requests = requestsQuery.data ?? []

  if (!canAccess) {
    return (
      <div className='border-destructive/30 bg-destructive/5 text-destructive border px-5 py-4 text-sm'>
        加入审核仅对当前企业的 Owner 开放。
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between gap-2'>
        <div>
          <h2 className='text-sm font-medium'>待审核申请</h2>
          <p className='text-muted-foreground mt-0.5 text-xs'>
            审核通过后申请人将成为企业成员；开关可在企业设置中调整。
          </p>
        </div>
        {requestsQuery.isFetching ? (
          <Loader2 className='text-muted-foreground size-4 animate-spin' />
        ) : (
          <span className='text-muted-foreground text-xs'>
            {requests.length} 条
          </span>
        )}
      </div>

      {requestsQuery.isError ? (
        <p className='text-destructive text-sm'>
          审核列表加载失败：{getApiErrorMessage(requestsQuery.error)}
        </p>
      ) : null}

      {!requestsQuery.isLoading && requests.length === 0 ? (
        <p className='text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm'>
          暂无待审核的加入申请
        </p>
      ) : null}

      <div className='space-y-2'>
        {requests.map((item) => (
          <article
            key={item.public_id}
            className='flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-3'
          >
            <div className='flex min-w-0 items-center gap-3'>
              <div className='bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border'>
                {item.applicant.avatar_url ? (
                  <img
                    src={item.applicant.avatar_url}
                    alt=''
                    className='size-full object-cover'
                  />
                ) : (
                  <span className='text-muted-foreground text-xs'>
                    {(item.applicant.nickname || '?').slice(0, 1)}
                  </span>
                )}
              </div>
              <div className='min-w-0'>
                <p className='truncate text-sm font-medium'>
                  {item.applicant.nickname || '未命名用户'}
                </p>
                <p className='text-muted-foreground truncate text-xs'>
                  {item.applicant.email || '未绑定账号'} · 角色 {item.role.name}
                  {' · '}
                  {new Date(item.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
            <div className='flex shrink-0 gap-2'>
              <Button
                size='sm'
                variant='outline'
                disabled={busy}
                onClick={() => rejectMutation.mutate(item.public_id)}
              >
                <X className='size-4' />
                拒绝
              </Button>
              <Button
                size='sm'
                disabled={busy}
                onClick={() => approveMutation.mutate(item.public_id)}
              >
                <Check className='size-4' />
                通过
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
