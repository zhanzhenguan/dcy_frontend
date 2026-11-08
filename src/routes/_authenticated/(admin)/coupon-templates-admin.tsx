import { createFileRoute, redirect } from '@tanstack/react-router'
import { CouponTemplatesAdminPage } from '@/pages/admin/coupon-templates'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'

export const Route = createFileRoute(
  '/_authenticated/(admin)/coupon-templates-admin'
)({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user))
      throw redirect({ to: '/403' })
  },
  component: () => (
    <ConfigurationPage>
      <CouponTemplatesAdminPage />
    </ConfigurationPage>
  ),
})
