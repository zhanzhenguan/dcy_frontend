import { createFileRoute } from '@tanstack/react-router'
import { InvoiceRecordDetailPage } from '@/pages/account/invoices/detail'

// 使用 invoices_ 扁平路由，避免挂在 /invoices 子路由下（父页无 Outlet 导致无法跳转）
export const Route = createFileRoute(
  '/_authenticated/(account)/invoices_/$invoiceId'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { invoiceId } = Route.useParams()
  return <InvoiceRecordDetailPage invoiceId={invoiceId} />
}
