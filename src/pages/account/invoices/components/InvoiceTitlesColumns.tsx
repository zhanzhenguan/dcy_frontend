import { type ColumnDef } from '@tanstack/react-table'
import {
  invoiceTypeShortLabels,
  type InvoiceTitle,
} from '@/services/api/invoiceApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { InvoiceTitlesColumnOptions, TitleScopeBadgeProps } from '../types'

export function createInvoiceTitlesColumns(
  options: InvoiceTitlesColumnOptions
): ColumnDef<InvoiceTitle>[] {
  const { onEdit, onDelete } = options

  return [
    {
      accessorKey: 'company_name',
      header: '抬头名称',
      cell: ({ row }) => (
        <div className='flex min-w-0 items-center gap-2'>
          <span className='truncate font-medium'>
            {row.getValue('company_name')}
          </span>
        </div>
      ),
      meta: {
        thClassName: 'ps-4',
        tdClassName: 'ps-4',
      },
    },
    {
      accessorKey: 'scope',
      header: '抬头类型',
      cell: ({ row }) => <TitleScopeBadge scope={row.original.scope} />,
    },
    {
      accessorKey: 'default_invoice_type',
      header: '发票类型',
      cell: ({ row }) => (
        <span className='text-muted-foreground text-sm'>
          {row.original.default_invoice_type
            ? invoiceTypeShortLabels[row.original.default_invoice_type]
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'is_default',
      header: '状态',
      cell: ({ row }) =>
        row.original.is_default ? (
          <Badge
            variant='outline'
            className='border-primary/30 bg-primary/5 text-primary'
          >
            默认
          </Badge>
        ) : (
          <span className='text-muted-foreground'>—</span>
        ),
    },
    {
      accessorKey: 'created_at',
      header: '创建时间',
      cell: ({ row }) => (
        <span className='text-muted-foreground text-sm'>
          {formatDateTime(row.getValue('created_at'))}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className='pe-4 block text-end'>操作</span>,
      cell: ({ row }) => (
        <div className='pe-4 flex justify-end gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='text-primary h-8 px-2'
            onClick={() => onEdit(row.original)}
          >
            编辑
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='text-destructive hover:text-destructive h-8 px-2'
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onDelete(row.original)
            }}
          >
            删除
          </Button>
        </div>
      ),
      meta: {
        thClassName: 'pe-4 text-end',
        tdClassName: 'pe-4 text-end',
      },
    },
  ]
}

export const TitleScopeBadge = ({ scope }: TitleScopeBadgeProps) => {
  if (scope === 'PERSONAL') {
    return <Badge variant='secondary'>个人</Badge>
  }
  if (scope === 'ENTERPRISE') {
    return <Badge variant='outline'>企业</Badge>
  }
  return <span className='text-muted-foreground'>—</span>
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
