import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  listTenantJoinRequests,
  updateTenantJoinSettings,
  type Tenant,
} from '@/services/api/tenantApi'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

type JoinApprovalSettingsProps = {
  tenant: Tenant | undefined
  enabled: boolean
}

/** 企业设置内仅保留开关；待审核列表在「团队成员 → 待审核」Tab（不进侧栏）。 */
export const JoinApprovalSettings = ({
  tenant,
  enabled,
}: JoinApprovalSettingsProps) => {
  const queryClient = useQueryClient()
  const updateTenant = useAuthStore((state) => state.auth.updateTenant)
  const joinApprovalRequired = Boolean(tenant?.join_approval_required)

  const requestsQuery = useQuery({
    queryKey: ['tenant-join-requests', tenant?.public_id, 'pending'],
    queryFn: () => listTenantJoinRequests('pending'),
    enabled: enabled && Boolean(tenant?.public_id),
  })

  const settingsMutation = useMutation({
    mutationFn: updateTenantJoinSettings,
    onSuccess: (updated) => {
      updateTenant(updated)
      queryClient.setQueryData(['current-tenant', updated.public_id], updated)
      void queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success(
        updated.join_approval_required
          ? '已开启加入审核：新成员需审核通过后才能加入'
          : '已关闭加入审核：邀请链接可直接加入'
      )
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '更新加入审核设置失败')),
  })

  const pendingCount = requestsQuery.data?.length ?? 0

  return (
    <section className='max-w-3xl space-y-5 border-t pt-6'>
      <div className='flex items-center justify-between gap-4 rounded-md border px-4 py-3'>
        <div className='space-y-1'>
          <Label htmlFor='join-approval-required'>加入企业需要审核</Label>
          <p className='text-muted-foreground text-xs'>
            {joinApprovalRequired
              ? '当前：需审核通过后才能成为企业成员'
              : '当前：受邀用户可直接加入'}
          </p>
        </div>
        <Switch
          id='join-approval-required'
          checked={joinApprovalRequired}
          disabled={!enabled || settingsMutation.isPending}
          onCheckedChange={(checked) => settingsMutation.mutate(checked)}
        />
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3'>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>待审核申请</p>
          <p className='text-muted-foreground text-xs'>
            {requestsQuery.isFetching ? (
              <span className='inline-flex items-center gap-1'>
                <Loader2 className='size-3 animate-spin' />
                加载中…
              </span>
            ) : (
              `当前 ${pendingCount} 条待处理`
            )}
          </p>
        </div>
        <Button variant='outline' size='sm' asChild disabled={!enabled}>
          <Link to='/organization-team' search={{ tab: 'join-requests' }}>
            <ClipboardCheck className='size-4' />
            去团队成员处理
          </Link>
        </Button>
      </div>
    </section>
  )
}
