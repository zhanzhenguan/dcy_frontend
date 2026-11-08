import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminInvoicesPage } from '@/pages/admin/invoices'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'

export const Route = createFileRoute('/_authenticated/(admin)/admin-invoices')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: AdminInvoicesPage,
})
