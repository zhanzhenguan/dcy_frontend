import { createFileRoute } from '@tanstack/react-router'
import { TermsPage } from '@/pages/portal/terms'

export const Route = createFileRoute('/(portal)/terms')({
  component: TermsPage,
})
