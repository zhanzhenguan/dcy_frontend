import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import { isEnterpriseTenant, normalizeTenantType } from '@/utils/tenantAccess'
import { listTenants, switchTenant } from '@/services/api/tenantApi'
import { useAuthStore } from '@/stores/authStore'

/** 租户列表 + 切换（逻辑与原先 ProfileDropdown 一致） */
export function useTenantSwitch() {
  const queryClient = useQueryClient()
  const auth = useAuthStore((state) => state.auth)
  const session = auth.session

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants,
    staleTime: 30 * 1000,
  })

  const switchMutation = useMutation({
    mutationFn: async (tenantPublicId: string) => {
      const data = await switchTenant(tenantPublicId)
      auth.switchTenant(data)
      // 切换后由 layout 的 useSyncTenantCredits 按新租户同步积分，避免竞态清零
      return data
    },
    onSuccess: () => {
      queryClient.clear()
      window.location.assign('/dashboard')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '切换租户失败')),
  })

  const tenants = tenantsQuery.data ?? []
  const enterpriseTenants = tenants.filter((tenant) =>
    isEnterpriseTenant(tenant)
  )
  const personalTenant = tenants.find(
    (tenant) => normalizeTenantType(tenant.tenant_type) === 'PERSONAL'
  )

  const selectTenant = (tenantPublicId: string) => {
    if (tenantPublicId === session?.tenant?.public_id) return
    switchMutation.mutate(tenantPublicId)
  }

  return {
    session,
    tenantsQuery,
    switchMutation,
    enterpriseTenants,
    personalTenant,
    selectTenant,
    isEnterprise: isEnterpriseTenant(session?.tenant),
  }
}

export function formatTenantRoleLabel(
  role: string | undefined,
  isEnterprise: boolean
) {
  if (!isEnterprise) return '个人用户'
  switch ((role ?? '').toLowerCase()) {
    case 'owner':
    case 'manager':
      return '企业管理员'
    case 'leader':
      return '组长'
    case 'member':
      return '成员'
    default:
      return '成员'
  }
}
