import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { BackgroundMusicAdmin } from '@/pages/admin/background-music'

export const Route = createFileRoute('/_authenticated/(admin)/background-music-admin')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: BackgroundMusicAdminPage,
})

function BackgroundMusicAdminPage() {
  return (
    <ConfigurationPage>
      <BackgroundMusicAdmin />
    </ConfigurationPage>
  )
}
