import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'
import { VideoLanguageAdmin } from '@/pages/admin/video-language'

export const Route = createFileRoute('/_authenticated/(admin)/video-language-admin')({
  beforeLoad: () => {
    if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
      throw redirect({ to: '/403' })
    }
  },
  component: VideoLanguageAdminPage,
})

function VideoLanguageAdminPage() {
  return (
    <ConfigurationPage>
      <VideoLanguageAdmin />
    </ConfigurationPage>
  )
}
