import { createFileRoute, redirect } from '@tanstack/react-router'
import { MarketingCampaignsAdmin } from '@/pages/admin/marketing-campaigns'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'

const MarketingCampaignsAdminPage = () => {
  return (
    <ConfigurationPage>
      <MarketingCampaignsAdmin />
    </ConfigurationPage>
  )
}

export const Route = createFileRoute(
  '/_authenticated/(admin)/marketing-campaigns-admin'
)({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: MarketingCampaignsAdminPage,
})
