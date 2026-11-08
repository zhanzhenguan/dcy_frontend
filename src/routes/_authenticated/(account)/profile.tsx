import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/pages/account/profile'

export const Route = createFileRoute('/_authenticated/(account)/profile')({
  component: ProfilePage,
})
