import { invoiceStatusLabels } from '@/services/api/invoiceApi'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/utils'
import type { InvoiceStatusBadgeProps } from '../types'

const successStatuses = new Set(['ISSUED', 'SENT'])
const dangerStatuses = new Set([
  'REJECTED',
  'FAILED',
  'CANCELLED',
  'VOIDED',
  'RED_FLUSHED',
])

const statusBadgeClass = (status: string) => {
  if (successStatuses.has(status)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
  }
  if (dangerStatuses.has(status)) {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
}

export const InvoiceStatusBadge = ({
  status,
  className,
}: InvoiceStatusBadgeProps) => (
  <Badge variant='outline' className={cn(statusBadgeClass(status), className)}>
    {invoiceStatusLabels[status] ?? status}
  </Badge>
)
