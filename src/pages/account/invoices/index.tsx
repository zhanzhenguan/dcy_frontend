import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
} from '@tanstack/react-table'
import {
  FileText,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  deleteInvoiceTitle,
  getInvoiceSummary,
  listInvoiceRecords,
  listInvoiceTitles,
  type InvoiceRecord,
  type InvoiceScope,
  type InvoiceTitle,
} from '@/services/api/invoiceApi'
import {
  canViewInvoiceManagement,
  findPersonalTenantInList,
  isEnterpriseManagerRole,
  isEnterpriseOwnerInContext,
  normalizeTenantRole,
  normalizeTenantType,
} from '@/utils/tenantAccess'
import { Input } from '@/components/ui/input'
import { AddTitleDialog } from './components/AddTitleDialog'
import { ApplyInvoiceDialog } from './components/ApplyInvoiceDialog'
import { createInvoiceRecordsColumns } from './components/InvoiceRecordsColumns'
import { createInvoiceTitlesColumns } from './components/InvoiceTitlesColumns'
import { InvoiceSectionTabs } from './components/InvoiceSectionTabs'
import type { InvoiceSectionTab } from './types'
import { AccountBillingShell } from '@/pages/account/components/AccountBillingShell'
import { DataTable } from '@/components/common'
import { useSessionTenant } from '@/hooks/useSessionTenant'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { useTenantSwitch } from '@/hooks/useTenantSwitch'

const defaultPageSize = 10
const emptyTitles: InvoiceTitle[] = []
const emptyRecords: InvoiceRecord[] = []

