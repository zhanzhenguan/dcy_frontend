import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { PromptConfiguration } from '@/pages/admin/prompt-config'

export const Route = createFileRoute('/_authenticated/(admin)/prompt-config')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: PromptConfigurationPage,
})

function PromptConfigurationPage() {
  return (
    <ConfigurationPage>
      <PromptConfiguration />
    </ConfigurationPage>
  )
}
