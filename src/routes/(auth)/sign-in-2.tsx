import { createFileRoute, redirect } from '@tanstack/react-router'
import { hasActiveSession } from '@/stores/authStore'
import { SignIn2 } from '@/pages/auth/sign-in/SignIn2'

export const Route = createFileRoute('/(auth)/sign-in-2')({
  beforeLoad: () => {
    if (hasActiveSession()) throw redirect({ to: '/dashboard' })
  },
  component: SignIn2,
})
