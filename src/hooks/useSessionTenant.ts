import { useQuery } from '@tanstack/react-query'
import { listTenants } from '@/services/api/tenantApi'
import { useAuthStore } from '@/stores/authStore'
import {
  isEnterpriseTenant,
  resolveActiveTenant,
  resolveActiveTenantType,
} from '@/utils/tenantAccess'

export function useSessionTenant() {
  const sessionTenant = useAuthStore((state) => state.auth.session?.tenant)
  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants,
    staleTime: 30 * 1000,
  })
  const tenant =
    resolveActiveTenant(sessionTenant, tenantsQuery.data) ?? sessionTenant
  const tenantType = resolveActiveTenantType(sessionTenant, tenantsQuery.data)

  return {
    tenant,
    sessionTenant,
    tenantsQuery,
    tenantType,
    isPersonal: tenantType === 'PERSONAL',
    isEnterprise: tenantType === 'ENTERPRISE' || isEnterpriseTenant(tenant),
  }
}
