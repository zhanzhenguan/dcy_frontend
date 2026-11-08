import { createFileRoute } from '@tanstack/react-router'
import { MyCouponsPage } from '@/pages/account/coupons'

export const Route = createFileRoute('/_authenticated/(account)/coupons')({
  component: MyCouponsPage,
})
