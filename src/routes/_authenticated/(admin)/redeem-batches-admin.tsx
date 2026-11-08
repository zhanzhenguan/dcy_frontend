import { createFileRoute, redirect } from '@tanstack/react-router'
import { RedeemBatchesAdminPage } from '@/pages/admin/redeem-batches'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'

export const Route = createFileRoute(
  '/_authenticated/(admin)/redeem-batches-admin'
)({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user))
      throw redirect({ to: '/403' })
  },
  component: () => (
    <ConfigurationPage>
      <RedeemBatchesAdminPage />
    </ConfigurationPage>
  ),
})
