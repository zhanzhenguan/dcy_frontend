import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { SystemSettingsAdmin } from '@/pages/admin/system-settings'

export const Route = createFileRoute('/_authenticated/(admin)/system-settings-admin')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: SystemSettingsAdminPage,
})

function SystemSettingsAdminPage() {
  return (
    <ConfigurationPage>
      <SystemSettingsAdmin />
    </ConfigurationPage>
  )
}
