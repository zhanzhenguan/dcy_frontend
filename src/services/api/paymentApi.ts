import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }

export type PaymentMethod = 'alipay' | 'wechat'

export type PaymentAttempt = {
  payment_no: string
  order_no: string
  amount: number
  currency: string
  status: string
}

export async function createPaymentAttempt(
  orderNo: string,
  paymentMethod: PaymentMethod
) {
  const { data } = await request.post<ApiResponse<PaymentAttempt>>(
    `/v1/orders/${encodeURIComponent(orderNo)}/payments`,
    { payment_method: paymentMethod }
  )
  if (data.code !== 0) throw new Error(data.msg || '创建支付单失败')
  return data.data
}
