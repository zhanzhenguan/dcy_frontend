import { createFileRoute, redirect } from '@tanstack/react-router'
import { TenantEntitlements } from '@/pages/admin/tenant-entitlements'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'

export const Route = createFileRoute('/_authenticated/(admin)/tenant-entitlements')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: TenantEntitlementsPage,
})

function TenantEntitlementsPage() {
  return (
    <ConfigurationPage>
      <TenantEntitlements />
    </ConfigurationPage>
  )
}
