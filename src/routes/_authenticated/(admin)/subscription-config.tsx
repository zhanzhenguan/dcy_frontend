import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { SubscriptionConfiguration } from '@/pages/admin/subscription-config'

export const Route = createFileRoute('/_authenticated/(admin)/subscription-config')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: SubscriptionConfigurationPage,
})

function SubscriptionConfigurationPage() {
  return (
    <ConfigurationPage>
      <SubscriptionConfiguration />
    </ConfigurationPage>
  )
}
