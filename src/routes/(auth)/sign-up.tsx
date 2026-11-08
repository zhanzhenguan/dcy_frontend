import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { hasActiveSession } from '@/stores/authStore'
import { SignUp } from '@/pages/auth/sign-up'

const searchSchema = z.object({
  redirect: z.string().optional(),
  ref: z.string().trim().min(1).optional(),
})

export const Route = createFileRoute('/(auth)/sign-up')({
  beforeLoad: () => {
    if (hasActiveSession()) throw redirect({ to: '/dashboard' })
  },
  component: SignUp,
  validateSearch: searchSchema,
})
