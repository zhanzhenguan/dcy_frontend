import { createFileRoute } from '@tanstack/react-router'
import { OrganizationSettingsPage } from '@/pages/organization/settings'

export const Route = createFileRoute('/_authenticated/(organization)/organization-settings')({
  component: OrganizationSettingsPage,
})
