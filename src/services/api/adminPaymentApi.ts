import { request } from '@/services/request'

type ApiResponse<T> = {
  code: number
  msg: string
  data: T
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
export type RefundStatus =
  | 'CREATING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'CLOSED'
  | 'ABNORMAL'

export type AdminPaymentItem = {
  payment_no: string
  order_no: string
  tenant_public_id: string
  tenant_name: string
  operator_name: string
  item_type: string
  item_name: string
  payment_method: string
  payment_status: PaymentStatus
  order_status: string
  amount: number
  currency: string
  third_party_trade_no: string
  refund_no: string
  refund_status: RefundStatus | ''
  refund_reason: string
  third_party_refund_no: string
  created_at: string
  paid_at: string
  refund_requested_at: string
  refunded_at: string
}

export type ListAdminPaymentsParams = {
  page: number
  page_size: number
  order_no?: string
  payment_no?: string
  tenant_public_id?: string
  payment_status?: PaymentStatus
  refund_status?: RefundStatus | 'NONE'
}

export type PaymentRefund = {
  refund_no: string
  payment_no: string
  status: RefundStatus
  amount: number
  currency: string
  reason: string
  third_party_refund_no: string
  requested_at: string
  refunded_at: string
}

export async function listAdminPayments(params: ListAdminPaymentsParams) {
  const { data } = await request.get<
    ApiResponse<{ total: number; items: AdminPaymentItem[] }>
  >('/v1/admin/payments', { params })
  if (data.code !== 0) throw new Error(data.msg || '查询支付订单失败')
  return data.data
}

export async function createAdminRefund(paymentNo: string, reason: string) {
  const { data } = await request.post<ApiResponse<PaymentRefund>>(
    `/v1/admin/payments/${encodeURIComponent(paymentNo)}/refunds`,
    { reason }
  )
  if (data.code !== 0) throw new Error(data.msg || '发起退款失败')
  return data.data
}
