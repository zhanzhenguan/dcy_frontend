import { createFileRoute } from '@tanstack/react-router'
import { InspirationPage } from '@/pages/workbench/inspiration'

export const Route = createFileRoute('/_authenticated/(workbench)/inspiration')({
  component: InspirationPage,
})
