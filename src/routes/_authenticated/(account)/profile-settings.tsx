import { createFileRoute } from '@tanstack/react-router'
import { ProfileSettingsPage } from '@/pages/account/profile-settings'

export const Route = createFileRoute('/_authenticated/(account)/profile-settings')({
  component: ProfileSettingsPage,
})
