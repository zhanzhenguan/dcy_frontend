import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { ModelConfiguration } from '@/pages/admin/model-config'

export const Route = createFileRoute('/_authenticated/(admin)/model-config')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: ModelConfigurationPage,
})

function ModelConfigurationPage() {
  return (
    <ConfigurationPage>
      <ModelConfiguration />
    </ConfigurationPage>
  )
}
