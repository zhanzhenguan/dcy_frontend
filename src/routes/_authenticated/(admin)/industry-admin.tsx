import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { IndustryAdmin } from '@/pages/admin/industry'

export const Route = createFileRoute('/_authenticated/(admin)/industry-admin')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: IndustryAdminPage,
})

function IndustryAdminPage() {
  return (
    <ConfigurationPage>
      <IndustryAdmin />
    </ConfigurationPage>
  )
}
