import { request } from '@/services/request'

type ApiResponse<T> = { code: number; msg: string; data: T }

export type PaymentMethod = 'wechat' | 'alipay'
export type PaymentChannel = PaymentMethod | 'bank_transfer'

export type PaymentAttempt = {
  payment_no: string
  order_no: string
  payment_method: PaymentMethod
  amount: number
  currency: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  code_url: string
  pay_url: string
  expires_at: string
}

export type PaymentStatus = {
  payment_no: string
  order_no: string
  payment_method: PaymentMethod
  payment_status: PaymentAttempt['status']
  order_status:
    'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'REFUNDING' | 'REFUNDED'
  third_party_trade_no: string
  paid_at: string
  expires_at: string
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.code !== 0) throw new Error(response.msg || '请求失败')
  return response.data
}

export async function createPaymentAttempt(
  orderNo: string,
  paymentMethod: PaymentMethod
) {
  const { data } = await request.post<ApiResponse<PaymentAttempt>>(
    `/v1/orders/${encodeURIComponent(orderNo)}/payments`,
    { payment_method: paymentMethod }
  )
  return unwrap(data)
}

export async function getPaymentStatus(paymentNo: string) {
  const { data } = await request.get<ApiResponse<PaymentStatus>>(
    `/v1/payments/${encodeURIComponent(paymentNo)}`
  )
  return unwrap(data)
}
