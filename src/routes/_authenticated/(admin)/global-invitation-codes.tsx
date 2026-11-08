import { createFileRoute, redirect } from '@tanstack/react-router'
import { GlobalInvitationCodesAdmin } from '@/pages/admin/global-invitation-codes'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'

export const Route = createFileRoute('/_authenticated/(admin)/global-invitation-codes')(
  {
    beforeLoad: () => {
      if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
        throw redirect({ to: '/403' })
      }
    },
    component: GlobalInvitationCodesPage,
  }
)

function GlobalInvitationCodesPage() {
  return (
    <ConfigurationPage>
      <GlobalInvitationCodesAdmin />
    </ConfigurationPage>
  )
}
