import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { DEMO_PAYMENT_ORDER } from '@/pages/account/payment/demoOrder'
import { OrderPaymentPage } from '@/pages/account/payment'
import type { OrderPaymentInfo } from '@/pages/account/payment/types'
import { useAuthStore } from '@/stores/authStore'

const paymentSearchSchema = z.object({
  orderNo: z.string().optional(),
  productName: z.string().optional(),
  spaceName: z.string().optional(),
  currency: z.string().optional(),
  originalAmount: z.coerce.number().optional(),
  payableAmount: z.coerce.number().optional(),
  discountAmount: z.coerce.number().optional(),
  discountLabel: z.string().optional(),
  expiresInSeconds: z.coerce.number().optional(),
  /** 支付成功后的回调地址（站内路径或 http(s)） */
  callbackUrl: z.string().optional(),
  /** 成功后回跳倒计时秒数 */
  callbackCountdownSeconds: z.coerce.number().optional(),
  /** 传入真实订单号时才会调创建支付流水接口 */
  live: z.coerce.boolean().optional(),
})

export const Route = createFileRoute('/_authenticated/(account)/payment')({
  validateSearch: paymentSearchSchema,
  component: PaymentRoutePage,
})

function PaymentRoutePage() {
  const search = Route.useSearch()
  const tenant = useAuthStore((state) => state.auth.session?.tenant)

  const order: OrderPaymentInfo = {
    ...DEMO_PAYMENT_ORDER,
    orderNo: search.orderNo || DEMO_PAYMENT_ORDER.orderNo,
    productName: search.productName || DEMO_PAYMENT_ORDER.productName,
    spaceName:
      search.spaceName ||
      tenant?.company_name ||
      (tenant?.tenant_type === 'PERSONAL'
        ? '个人空间'
        : DEMO_PAYMENT_ORDER.spaceName),
    currency: search.currency || DEMO_PAYMENT_ORDER.currency,
    originalAmount:
      search.originalAmount ?? DEMO_PAYMENT_ORDER.originalAmount,
    payableAmount: search.payableAmount ?? DEMO_PAYMENT_ORDER.payableAmount,
    discountAmount:
      search.discountAmount ?? DEMO_PAYMENT_ORDER.discountAmount,
    discountLabel: search.discountLabel || DEMO_PAYMENT_ORDER.discountLabel,
    expiresInSeconds:
      search.expiresInSeconds ?? DEMO_PAYMENT_ORDER.expiresInSeconds,
    callbackUrl: search.callbackUrl || DEMO_PAYMENT_ORDER.callbackUrl,
    callbackCountdownSeconds:
      search.callbackCountdownSeconds ??
      DEMO_PAYMENT_ORDER.callbackCountdownSeconds,
  }

  return (
    <OrderPaymentPage
      order={order}
      createAttempt={Boolean(search.live && search.orderNo)}
    />
  )
}
