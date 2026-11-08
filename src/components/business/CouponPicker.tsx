import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Ticket } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  quoteOrderCoupon,
  type OrderCouponPurchaseType,
} from '@/services/api/orderApi'

type CouponPickerProps = {
  open: boolean
  purchaseType: OrderCouponPurchaseType
  purchaseId: string
  value: string | null
  onChange: (couponId: string | null) => void
  onPayableAmountChange?: (amount: number | null) => void
}

export function CouponPicker({
  open,
  purchaseType,
  purchaseId,
  value,
  onChange,
  onPayableAmountChange,
}: CouponPickerProps) {
  const quoteQuery = useQuery({
    queryKey: ['order-coupon-quote', purchaseType, purchaseId, value],
    queryFn: () =>
      quoteOrderCoupon({
        purchase_type: purchaseType,
        purchase_id: purchaseId,
        coupon_id: value,
      }),
    enabled: open && Boolean(purchaseId),
  })

  useEffect(() => {
    onPayableAmountChange?.(quoteQuery.data?.payable_amount ?? null)
  }, [onPayableAmountChange, quoteQuery.data?.payable_amount])

  const quote = quoteQuery.data
  const coupons = quote?.available_coupons ?? []
  const loading = quoteQuery.isLoading
  const unavailable = !loading && (quoteQuery.isError || coupons.length === 0)

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2 text-sm font-medium'>
        <Ticket className='text-primary size-4' />
        优惠券
        {loading ? (
          <Loader2 className='text-muted-foreground size-3 animate-spin' />
        ) : null}
      </div>
      <Select
        value={value ?? 'none'}
        onValueChange={(next) => onChange(next === 'none' ? null : next)}
        disabled={loading || unavailable}
      >
        <SelectTrigger className='w-full'>
          <SelectValue
            placeholder={loading ? '正在加载可用优惠券' : '暂无可用优惠券'}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='none'>不使用优惠券</SelectItem>
          {coupons.map((coupon) => (
            <SelectItem key={coupon.coupon_id} value={coupon.coupon_id}>
              {coupon.template_name}（优惠 ¥
              {(coupon.discount_amount / 100).toFixed(2)}）
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {quoteQuery.isError ? (
        <p className='text-muted-foreground text-xs'>
          优惠券暂时不可用，请稍后重试
        </p>
      ) : unavailable ? (
        <p className='text-muted-foreground text-xs'>当前商品暂无可用优惠券</p>
      ) : null}
      {value && quote && quote.discount_amount > 0 ? (
        <p className='text-muted-foreground text-xs'>
          已优惠 ¥{(quote.discount_amount / 100).toFixed(2)}，优惠后应付 ¥
          {(quote.payable_amount / 100).toFixed(2)}
        </p>
      ) : null}
    </div>
  )
}
