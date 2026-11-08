import { createFileRoute } from '@tanstack/react-router'
import { OrdersPage } from '@/pages/account/orders'

export const Route = createFileRoute('/_authenticated/(account)/orders')({
  component: OrdersPage,
})
