import { createFileRoute } from '@tanstack/react-router'
import { PublishPage } from '@/pages/workbench/publish'

export const Route = createFileRoute('/_authenticated/(workbench)/publish')({
  component: PublishPage,
})
