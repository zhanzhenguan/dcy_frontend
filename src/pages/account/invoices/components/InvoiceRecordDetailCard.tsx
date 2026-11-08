import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatAmount,
  formatDateTime,
  formatInvoiceType,
} from '../invoiceDetailFormatters'
import { InvoiceDetailField } from './InvoiceDetailField'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import type { InvoiceRecordDetailCardProps } from '../types'

export const InvoiceRecordDetailCard = ({
  detail,
}: InvoiceRecordDetailCardProps) => {
  const orders = detail.orders ?? []
  const pdfUrl = detail.pdf_file_url?.trim() || ''
  const ofdUrl = detail.ofd_file_url?.trim() || ''
  const hasFiles = !!pdfUrl || !!ofdUrl
  const isRejected = detail.status === 'REJECTED'

  return (
    <Card className='gap-0 overflow-hidden py-0'>
      <section className='px-6 py-5'>
        <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
          <h3 className='text-base font-semibold'>开票详情</h3>
          <InvoiceStatusBadge status={detail.status} />
        </div>
        <dl className='grid grid-cols-[6.5rem_1fr] items-start gap-x-4 gap-y-3 sm:grid-cols-[6.5rem_1fr_6.5rem_1fr] sm:gap-x-6'>
          <InvoiceDetailField label='申请单号' value={detail.id} mono />
          <InvoiceDetailField
            label='申请时间'
            value={formatDateTime(detail.applied_at)}
          />
          <InvoiceDetailField
            label='发票类型'
            value={formatInvoiceType(detail.invoice_type)}
          />
          <InvoiceDetailField label='发票抬头' value={detail.title_name} />
          <InvoiceDetailField
            label='纳税人识别号'
            value={detail.tax_id || '—'}
            mono
          />
          <InvoiceDetailField
            label='发票号码'
            value={detail.invoice_number || '—'}
            mono
          />
          <InvoiceDetailField
            label='发票金额(元)'
            value={formatAmount(detail.amount)}
            emphasis
          />
          <InvoiceDetailField label='接收邮箱' value={detail.email || '—'} />
          <InvoiceDetailField
            label='开具时间'
            value={detail.issued_at ? formatDateTime(detail.issued_at) : '—'}
          />
          {isRejected ? (
            <InvoiceDetailField
              label='驳回原因'
              value={detail.reject_reason?.trim() || '—'}
            />
          ) : null}
          {detail.remark ? (
            <InvoiceDetailField fullWidth label='备注' value={detail.remark} />
          ) : null}
        </dl>
      </section>

      <section className='border-border/60 flex flex-wrap items-center gap-3 border-t px-6 py-5'>
        <h3 className='text-base font-semibold'>发票文件</h3>
        {hasFiles ? (
          <div className='flex flex-wrap items-center gap-2'>
            {pdfUrl ? (
              <Button variant='outline' size='sm' className='gap-1.5' asChild>
                <a
                  href={pdfUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  download
                >
                  <Download className='size-4' />
                  下载 PDF
                </a>
              </Button>
            ) : null}
            {ofdUrl ? (
              <Button variant='outline' size='sm' className='gap-1.5' asChild>
                <a
                  href={ofdUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  download
                >
                  <Download className='size-4' />
                  下载 OFD
                </a>
              </Button>
            ) : null}
          </div>
        ) : (
          <p className='text-muted-foreground text-sm'>
            {detail.status === 'ISSUED'
              ? '暂无发票文件'
              : '发票开具后可在此下载 PDF / OFD 文件'}
          </p>
        )}
      </section>

      <section className='border-border/60 border-t px-6 py-5'>
        <h3 className='mb-4 text-base font-semibold'>关联订单</h3>
        {orders.length ? (
          <div className='overflow-hidden rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='ps-4'>订单号</TableHead>
                  <TableHead>支付时间</TableHead>
                  <TableHead className='pe-4 text-end'>开票金额(元)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.order_no}>
                    <TableCell className='ps-4 font-mono text-xs'>
                      {order.order_no}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {order.paid_at ? formatDateTime(order.paid_at) : '—'}
                    </TableCell>
                    <TableCell className='pe-4 text-end font-medium tabular-nums'>
                      {formatAmount(order.invoice_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className='text-muted-foreground text-sm'>暂无关联订单</p>
        )}
      </section>
    </Card>
  )
}
