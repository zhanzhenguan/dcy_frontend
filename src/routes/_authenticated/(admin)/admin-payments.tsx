import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminPaymentsPage } from '@/pages/account/orders/AdminPayments'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'

export const Route = createFileRoute('/_authenticated/(admin)/admin-payments')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: AdminPaymentsPage,
})
