import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Info, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  applyInvoice,
  listInvoiceEligibleOrders,
  type ApplyInvoiceInput,
  type InvoiceType,
} from '@/services/api/invoiceApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { cn } from '@/utils/utils'

import type { ApplyInvoiceDialogProps } from '../types'

const orderPageSize = 10

export const ApplyInvoiceDialog = ({
  open,
  onOpenChange,
  titles,
  availableAmount,
  onSuccess,
  scope,
}: ApplyInvoiceDialogProps) => {
  const [titleId, setTitleId] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [appliedOrderSearch, setAppliedOrderSearch] = useState('')
  const [orderPage, setOrderPage] = useState(1)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])

  const applicableTitles = useMemo(() => {
    const filtered =
      scope === 'ENTERPRISE'
        ? titles.filter((item) => (item.scope ?? scope) === 'ENTERPRISE')
        : titles
    // 默认抬头排前面，便于展示与选中
    return [...filtered].sort((a, b) => {
      if (a.is_default === b.is_default) return 0
      return a.is_default ? -1 : 1
    })
  }, [titles, scope])

  const defaultTitleId = useMemo(() => {
    const scopedDefault = applicableTitles.find(
      (item) => item.is_default && (item.scope ?? scope) === scope
    )
    if (scopedDefault) return scopedDefault.id
    const anyDefault = applicableTitles.find((item) => item.is_default)
    if (anyDefault) return anyDefault.id
    return applicableTitles[0]?.id ?? ''
  }, [applicableTitles, scope])

  useEffect(() => {
    if (!open) return
    setTitleId(defaultTitleId)
    setOrderSearch('')
    setAppliedOrderSearch('')
    setOrderPage(1)
    setSelectedOrderIds([])
  }, [open, defaultTitleId])

  const ordersQuery = useQuery({
    queryKey: [
      'invoice-eligible-orders',
      scope,
      orderPage,
      appliedOrderSearch,
    ],
    queryFn: () =>
      listInvoiceEligibleOrders({
        page: orderPage,
        page_size: orderPageSize,
        scope,
        order_no: appliedOrderSearch || undefined,
      }),
    enabled: open,
  })

  const selectedTitle = applicableTitles.find((item) => item.id === titleId)
  const invoiceType: InvoiceType =
    selectedTitle?.default_invoice_type ?? 'VAT_ORDINARY_ELECTRONIC'

  const orders = ordersQuery.data?.items ?? []
  const eligibleOrders = orders.filter((item) => !item.invoiced)
  const orderTotal = ordersQuery.data?.total ?? 0
  const orderTotalPages = Math.max(1, Math.ceil(orderTotal / orderPageSize))

  const selectedAmount = useMemo(() => {
    const allOrders = ordersQuery.data?.items ?? []
    return allOrders
      .filter(
        (item) => selectedOrderIds.includes(item.id) && !item.invoiced
      )
      .reduce((sum, item) => sum + item.invoice_amount, 0)
  }, [ordersQuery.data?.items, selectedOrderIds])

  const mutation = useMutation({
    mutationFn: (input: ApplyInvoiceInput) => applyInvoice(input, scope),
    onSuccess: () => {
      toast.success('开票申请已提交')
      onSuccess()
      onOpenChange(false)
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '申请开票失败')),
  })

  const toggleOrder = (orderId: string, checked: boolean) => {
    setSelectedOrderIds((current) => {
      if (checked) return [...current, orderId]
      return current.filter((id) => id !== orderId)
    })
  }

  const toggleAllEligible = (checked: boolean) => {
    if (!checked) {
      setSelectedOrderIds([])
      return
    }
    setSelectedOrderIds(eligibleOrders.map((item) => item.id))
  }

  const allEligibleSelected =
    eligibleOrders.length > 0 &&
    eligibleOrders.every((item) => selectedOrderIds.includes(item.id))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!titleId) {
      toast.error('请选择发票抬头')
      return
    }
    if (!selectedOrderIds.length) {
      toast.error('请至少选择一笔可开票订单')
      return
    }
    if (selectedAmount <= 0) {
      toast.error('所选订单无可开票金额')
      return
    }
    if (selectedAmount > availableAmount) {
      toast.error('开票金额不能超过可开票金额')
      return
    }

    mutation.mutate({
      title_id: titleId,
      title_scope: selectedTitle?.scope,
      invoice_type: invoiceType,
      amount: selectedAmount,
      order_ids: selectedOrderIds,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='gap-0 overflow-hidden p-0 sm:max-w-[720px]'>
        <DialogHeader className='border-b px-6 py-4'>
          <DialogTitle className='text-base font-semibold'>申请开票</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit}>
          <div className='space-y-5 px-6 py-5'>
            <div className='bg-primary/8 border-primary/15 flex gap-3 rounded-lg border px-4 py-3'>
              <Info className='text-primary mt-0.5 size-4 shrink-0' />
              <p className='text-muted-foreground text-sm leading-relaxed'>
                <span className='text-foreground font-medium'>按量计费</span>
                ，当前最多可开票金额为
                <span className='text-foreground font-semibold tabular-nums'>
                  {formatMoney(availableAmount)}
                </span>
                。系统将根据您勾选的订单计算最终开票金额。
              </p>
            </div>

            <div className='space-y-2'>
              <Label className='text-sm font-normal'>发票抬头</Label>
              {applicableTitles.length ? (
                <Select
                  key={`title-${defaultTitleId}`}
                  value={titleId || undefined}
                  onValueChange={setTitleId}
                >
                  <SelectTrigger className='bg-primary/5 border-primary/10 h-10'>
                    <SelectValue placeholder='请选择发票抬头' />
                  </SelectTrigger>
                  <SelectContent>
                    {applicableTitles.map((title) => (
                      <SelectItem key={title.id} value={title.id}>
                        {title.company_name}
                        {title.is_default ? '（默认）' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className='text-muted-foreground text-sm'>
                  {scope === 'ENTERPRISE'
                    ? '暂无企业抬头，请先新增发票抬头'
                    : '暂无抬头，请先新增个人或企业发票抬头'}
                </p>
              )}
            </div>

            <div className='space-y-3'>
              <Label className='text-sm font-normal'>选择开票订单</Label>
              <div className='relative max-w-sm'>
                <Search
                  className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2'
                  aria-hidden
                />
                <Input
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      setOrderPage(1)
                      setAppliedOrderSearch(orderSearch.trim())
                      setSelectedOrderIds([])
                    }
                  }}
                  placeholder='搜索订单号'
                  className='bg-primary/5 border-primary/10 h-9 ps-9'
                />
              </div>

              <div className='overflow-hidden rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-10 ps-4'>
                        <Checkbox
                          checked={allEligibleSelected}
                          onCheckedChange={(checked) =>
                            toggleAllEligible(checked === true)
                          }
                          disabled={!eligibleOrders.length}
                          aria-label='全选可开票订单'
                        />
                      </TableHead>
                      <TableHead>订单号</TableHead>
                      <TableHead>支付时间</TableHead>
                      <TableHead className='pe-4 text-end'>
                        开票金额(元)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersQuery.isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className='text-muted-foreground h-32 text-center text-sm'
                        >
                          <Loader2 className='mx-auto mb-2 size-5 animate-spin' />
                          加载订单...
                        </TableCell>
                      </TableRow>
                    ) : ordersQuery.isError ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className='text-destructive h-24 text-center text-sm'
                        >
                          {getApiErrorMessage(ordersQuery.error)}
                        </TableCell>
                      </TableRow>
                    ) : orders.length ? (
                      orders.map((item) => {
                        const disabled = item.invoiced
                        const checked = selectedOrderIds.includes(item.id)
                        return (
                          <TableRow
                            key={item.id}
                            className={cn(disabled && 'opacity-50')}
                          >
                            <TableCell className='ps-4'>
                              <Checkbox
                                checked={checked}
                                disabled={disabled}
                                onCheckedChange={(value) =>
                                  toggleOrder(item.id, value === true)
                                }
                                aria-label={`选择订单 ${item.order_no}`}
                              />
                            </TableCell>
                            <TableCell className='font-mono text-xs'>
                              <div className='flex items-center gap-2'>
                                {item.order_no}
                                {item.invoiced ? (
                                  <Badge
                                    variant='secondary'
                                    className='text-[10px]'
                                  >
                                    已开票
                                  </Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className='text-muted-foreground text-sm'>
                              {formatDateTime(item.paid_at)}
                            </TableCell>
                            <TableCell className='pe-4 text-end font-medium tabular-nums'>
                              {formatAmount(item.invoice_amount)}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className='text-muted-foreground h-24 text-center text-sm'
                        >
                          暂无可开票订单
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className='text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs'>
                <span>共 {orderTotal} 条记录</span>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='size-7'
                    disabled={orderPage <= 1 || ordersQuery.isFetching}
                    onClick={() => setOrderPage((page) => page - 1)}
                    aria-label='上一页'
                  >
                    ‹
                  </Button>
                  <span className='tabular-nums'>
                    {orderPage}/{orderTotalPages}
                  </span>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='size-7'
                    disabled={
                      orderPage >= orderTotalPages || ordersQuery.isFetching
                    }
                    onClick={() => setOrderPage((page) => page + 1)}
                    aria-label='下一页'
                  >
                    ›
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className='border-t bg-muted/20 flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm'>
              发票总额：
              <span className='text-foreground text-base font-semibold tabular-nums'>
                {formatMoney(selectedAmount)}
              </span>
            </p>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                disabled={
                  mutation.isPending ||
                  !applicableTitles.length ||
                  !selectedOrderIds.length
                }
              >
                {mutation.isPending ? '提交中...' : '提交申请'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(cents / 100)
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
