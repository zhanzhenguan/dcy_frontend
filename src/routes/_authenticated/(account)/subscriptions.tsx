import { createFileRoute } from '@tanstack/react-router'
import { SubscriptionsPage } from '@/pages/account/subscriptions'

export const Route = createFileRoute('/_authenticated/(account)/subscriptions')({
  component: SubscriptionsPage,
})
