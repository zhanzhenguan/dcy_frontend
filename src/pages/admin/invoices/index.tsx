import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  getAdminInvoiceApplication,
  issueAdminInvoice,
  listAdminInvoiceApplications,
  rejectAdminInvoiceApplication,
  uploadAdminInvoiceAsset,
  type AdminInvoiceApplication,
  type AdminInvoiceApplicationDetail,
} from '@/services/api/adminInvoiceApi'
import { invoiceTypeLabels } from '@/services/api/invoiceApi'
import { InvoiceStatusBadge } from '@/pages/account/invoices/components/InvoiceStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ThemeSwitch } from '@/components/common'
import { Header } from '@/components/layout/header'
import { ContentPage } from '@/components/layout/PageShell'
import { ProfileDropdown } from '@/components/business'

const pageSize = 20
const FILTER_ALL = 'all'

type Filters = {
  applicationNo: string
  tenantPublicId: string
  status: string
}

const emptyFilters: Filters = {
  applicationNo: '',
  tenantPublicId: '',
  status: '',
}

export const AdminInvoicesPage = () => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters)
  const [detail, setDetail] = useState<AdminInvoiceApplicationDetail | null>(
    null
  )
  const [rejectTarget, setRejectTarget] =
    useState<AdminInvoiceApplication | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [issueTarget, setIssueTarget] =
    useState<AdminInvoiceApplication | null>(null)
  const [issueForm, setIssueForm] = useState({
    invoice_number: '',
    invoice_code: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    pdf_file_url: '',
    pdf_file_name: '',
    ofd_file_url: '',
    ofd_file_name: '',
  })
  const [uploadingKind, setUploadingKind] = useState<'pdf' | 'ofd' | null>(null)

  const listQuery = useQuery({
    queryKey: ['admin-invoices', page, appliedFilters],
    queryFn: () =>
      listAdminInvoiceApplications({
        page,
        page_size: pageSize,
        application_no: appliedFilters.applicationNo || undefined,
        tenant_public_id: appliedFilters.tenantPublicId || undefined,
        status: appliedFilters.status || undefined,
      }),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-invoices'] })
  }

  const detailMutation = useMutation({
    mutationFn: (applicationNo: string) =>
      getAdminInvoiceApplication(applicationNo),
    onSuccess: (data) => setDetail(data),
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '加载详情失败')),
  })

  const rejectMutation = useMutation({
    mutationFn: () =>
      rejectAdminInvoiceApplication(
        rejectTarget!.application_no,
        rejectReason.trim()
      ),
    onSuccess: async () => {
      toast.success('已驳回开票申请')
      setRejectTarget(null)
      setRejectReason('')
      await invalidate()
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '驳回失败')),
  })

  const issueMutation = useMutation({
    mutationFn: () =>
      issueAdminInvoice(issueTarget!.application_no, {
        invoice_number: issueForm.invoice_number.trim(),
        invoice_code: issueForm.invoice_code.trim() || undefined,
        invoice_date: issueForm.invoice_date,
        total_amount: issueTarget?.amount,
        pdf_file_url: issueForm.pdf_file_url.trim() || undefined,
        ofd_file_url: issueForm.ofd_file_url.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success('已完成人工开票')
      setIssueTarget(null)
      await invalidate()
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '开票失败')),
  })

  const hasInvoiceFile =
    !!issueForm.pdf_file_url.trim() || !!issueForm.ofd_file_url.trim()
  const canConfirmIssue =
    !!issueForm.invoice_number.trim() &&
    !!issueForm.invoice_date &&
    hasInvoiceFile &&
    uploadingKind === null &&
    !issueMutation.isPending

  const uploadInvoiceFile = async (kind: 'pdf' | 'ofd', file: File) => {
    const error = validateInvoiceUploadFile(kind, file)
    if (error) {
      toast.error(error)
      return
    }
    setUploadingKind(kind)
    try {
      const asset = await uploadAdminInvoiceAsset(file, kind)
      setIssueForm((current) =>
        kind === 'pdf'
          ? {
              ...current,
              pdf_file_url: asset.url,
              pdf_file_name: file.name,
            }
          : {
              ...current,
              ofd_file_url: asset.url,
              ofd_file_name: file.name,
            }
      )
      toast.success(`${kind.toUpperCase()} 已上传`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, '上传失败'))
    } finally {
      setUploadingKind(null)
    }
  }

  const totalPages = Math.max(
    1,
    Math.ceil((listQuery.data?.total ?? 0) / pageSize)
  )

  const applyFilters = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setAppliedFilters({
      applicationNo: filters.applicationNo.trim(),
      tenantPublicId: filters.tenantPublicId.trim(),
      status: filters.status,
    })
  }

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <FileText className='text-primary size-5 shrink-0' />
          <span className='truncate font-medium'>发票管理</span>
        </div>
        <div className='ms-auto flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            title='刷新'
            disabled={listQuery.isFetching}
            onClick={() => void listQuery.refetch()}
          >
            <RefreshCw
              className={listQuery.isFetching ? 'animate-spin' : ''}
            />
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <ContentPage
        title='发票管理'
        actions={<Badge variant='secondary'>全平台视图</Badge>}
      >
        <form className='mb-4 grid gap-3 md:grid-cols-4' onSubmit={applyFilters}>
          <Input
            placeholder='申请单号'
            value={filters.applicationNo}
            onChange={(e) =>
              setFilters((c) => ({ ...c, applicationNo: e.target.value }))
            }
          />
          <Input
            placeholder='租户公开 ID'
            value={filters.tenantPublicId}
            onChange={(e) =>
              setFilters((c) => ({ ...c, tenantPublicId: e.target.value }))
            }
          />
          <Select
            value={filters.status || FILTER_ALL}
            onValueChange={(value) =>
              setFilters((c) => ({
                ...c,
                status: value === FILTER_ALL ? '' : value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder='全部状态' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>全部状态</SelectItem>
              <SelectItem value='PENDING_REVIEW'>待审核</SelectItem>
              <SelectItem value='INVOICING'>开票中</SelectItem>
              <SelectItem value='ISSUED'>已开具</SelectItem>
              <SelectItem value='REJECTED'>已驳回</SelectItem>
            </SelectContent>
          </Select>
          <div className='flex gap-2'>
            <Button type='submit'>查询</Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                setFilters(emptyFilters)
                setAppliedFilters(emptyFilters)
                setPage(1)
              }}
            >
              重置
            </Button>
          </div>
        </form>

        {listQuery.isLoading ? (
          <div className='text-muted-foreground flex min-h-64 items-center justify-center gap-2 text-sm'>
            <Loader2 className='animate-spin' />
            加载中…
          </div>
        ) : listQuery.isError ? (
          <div className='text-destructive text-sm'>
            {getApiErrorMessage(listQuery.error)}
          </div>
        ) : (
          <>
            <div className='overflow-x-auto rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='ps-4'>申请单号</TableHead>
                    <TableHead>租户</TableHead>
                    <TableHead>抬头</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>申请时间</TableHead>
                    <TableHead className='pe-4'>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(listQuery.data?.items ?? []).map((item) => (
                    <TableRow key={item.application_no}>
                      <TableCell className='ps-4 font-mono text-xs'>
                        {item.application_no}
                      </TableCell>
                      <TableCell>
                        <div className='text-sm'>{item.tenant_name}</div>
                        <div className='text-muted-foreground font-mono text-xs'>
                          {item.tenant_public_id}
                        </div>
                      </TableCell>
                      <TableCell className='max-w-[160px] truncate text-sm'>
                        {item.title_name}
                      </TableCell>
                      <TableCell>
                        {formatMoney(item.amount)}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className='text-muted-foreground text-sm'>
                        {formatDateTime(item.applied_at)}
                      </TableCell>
                      <TableCell className='pe-4'>
                        <div className='flex flex-wrap gap-1'>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() =>
                              detailMutation.mutate(item.application_no)
                            }
                          >
                            详情
                          </Button>
                          {(item.status === 'PENDING_REVIEW' ||
                            item.status === 'INVOICING') && (
                            <>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => {
                                  setIssueTarget(item)
                                  setIssueForm({
                                    invoice_number: '',
                                    invoice_code: '',
                                    invoice_date: new Date()
                                      .toISOString()
                                      .slice(0, 10),
                                    pdf_file_url: '',
                                    pdf_file_name: '',
                                    ofd_file_url: '',
                                    ofd_file_name: '',
                                  })
                                }}
                              >
                                开票
                              </Button>
                              <Button
                                size='sm'
                                variant='destructive'
                                onClick={() => {
                                  setRejectTarget(item)
                                  setRejectReason('')
                                }}
                              >
                                驳回
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className='mt-4 flex items-center justify-end gap-3'>
              <span className='text-muted-foreground text-sm'>
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant='outline'
                size='icon'
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant='outline'
                size='icon'
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </>
        )}
      </ContentPage>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle className='flex flex-wrap items-center gap-2'>
              开票申请详情
              {detail ? <InvoiceStatusBadge status={detail.status} /> : null}
            </DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className='grid gap-4 text-sm'>
              <Card className='gap-0 py-0 shadow-none'>
                <CardHeader className='border-b px-5 py-3'>
                  <CardTitle className='text-sm font-medium'>申请信息</CardTitle>
                </CardHeader>
                <CardContent className='px-5 py-4'>
                  <dl className='grid grid-cols-[5.5rem_1fr] items-start gap-x-4 gap-y-3 sm:grid-cols-[5.5rem_1fr_5.5rem_1fr] sm:gap-x-6'>
                  <DetailRow label='申请单号' value={detail.application_no} mono />
                  <DetailRow
                    label='申请时间'
                    value={formatDateTime(detail.applied_at)}
                  />
                  <DetailRow
                    label='申请人'
                    value={detail.operator_name || '—'}
                  />
                  <DetailRow label='租户' value={detail.tenant_name || '—'} />
                  <DetailRow
                    label='租户 ID'
                    value={detail.tenant_public_id || '—'}
                    mono
                  />
                  <DetailRow
                    label='类型'
                    value={
                      invoiceTypeLabels[
                        detail.invoice_type as keyof typeof invoiceTypeLabels
                      ] ?? detail.invoice_type
                    }
                  />
                  <DetailRow label='金额' value={formatMoney(detail.amount)} />
                  <DetailRow
                    label='发票号码'
                    value={detail.invoice_number || '—'}
                    mono
                  />
                  <DetailRow
                    label='发票代码'
                    value={detail.invoice_code || '—'}
                    mono
                  />
                  <DetailRow
                    label='开具时间'
                    value={formatDateTime(detail.issued_at)}
                  />
                  {detail.remark ? (
                    <DetailRow
                      fullWidth
                      label='备注'
                      value={detail.remark}
                    />
                  ) : null}
                  {detail.reject_reason ? (
                    <DetailRow
                      fullWidth
                      label='驳回原因'
                      value={detail.reject_reason}
                    />
                  ) : null}
                  </dl>
                </CardContent>
              </Card>

              <Card className='gap-0 py-0 shadow-none'>
                <CardHeader className='border-b px-5 py-3'>
                  <CardTitle className='text-sm font-medium'>抬头信息</CardTitle>
                </CardHeader>
                <CardContent className='px-5 py-4'>
                  <dl className='grid grid-cols-[5.5rem_1fr] items-start gap-x-4 gap-y-3 sm:grid-cols-[5.5rem_1fr_5.5rem_1fr] sm:gap-x-6'>
                  <DetailRow label='抬头' value={detail.title_name || '—'} />
                  <DetailRow label='税号' value={detail.tax_id || '—'} mono />
                  <DetailRow label='邮箱' value={detail.email || '—'} />
                  <DetailRow label='电话' value={detail.phone || '—'} />
                  <DetailRow
                    fullWidth
                    label='地址'
                    value={detail.address || '—'}
                  />
                  <DetailRow label='开户行' value={detail.bank_name || '—'} />
                  <DetailRow
                    label='账号'
                    value={detail.bank_account || '—'}
                    mono
                  />
                  </dl>
                </CardContent>
              </Card>

              <Card className='gap-0 py-0 shadow-none'>
                <CardHeader className='border-b px-5 py-3'>
                  <div className='flex flex-wrap items-center gap-3'>
                    <CardTitle className='text-sm font-medium'>发票文件</CardTitle>
                    {detail.pdf_file_url?.trim() ? (
                      <Button
                        variant='outline'
                        size='sm'
                        className='gap-1.5'
                        asChild
                      >
                        <a
                          href={detail.pdf_file_url}
                          target='_blank'
                          rel='noopener noreferrer'
                        >
                          <Download className='size-4' />
                          下载 PDF
                        </a>
                      </Button>
                    ) : null}
                    {detail.ofd_file_url?.trim() ? (
                      <Button
                        variant='outline'
                        size='sm'
                        className='gap-1.5'
                        asChild
                      >
                        <a
                          href={detail.ofd_file_url}
                          target='_blank'
                          rel='noopener noreferrer'
                        >
                          <Download className='size-4' />
                          下载 OFD
                        </a>
                      </Button>
                    ) : null}
                    {!detail.pdf_file_url?.trim() &&
                    !detail.ofd_file_url?.trim() ? (
                      <span className='text-muted-foreground text-sm font-normal'>
                        暂无发票文件
                      </span>
                    ) : null}
                  </div>
                </CardHeader>
              </Card>

              <Card className='gap-0 py-0 shadow-none'>
                <CardHeader className='border-b px-5 py-3'>
                  <CardTitle className='text-sm font-medium'>关联订单</CardTitle>
                </CardHeader>
                <CardContent className='px-5 py-4'>
                  {detail.orders?.length ? (
                    <div className='overflow-hidden rounded-md border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className='ps-3'>订单号</TableHead>
                            <TableHead>支付时间</TableHead>
                            <TableHead className='pe-3 text-end'>金额</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.orders.map((order) => (
                            <TableRow key={order.order_no}>
                              <TableCell className='ps-3 font-mono text-xs'>
                                {order.order_no}
                              </TableCell>
                              <TableCell className='text-muted-foreground text-xs'>
                                {formatDateTime(order.paid_at)}
                              </TableCell>
                              <TableCell className='pe-3 text-end tabular-nums'>
                                {formatMoney(order.invoice_amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className='text-muted-foreground'>暂无关联订单</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>驳回开票申请</DialogTitle>
          </DialogHeader>
          <div className='space-y-2'>
            <Label>驳回原因</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setRejectTarget(null)}>
              取消
            </Button>
            <Button
              variant='destructive'
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => rejectMutation.mutate()}
            >
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!issueTarget}
        onOpenChange={(open) => !open && setIssueTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>人工开票</DialogTitle>
          </DialogHeader>
          <div className='grid gap-3'>
            <div className='space-y-1.5'>
              <Label>发票号码 *</Label>
              <Input
                value={issueForm.invoice_number}
                onChange={(e) =>
                  setIssueForm((c) => ({
                    ...c,
                    invoice_number: e.target.value,
                  }))
                }
              />
            </div>
            <div className='space-y-1.5'>
              <Label>发票代码</Label>
              <Input
                value={issueForm.invoice_code}
                onChange={(e) =>
                  setIssueForm((c) => ({ ...c, invoice_code: e.target.value }))
                }
              />
            </div>
            <div className='space-y-1.5'>
              <Label>开票日期 *</Label>
              <Input
                type='date'
                value={issueForm.invoice_date}
                onChange={(e) =>
                  setIssueForm((c) => ({ ...c, invoice_date: e.target.value }))
                }
              />
            </div>
            <div className='space-y-1.5'>
              <Label>PDF 发票文件</Label>
              <InvoiceFileUpload
                accept='.pdf,application/pdf'
                formatHint='仅支持 .pdf'
                fileName={issueForm.pdf_file_name}
                fileUrl={issueForm.pdf_file_url}
                uploading={uploadingKind === 'pdf'}
                disabled={uploadingKind !== null || issueMutation.isPending}
                onSelect={(file) => void uploadInvoiceFile('pdf', file)}
                onUrlChange={(url) =>
                  setIssueForm((c) => ({
                    ...c,
                    pdf_file_url: url,
                    pdf_file_name: url ? c.pdf_file_name : '',
                  }))
                }
                onClear={() =>
                  setIssueForm((c) => ({
                    ...c,
                    pdf_file_url: '',
                    pdf_file_name: '',
                  }))
                }
              />
            </div>
            <div className='space-y-1.5'>
              <Label>OFD 发票文件</Label>
              <InvoiceFileUpload
                accept='.ofd'
                formatHint='仅支持 .ofd'
                fileName={issueForm.ofd_file_name}
                fileUrl={issueForm.ofd_file_url}
                uploading={uploadingKind === 'ofd'}
                disabled={uploadingKind !== null || issueMutation.isPending}
                onSelect={(file) => void uploadInvoiceFile('ofd', file)}
                onUrlChange={(url) =>
                  setIssueForm((c) => ({
                    ...c,
                    ofd_file_url: url,
                    ofd_file_name: url ? c.ofd_file_name : '',
                  }))
                }
                onClear={() =>
                  setIssueForm((c) => ({
                    ...c,
                    ofd_file_url: '',
                    ofd_file_name: '',
                  }))
                }
              />
              <p className='text-muted-foreground text-xs'>
                * PDF / OFD 至少提供一份：本地上传或粘贴文件地址均可
              </p>
            </div>
            {issueTarget ? (
              <p className='text-muted-foreground text-xs'>
                开票金额：{formatMoney(issueTarget.amount)}（取自申请金额）
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIssueTarget(null)}>
              取消
            </Button>
            <Button
              disabled={!canConfirmIssue}
              onClick={() => {
                if (!issueForm.invoice_number.trim()) {
                  toast.error('请填写发票号码')
                  return
                }
                if (!issueForm.invoice_date) {
                  toast.error('请选择开票日期')
                  return
                }
                if (!hasInvoiceFile) {
                  toast.error('请至少上传或填写一份发票文件（PDF 或 OFD）')
                  return
                }
                issueMutation.mutate()
              }}
            >
              确认开票
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function validateInvoiceUploadFile(
  kind: 'pdf' | 'ofd',
  file: File
): string | null {
  const name = file.name.trim().toLowerCase()
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
  const mime = (file.type || '').toLowerCase()

  if (kind === 'pdf') {
    if (ext !== 'pdf') return '本地上传仅支持 PDF 格式（.pdf）'
    if (mime && mime !== 'application/pdf') {
      return '本地上传仅支持 PDF 格式（.pdf）'
    }
  } else {
    if (ext !== 'ofd') return '本地上传仅支持 OFD 格式（.ofd）'
    if (
      mime &&
      mime !== 'application/ofd' &&
      mime !== 'application/octet-stream'
    ) {
      return '本地上传仅支持 OFD 格式（.ofd）'
    }
  }

  if (file.size <= 0) return '文件内容为空'
  if (file.size > 20 * 1024 * 1024) return '文件大小不能超过 20MB'
  return null
}

function InvoiceFileUpload({
  formatHint,
  fileName,
  fileUrl,
  uploading,
  disabled,
  onUrlChange,
  onClear,
}: {
  accept: string
  formatHint: string
  fileName: string
  fileUrl: string
  uploading: boolean
  disabled: boolean
  onSelect: (file: File) => void
  onUrlChange: (url: string) => void
  onClear: () => void
}) {
  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
      <Input
          className='min-w-0 flex-1'
          value={fileUrl}
          disabled={disabled}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder='或粘贴文件地址 https://...'
        />
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='shrink-0'
          disabled={disabled}
          asChild
        >
          <label className='cursor-pointer'>
            
            {uploading ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Upload className='size-4' />
            )}
            {uploading ? '上传中…' : '本地上传'}
            
          </label>
        </Button>
        {fileUrl ? (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-8 shrink-0'
            disabled={disabled}
            onClick={onClear}
            title='清除'
          >
            <X className='size-4' />
          </Button>
        ) : null}
      </div>
      {fileName ? (
        <p className='text-muted-foreground truncate text-xs' title={fileName}>
          已选：{fileName}
        </p>
      ) : (
        <p className='text-muted-foreground text-xs'>
          {formatHint}；也可直接填写文件地址（≤20MB）
        </p>
      )}
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
  fullWidth,
}: {
  label: string
  value: string
  mono?: boolean
  fullWidth?: boolean
}) {
  return (
    <>
      <dt className='text-muted-foreground shrink-0 text-left leading-5'>
        {label}
      </dt>
      <dd
        className={`min-w-0 text-left leading-5 ${
          fullWidth ? 'sm:col-span-3' : ''
        } ${
          mono
            ? 'font-mono text-xs break-all'
            : 'break-words'
        }`}
      >
        {value}
      </dd>
    </>
  )
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

function formatDateTime(value: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