export const InvoicesPage = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.auth.user)
  const { tenant, sessionTenant, isPersonal, tenantsQuery } = useSessionTenant()
  const { selectTenant, switchMutation, isEnterprise } = useTenantSwitch()
  const tenants = tenantsQuery.data
  const activeType = normalizeTenantType(
    tenant?.tenant_type ?? sessionTenant?.tenant_type
  )
  const activeRole = normalizeTenantRole(tenant?.role ?? sessionTenant?.role)
  const listPersonalTenant = findPersonalTenantInList(tenants)
  const invoiceScope: InvoiceScope = isPersonal ? 'PERSONAL' : 'ENTERPRISE'
  const hasEnterpriseInList = tenants?.some(
    (item) =>
      normalizeTenantType(item.tenant_type) === 'ENTERPRISE' &&
      isEnterpriseManagerRole(item.role)
  )
  const allowTitleScopeChoice = isPersonal && hasEnterpriseInList
  const [titleSearch, setTitleSearch] = useState('')
  const access = canViewInvoiceManagement(
    user,
    sessionTenant,
    tenantsQuery.data,
    tenantsQuery.isLoading && !tenantsQuery.data
  )
  const allowed =
    access === true ||
    (access === null &&
      !isPersonal &&
      isEnterpriseOwnerInContext(sessionTenant, tenant, tenantsQuery.data))
  const [page, setPage] = useState(1)
  const [recordsPageSize, setRecordsPageSize] = useState(defaultPageSize)
  const [titleDialogOpen, setTitleDialogOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState<InvoiceTitle | null>(null)
  const [deletingTitle, setDeletingTitle] = useState<InvoiceTitle | null>(null)
  const [applyOpen, setApplyOpen] = useState(false)
  const [activeSection, setActiveSection] =
    useState<InvoiceSectionTab>('records')
  const [titlesPagination, setTitlesPagination] = useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  })

  const summaryQuery = useQuery({
    queryKey: ['invoice-summary', tenant?.public_id, invoiceScope],
    queryFn: () => getInvoiceSummary(invoiceScope),
    enabled: allowed,
  })
  const recordsQuery = useQuery({
    queryKey: [
      'invoice-records',
      tenant?.public_id,
      invoiceScope,
      page,
      recordsPageSize,
    ],
    queryFn: () =>
      listInvoiceRecords({
        page,
        page_size: recordsPageSize,
        scope: invoiceScope,
      }),
    enabled: allowed,
  })
  const titlesQuery = useQuery({
    queryKey: [
      'invoice-titles',
      tenant?.public_id,
      isPersonal ? 'session' : 'ENTERPRISE',
    ],
    queryFn: () =>
      listInvoiceTitles(isPersonal ? undefined : 'ENTERPRISE'),
    enabled: allowed,
  })

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['invoice-summary'] })
    void queryClient.invalidateQueries({ queryKey: ['invoice-records'] })
    void queryClient.invalidateQueries({ queryKey: ['invoice-titles'] })
  }

  const isFetching =
    summaryQuery.isFetching ||
    recordsQuery.isFetching ||
    titlesQuery.isFetching

  const titles = useMemo(
    () => titlesQuery.data?.items ?? emptyTitles,
    [titlesQuery.data?.items]
  )
  const filteredTitles = useMemo(() => {
    const keyword = titleSearch.trim().toLowerCase()
    if (!keyword) return titles
    return titles.filter((item) =>
      item.company_name.toLowerCase().includes(keyword)
    )
  }, [titles, titleSearch])
  const summary = summaryQuery.data

  const recordsItems = useMemo(
    () => recordsQuery.data?.items ?? emptyRecords,
    [recordsQuery.data?.items]
  )
  const recordsColumns = useMemo(
    () => createInvoiceRecordsColumns(isPersonal),
    [isPersonal]
  )
  const titlesColumns = useMemo(
    () =>
      createInvoiceTitlesColumns({
        onEdit: (title) => {
          setEditingTitle(title)
          setTitleDialogOpen(true)
        },
        onDelete: setDeletingTitle,
      }),
    []
  )
  const recordsPageCount = Math.max(
    1,
    Math.ceil((recordsQuery.data?.total ?? 0) / recordsPageSize)
  )
  const recordsTable = useReactTable({
    data: recordsItems,
    columns: recordsColumns,
    pageCount: recordsPageCount,
    enableSorting: false,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize: recordsPageSize,
      },
    },
    manualPagination: true,
    onPaginationChange: (updater) => {
      const current: PaginationState = {
        pageIndex: page - 1,
        pageSize: recordsPageSize,
      }
      const next =
        typeof updater === 'function' ? updater(current) : updater
      if (next.pageIndex !== current.pageIndex) {
        setPage(next.pageIndex + 1)
      }
      if (next.pageSize !== current.pageSize) {
        setRecordsPageSize(next.pageSize)
        setPage(1)
      }
    },
    getCoreRowModel: getCoreRowModel(),
  })

  useEffect(() => {
    setTitlesPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }, [titleSearch])

  const deleteTitleMutation = useMutation({
    mutationFn: (title: InvoiceTitle) =>
      deleteInvoiceTitle(title.id, title.scope ?? invoiceScope),
    onSuccess: () => {
      toast.success('发票抬头已删除')
      setDeletingTitle(null)
      invalidateAll()
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '删除抬头失败')),
  })

  const titlesTable = useReactTable({
    data: filteredTitles,
    columns: titlesColumns,
    enableSorting: false,
    state: { pagination: titlesPagination },
    onPaginationChange: setTitlesPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <>
      <AccountBillingShell
        active='invoices'
        headerActions={
          <Button
            variant='ghost'
            size='icon'
            title='刷新'
            disabled={!allowed || isFetching}
            onClick={() => invalidateAll()}
          >
            <RefreshCw className={isFetching ? 'animate-spin' : ''} />
          </Button>
        }
      >
        {!allowed ? (
          access === null ? (
            <div className='text-muted-foreground flex min-h-64 items-center justify-center gap-2 text-sm'>
              <Loader2 className='size-4 animate-spin' />
              正在校验权限...
            </div>
          ) : (
            <div className='flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center text-sm'>
              <p className='text-muted-foreground'>
                {isPersonal
                  ? '当前账号无法查看发票管理'
                  : '仅企业 owner 可查看发票管理'}
              </p>
              <p className='text-muted-foreground/80 text-xs'>
                当前工作空间：
                {isEnterprise
                  ? tenant?.company_name?.trim() || '企业租户'
                  : '个人用户'}
                · {activeType || '未知类型'}
                {activeRole ? ` · ${activeRole}` : ''}
              </p>
              {!isPersonal && listPersonalTenant ? (
                <Button
                  variant='outline'
                  size='sm'
                  disabled={switchMutation.isPending}
                  onClick={() => selectTenant(listPersonalTenant.public_id)}
                >
                  {switchMutation.isPending
                    ? '切换中...'
                    : '切换到个人工作空间查看我的发票'}
                </Button>
              ) : null}
            </div>
          )
        ) : (
          <div className='space-y-6'>
            <InvoiceSectionTabs
              active={activeSection}
              onChange={setActiveSection}
            />
            {activeSection === 'records' ? (
              <div className='flex justify-end'>
                <Button className='gap-1.5' onClick={() => setApplyOpen(true)}>
                  <Receipt className='size-4' />
                  申请开票
                </Button>
              </div>
            ) : null}

            {activeSection === 'records' ? (
              <div className='space-y-6'>
                {summaryQuery.isLoading ? (
                  <SummarySkeleton />
                ) : summary ? (
                  <div className='grid gap-4 sm:grid-cols-3'>
                    <SummaryCard
                      icon={Wallet}
                      label='可开票金额'
                      value={formatMoney(summary.available_amount)}
                    />
                    <SummaryCard
                      icon={Receipt}
                      label='已消耗金额'
                      value={formatMoney(summary.consumed_amount)}
                    />
                    <SummaryCard
                      icon={FileText}
                      label='已开票金额'
                      value={formatMoney(summary.invoiced_amount)}
                    />
                  </div>
                ) : null}

                {recordsQuery.isLoading ? (
                  <LoadingState />
                ) : recordsQuery.isError ? (
                  <ErrorState error={recordsQuery.error} />
                ) : recordsQuery.data?.items.length ? (
                  <DataTable
                    table={recordsTable}
                    emptyMessage='暂无开票记录'
                  />
                ) : (
                  <EmptyState message='暂无开票记录' />
                )}
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='relative max-w-md flex-1'>
                    <Search
                      className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2'
                      aria-hidden
                    />
                    <Input
                      value={titleSearch}
                      onChange={(event) => setTitleSearch(event.target.value)}
                      placeholder='搜索抬头名称'
                      className='ps-9'
                    />
                  </div>
                  <Button
                    className='gap-1.5 shrink-0'
                    onClick={() => {
                      setEditingTitle(null)
                      setTitleDialogOpen(true)
                    }}
                  >
                    <Plus className='size-4' />
                    新增抬头
                  </Button>
                </div>

                {titlesQuery.isLoading ? (
                  <LoadingState />
                ) : titlesQuery.isError ? (
                  <ErrorState error={titlesQuery.error} />
                ) : filteredTitles.length ? (
                  <DataTable
                    table={titlesTable}
                    emptyMessage='暂无发票抬头'
                  />
                ) : titles.length ? (
                  <EmptyState message='没有匹配的抬头' />
                ) : (
                  <EmptyState message='暂无发票抬头，请先新增抬头' />
                )}
              </div>
            )}
          </div>
        )}
      </AccountBillingShell>

      <AddTitleDialog
        open={titleDialogOpen}
        onOpenChange={(open) => {
          setTitleDialogOpen(open)
          if (!open) setEditingTitle(null)
        }}
        onSuccess={invalidateAll}
        defaultScope={invoiceScope}
        allowScopeChoice={allowTitleScopeChoice}
        title={editingTitle}
      />
      <Dialog
        open={Boolean(deletingTitle)}
        onOpenChange={(open) => {
          if (!open && !deleteTitleMutation.isPending) {
            setDeletingTitle(null)
          }
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>删除发票抬头</DialogTitle>
            <DialogDescription>
              {deletingTitle?.is_default
                ? `确定删除默认抬头「${deletingTitle.company_name}」吗？删除后无法恢复。`
                : `确定删除抬头「${deletingTitle?.company_name ?? ''}」吗？删除后无法恢复。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={deleteTitleMutation.isPending}
              onClick={() => setDeletingTitle(null)}
            >
              取消
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={deleteTitleMutation.isPending}
              onClick={() => {
                if (deletingTitle) deleteTitleMutation.mutate(deletingTitle)
              }}
            >
              {deleteTitleMutation.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ApplyInvoiceDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        titles={titles}
        availableAmount={summary?.available_amount ?? 0}
        scope={invoiceScope}
        onSuccess={() => {
          setPage(1)
          invalidateAll()
        }}
      />
    </>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet
  label: string
  value: string
}) {
  return (
    <Card className='border-border/60 shadow-sm'>
      <CardContent className='flex items-center gap-4 p-5'>
        <div className='bg-muted flex size-11 shrink-0 items-center justify-center rounded-xl'>
          <Icon className='text-muted-foreground size-5' />
        </div>
        <div className='min-w-0'>
          <p className='text-muted-foreground text-sm'>{label}</p>
          <p className='mt-1 text-2xl font-semibold tracking-tight tabular-nums'>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function SummarySkeleton() {
  return (
    <div className='grid gap-4 sm:grid-cols-3'>
      {[1, 2, 3].map((i) => (
        <Card key={i} className='border-border/60'>
          <CardContent className='flex h-[88px] items-center justify-center p-5'>
            <Loader2 className='text-muted-foreground size-5 animate-spin' />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function LoadingState() {
  return (
    <div className='text-muted-foreground flex min-h-48 items-center justify-center gap-2 text-sm'>
      <Loader2 className='animate-spin' />
      加载中...
    </div>
  )
}

function ErrorState({ error }: { error: unknown }) {
  return (
    <div className='border-destructive/40 bg-destructive/5 text-destructive border px-4 py-3 text-sm'>
      加载失败：{getApiErrorMessage(error)}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className='text-muted-foreground flex min-h-48 items-center justify-center text-sm'>
      {message}
    </div>
  )
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}
