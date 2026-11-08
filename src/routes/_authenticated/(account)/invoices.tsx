import { createFileRoute } from '@tanstack/react-router'
import { InvoicesPage } from '@/pages/account/invoices'

export const Route = createFileRoute('/_authenticated/(account)/invoices')({
  component: InvoicesPage,
})
