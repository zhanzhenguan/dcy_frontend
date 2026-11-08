import { createFileRoute } from '@tanstack/react-router'
import { AccountManagementPage } from '@/pages/workbench/account-management'

export const Route = createFileRoute(
  '/_authenticated/(organization)/account-management'
)({
  component: AccountManagementPage,
})
