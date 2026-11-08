import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { UserAdmin } from '@/pages/admin/users'

export const Route = createFileRoute('/_authenticated/(admin)/user-admin')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: UserAdminPage,
})

function UserAdminPage() {
  return (
    <ConfigurationPage>
      <UserAdmin />
    </ConfigurationPage>
  )
}
