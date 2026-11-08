import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { InspirationAdmin } from '@/pages/admin/inspiration'

export const Route = createFileRoute('/_authenticated/(admin)/inspiration-admin')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: InspirationAdminPage,
})

function InspirationAdminPage() {
  return (
    <ConfigurationPage>
      <InspirationAdmin />
    </ConfigurationPage>
  )
}
