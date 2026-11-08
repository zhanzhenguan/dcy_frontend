import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/AuthLayout'

export const Route = createFileRoute('/clerk/_authenticated')({
  component: AuthenticatedLayout,
})
