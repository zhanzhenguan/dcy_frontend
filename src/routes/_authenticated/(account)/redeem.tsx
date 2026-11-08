import { createFileRoute } from '@tanstack/react-router'
import { RedeemPage } from '@/pages/account/redeem'

export const Route = createFileRoute('/_authenticated/(account)/redeem')({
  component: RedeemPage,
})
