import { Link } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import {
  invoiceTypeLabels,
  type InvoiceRecord,
} from '@/services/api/invoiceApi'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'

export function createInvoiceRecordsColumns(
  isPersonal: boolean
): ColumnDef<InvoiceRecord>[] {
  return [
    {
      accessorKey: 'applied_at',
      header: '申请时间',
      cell: ({ row }) => (
        <span className='text-muted-foreground text-sm'>
          {formatDateTime(row.getValue('applied_at'))}
        </span>
      ),
      meta: {
        thClassName: 'ps-4',
        tdClassName: 'ps-4',
      },
    },
    {
      accessorKey: 'title_name',
      header: isPersonal ? '抬头姓名' : '发票抬头',
      cell: ({ row }) => (
        <span className='max-w-[200px] truncate font-medium'>
          {row.getValue('title_name')}
        </span>
      ),
    },
    {
      accessorKey: 'invoice_type',
      header: '发票类型',
      cell: ({ row }) => (
        <span className='text-muted-foreground text-sm'>
          {invoiceTypeLabels[row.original.invoice_type]}
        </span>
      ),
    },
    {
      accessorKey: 'invoice_number',
      header: '发票号码',
      cell: ({ row }) => (
        <span className='font-mono text-xs'>
          {row.original.invoice_number ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: '发票金额(元)',
      cell: ({ row }) => (
        <span className='font-medium tabular-nums'>
          {formatAmount(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: () => <span className='pe-4 block text-end'>操作</span>,
      cell: ({ row }) => (
        <div className='pe-4 text-end'>
          <Link
            to='/invoices/$invoiceId'
            params={{ invoiceId: row.original.id }}
            className='text-primary text-sm font-medium hover:underline'
          >
            查看详情
          </Link>
        </div>
      ),
      meta: {
        thClassName: 'pe-4 text-end',
        tdClassName: 'pe-4 text-end',
      },
    },
  ]
}

function formatAmount(cents: number) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
