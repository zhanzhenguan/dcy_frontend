import { createFileRoute, redirect } from '@tanstack/react-router'
import { hasActiveSession } from '@/stores/authStore'
import { AuthenticatedLayout } from '@/components/layout/AuthLayout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!hasActiveSession()) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})
