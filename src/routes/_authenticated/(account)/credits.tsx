import { createFileRoute } from '@tanstack/react-router'
import { CreditsPage } from '@/pages/account/credits'

export const Route = createFileRoute('/_authenticated/(account)/credits')({
  component: CreditsPage,
})
