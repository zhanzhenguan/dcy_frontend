import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Info, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  listInvoiceEligibleOrders,
  resubmitInvoice,
  type ResubmitInvoiceInput,
} from '@/services/api/invoiceApi'
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

const keepOriginalTitle = '__keep_original_title__'
const orderPageSize = 10

import type { ResubmitInvoiceDialogProps } from '../types'

export const ResubmitInvoiceDialog = ({
  open,
  onOpenChange,
  detail,
  titles,
  scope,
  onSuccess,
}: ResubmitInvoiceDialogProps) => {
  const [remark, setRemark] = useState('')
  const [titleId, setTitleId] = useState(keepOriginalTitle)
  const [changeOrders, setChangeOrders] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')
  const [appliedOrderSearch, setAppliedOrderSearch] = useState('')
  const [orderPage, setOrderPage] = useState(1)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])

  const applicableTitles = useMemo(() => {
    const filtered =
      scope === 'ENTERPRISE'
        ? titles.filter((item) => (item.scope ?? scope) === 'ENTERPRISE')
        : titles
    return [...filtered].sort((a, b) => {
      if (a.is_default === b.is_default) return 0
      return a.is_default ? -1 : 1
    })
  }, [titles, scope])

  const matchedOriginalTitle = useMemo(
    () =>
      applicableTitles.find(
        (item) => item.company_name === detail.title_name
      ),
    [applicableTitles, detail.title_name]
  )

  /** 列表已能对应原抬头时不再额外插入「沿用原抬头」重复项 */
  const showKeepOriginal = !matchedOriginalTitle

  const defaultTitleId =
    matchedOriginalTitle?.id ??
    (applicableTitles.length === 1
      ? applicableTitles[0].id
      : keepOriginalTitle)

  useEffect(() => {
    if (!open) return
    setRemark('')
    setTitleId(defaultTitleId)
    setChangeOrders(false)
    setOrderSearch('')
    setAppliedOrderSearch('')
    setOrderPage(1)
    setSelectedOrderIds([])
  }, [open, detail.id, defaultTitleId])

  const ordersQuery = useQuery({
    queryKey: [
      'invoice-eligible-orders',
      scope,
      orderPage,
      appliedOrderSearch,
      'resubmit',
    ],
    queryFn: () =>
      listInvoiceEligibleOrders({
        page: orderPage,
        page_size: orderPageSize,
        scope,
        order_no: appliedOrderSearch || undefined,
      }),
    enabled: open && changeOrders,
  })

  const orders = ordersQuery.data?.items ?? []
  const orderTotal = ordersQuery.data?.total ?? 0
  const orderTotalPages = Math.max(1, Math.ceil(orderTotal / orderPageSize))

  const selectedTitle =
    titleId === keepOriginalTitle
      ? undefined
      : applicableTitles.find((item) => item.id === titleId)

  const selectedAmount = useMemo(() => {
    if (!changeOrders) return detail.amount
    return orders
      .filter((item) => selectedOrderIds.includes(item.id) && !item.invoiced)
      .reduce((sum, item) => sum + item.invoice_amount, 0)
  }, [changeOrders, detail.amount, orders, selectedOrderIds])

  const mutation = useMutation({
    mutationFn: (input: ResubmitInvoiceInput) =>
      resubmitInvoice(detail.id, input, scope),
    onSuccess: () => {
      toast.success('已重新提交开票申请')
      onSuccess()
      onOpenChange(false)
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '重新提交失败')),
  })

  const toggleOrder = (orderId: string, checked: boolean) => {
    setSelectedOrderIds((current) => {
      if (checked) return [...current, orderId]
      return current.filter((id) => id !== orderId)
    })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const input: ResubmitInvoiceInput = {}
    const trimmedRemark = remark.trim()
    if (trimmedRemark) input.remark = trimmedRemark

    // 沿用原抬头 / 选中与原抬头同名：不传 title_id，后端刷新快照
    const keepOriginal =
      titleId === keepOriginalTitle ||
      selectedTitle?.company_name === detail.title_name
    if (!keepOriginal) {
      if (!selectedTitle) {
        toast.error('请选择发票抬头')
        return
      }
      input.title_id = titleId
      input.title_scope = selectedTitle.scope ?? scope
    }

    if (changeOrders) {
      if (!selectedOrderIds.length) {
        toast.error('请至少选择一笔可开票订单')
        return
      }
      if (selectedAmount <= 0) {
        toast.error('所选订单无可开票金额')
        return
      }
      input.order_ids = selectedOrderIds
    }

    mutation.mutate(input)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='gap-0 overflow-hidden p-0 sm:max-w-[720px]'>
        <DialogHeader className='border-b px-6 py-4'>
          <DialogTitle className='text-base font-semibold'>
            重新提交开票申请
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit}>
          <div className='space-y-5 px-6 py-5'>
            <div className='bg-primary/8 border-primary/15 flex gap-3 rounded-lg border px-4 py-3'>
              <Info className='text-primary mt-0.5 size-4 shrink-0' />
              <p className='text-muted-foreground text-sm leading-relaxed'>
                将沿用申请单号{' '}
                <span className='font-mono text-foreground'>{detail.id}</span>
                重新进入审核。若仅在「抬头管理」中修改了税号等信息，可不更换抬头，系统会自动刷新快照。
              </p>
            </div>

            <div className='space-y-2'>
              <Label className='text-sm font-normal'>发票抬头</Label>
              <Select value={titleId} onValueChange={setTitleId}>
                <SelectTrigger className='bg-primary/5 border-primary/10 h-10'>
                  <SelectValue placeholder='选择抬头' />
                </SelectTrigger>
                <SelectContent>
                  {showKeepOriginal ? (
                    <SelectItem value={keepOriginalTitle}>
                      沿用原抬头：{detail.title_name}
                    </SelectItem>
                  ) : null}
                  {applicableTitles.map((title) => (
                    <SelectItem key={title.id} value={title.id}>
                      {title.company_name}
                      {title.is_default ? '（默认）' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label className='text-sm font-normal'>备注说明</Label>
              <Input
                className='bg-primary/5 border-primary/10 h-10'
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                placeholder='例如：已按驳回意见修改税号'
              />
            </div>

            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Checkbox
                  id='resubmit-change-orders'
                  checked={changeOrders}
                  onCheckedChange={(checked) =>
                    setChangeOrders(checked === true)
                  }
                />
                <Label
                  htmlFor='resubmit-change-orders'
                  className='text-sm font-normal'
                >
                  更换关联订单（不勾选则沿用原订单）
                </Label>
              </div>

              {changeOrders ? (
                <div className='space-y-3'>
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
                          <TableHead className='w-10 ps-3' />
                          <TableHead>订单号</TableHead>
                          <TableHead>支付时间</TableHead>
                          <TableHead className='pe-3 text-end'>
                            开票金额(元)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ordersQuery.isLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className='text-muted-foreground h-20 text-center text-sm'
                            >
                              <Loader2 className='mx-auto size-4 animate-spin' />
                            </TableCell>
                          </TableRow>
                        ) : orders.length ? (
                          orders.map((order) => {
                            const disabled = order.invoiced
                            return (
                              <TableRow key={order.id}>
                                <TableCell className='ps-3'>
                                  <Checkbox
                                    checked={selectedOrderIds.includes(
                                      order.id
                                    )}
                                    disabled={disabled}
                                    onCheckedChange={(checked) =>
                                      toggleOrder(order.id, checked === true)
                                    }
                                  />
                                </TableCell>
                                <TableCell className='font-mono text-xs'>
                                  {order.order_no}
                                </TableCell>
                                <TableCell className='text-muted-foreground text-sm'>
                                  {formatDateTime(order.paid_at)}
                                </TableCell>
                                <TableCell className='pe-3 text-end tabular-nums'>
                                  {formatAmount(order.invoice_amount)}
                                </TableCell>
                              </TableRow>
                            )
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className='text-muted-foreground h-20 text-center text-sm'
                            >
                              暂无可选订单
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>
                      共 {orderTotal} 条 · 第 {orderPage}/{orderTotalPages} 页
                    </span>
                    <div className='flex gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={orderPage <= 1}
                        onClick={() => setOrderPage((p) => p - 1)}
                      >
                        上一页
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={orderPage >= orderTotalPages}
                        onClick={() => setOrderPage((p) => p + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <p className='text-muted-foreground text-sm'>
              开票金额：
              <span className='text-foreground font-semibold tabular-nums'>
                {formatMoney(selectedAmount)}
              </span>
            </p>
          </div>

          <DialogFooter className='border-t bg-muted/20 px-6 py-4 sm:justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? '提交中...' : '确认重新提交'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function formatAmount(cents: number) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
