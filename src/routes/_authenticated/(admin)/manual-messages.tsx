import { createFileRoute, redirect } from '@tanstack/react-router'
import { ManualMessagesAdmin } from '@/pages/admin/manual-messages'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'

export const Route = createFileRoute('/_authenticated/(admin)/manual-messages')(
  {
    beforeLoad: () => {
      if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
        throw redirect({ to: '/403' })
      }
    },
    component: ManualMessagesAdminPage,
  }
)

function ManualMessagesAdminPage() {
  return (
    <ConfigurationPage>
      <ManualMessagesAdmin />
    </ConfigurationPage>
  )
}
