import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { hasActiveSession } from '@/stores/authStore'
import { SignIn } from '@/pages/auth/sign-in'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  beforeLoad: () => {
    if (hasActiveSession()) throw redirect({ to: '/dashboard' })
  },
  component: SignIn,
  validateSearch: searchSchema,
})
