import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminTenantsPage } from '@/pages/admin/tenants'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'

export const Route = createFileRoute('/_authenticated/(admin)/admin-tenants')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: AdminTenantsRoutePage,
})

function AdminTenantsRoutePage() {
  return (
    <ConfigurationPage>
      <AdminTenantsPage />
    </ConfigurationPage>
  )
}
