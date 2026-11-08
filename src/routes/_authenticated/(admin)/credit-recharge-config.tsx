import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { CreditRechargeConfiguration } from '@/pages/admin/credit-recharge-config'

export const Route = createFileRoute('/_authenticated/(admin)/credit-recharge-config')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: CreditRechargeConfigurationPage,
})

function CreditRechargeConfigurationPage() {
  return (
    <ConfigurationPage>
      <CreditRechargeConfiguration />
    </ConfigurationPage>
  )
}
