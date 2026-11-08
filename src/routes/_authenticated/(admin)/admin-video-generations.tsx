import { createFileRoute, redirect } from '@tanstack/react-router'
import { VideoGenerationAdmin } from '@/pages/admin/video-generations'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import { ConfigurationPage } from '@/components/layout/ConfPage'

export const Route = createFileRoute('/_authenticated/(admin)/admin-video-generations')(
  {
    beforeLoad: () => {
      if (!isSuperAdmin(useAuthStore.getState().auth.user)) {
        throw redirect({ to: '/403' })
      }
    },
    component: VideoGenerationAdminPage,
  }
)

function VideoGenerationAdminPage() {
  return (
    <ConfigurationPage>
      <VideoGenerationAdmin />
    </ConfigurationPage>
  )
}
