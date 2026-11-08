import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  getInvoiceRecord,
  listInvoiceTitles,
  type InvoiceScope,
} from '@/services/api/invoiceApi'
import { useSessionTenant } from '@/hooks/useSessionTenant'
import { Button } from '@/components/ui/button'
import { AccountBillingShell } from '@/pages/account/components/AccountBillingShell'
import { CancelInvoiceDialog } from './components/CancelInvoiceDialog'
import { InvoiceRecordDetailCard } from './components/InvoiceRecordDetailCard'
import { ResubmitInvoiceDialog } from './components/ResubmitInvoiceDialog'
import type { InvoiceRecordDetailPageProps } from './types'

export const InvoiceRecordDetailPage = ({
  invoiceId,
}: InvoiceRecordDetailPageProps) => {
  const queryClient = useQueryClient()
  const { tenant, isPersonal } = useSessionTenant()
  const invoiceScope: InvoiceScope = isPersonal ? 'PERSONAL' : 'ENTERPRISE'
  const [resubmitOpen, setResubmitOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const detailQuery = useQuery({
    queryKey: ['invoice-record', invoiceId],
    queryFn: () => getInvoiceRecord(invoiceId),
    enabled: !!invoiceId,
  })

  const titlesQuery = useQuery({
    queryKey: [
      'invoice-titles',
      tenant?.public_id,
      isPersonal ? 'session' : 'ENTERPRISE',
    ],
    queryFn: () =>
      listInvoiceTitles(isPersonal ? undefined : 'ENTERPRISE'),
    enabled: detailQuery.data?.status === 'REJECTED',
  })

  const detail = detailQuery.data
  const isProcessing = detail?.status === 'PROCESSING'
  const isRejected = detail?.status === 'REJECTED'
  const isCancelled = detail?.status === 'CANCELLED'

  const invalidateInvoiceQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ['invoice-record', invoiceId] })
    void queryClient.invalidateQueries({ queryKey: ['invoice-records'] })
    void queryClient.invalidateQueries({ queryKey: ['invoice-summary'] })
  }

  return (
    <AccountBillingShell active='invoices'>
      <div className='space-y-6'>
        <div className='flex items-center justify-between gap-3'>
          <Button variant='ghost' size='sm' className='-ms-2 gap-1.5' asChild>
            <Link to='/invoices'>
              <ArrowLeft className='size-4' />
              返回开票记录
            </Link>
          </Button>
          {isProcessing ? (
            <Button
              size='sm'
              variant='outline'
              onClick={() => setCancelOpen(true)}
            >
              取消申请
            </Button>
          ) : null}
          {isRejected ? (
            <Button size='sm' onClick={() => setResubmitOpen(true)}>
              重新提交
            </Button>
          ) : null}
          {isCancelled ? (
            <Button size='sm' asChild>
              <Link to='/invoices'>重新开票</Link>
            </Button>
          ) : null}
        </div>

        {detailQuery.isLoading ? (
          <div className='text-muted-foreground flex min-h-48 items-center justify-center gap-2 text-sm'>
            <Loader2 className='animate-spin' />
            加载中...
          </div>
        ) : detailQuery.isError ? (
          <div className='border-destructive/40 bg-destructive/5 text-destructive border px-4 py-3 text-sm'>
            加载失败：{getApiErrorMessage(detailQuery.error)}
          </div>
        ) : detail ? (
          <>
            <InvoiceRecordDetailCard detail={detail} />

            {isRejected ? (
              <ResubmitInvoiceDialog
                open={resubmitOpen}
                onOpenChange={setResubmitOpen}
                detail={detail}
                titles={titlesQuery.data?.items ?? []}
                scope={invoiceScope}
                onSuccess={invalidateInvoiceQueries}
              />
            ) : null}

            <CancelInvoiceDialog
              open={cancelOpen}
              onOpenChange={setCancelOpen}
              applicationNo={detail.id}
              scope={invoiceScope}
              onSuccess={invalidateInvoiceQueries}
            />
          </>
        ) : null}
      </div>
    </AccountBillingShell>
  )
}
