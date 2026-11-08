import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { DeliveryPlatformAdmin } from '@/pages/admin/delivery-platform'

export const Route = createFileRoute('/_authenticated/(admin)/delivery-platform-admin')(
  {
    beforeLoad: () => {
      if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
        throw redirect({ to: '/403' })
      }
    },
    component: DeliveryPlatformAdminPage,
  }
)

function DeliveryPlatformAdminPage() {
  return (
    <ConfigurationPage>
      <DeliveryPlatformAdmin />
    </ConfigurationPage>
  )
}
