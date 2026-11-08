import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { DigitalHumanAdmin } from '@/pages/admin/digital-human'

export const Route = createFileRoute('/_authenticated/(admin)/digital-human-admin')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: DigitalHumanAdminPage,
})

function DigitalHumanAdminPage() {
  return (
    <ConfigurationPage>
      <DigitalHumanAdmin />
    </ConfigurationPage>
  )
}
