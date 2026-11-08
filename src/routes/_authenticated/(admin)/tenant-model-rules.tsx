import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { TenantModelRulesAdmin } from '@/pages/admin/tenant-model-rules'

export const Route = createFileRoute(
  '/_authenticated/(admin)/tenant-model-rules'
)({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: TenantModelRulesPage,
})

function TenantModelRulesPage() {
  return (
    <ConfigurationPage>
      <TenantModelRulesAdmin />
    </ConfigurationPage>
  )
}
