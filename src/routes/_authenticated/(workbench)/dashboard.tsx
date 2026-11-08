import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '@/pages/workbench/dashboard'

export const Route = createFileRoute('/_authenticated/(workbench)/dashboard')({
  component: Dashboard,
})
