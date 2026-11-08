import { createFileRoute } from '@tanstack/react-router'
import { PrivacyPage } from '@/pages/portal/privacy'

export const Route = createFileRoute('/(portal)/privacy')({
  component: PrivacyPage,
})
