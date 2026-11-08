import { request } from '@/services/request'

type ApiResponse<T> = {
  code: number
  msg: string
  data: T
}

export type OrderStatus = 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED'
export type OrderItemType = 'PLAN' | 'POINTS_RECHARGE'

export type OrderHistoryItem = {
  order_no: string
  tenant_public_id: string
  tenant_name: string
  tenant_type: 'PERSONAL' | 'ENTERPRISE'
  operator_name: string
  item_type: OrderItemType
  item_name: string
  payable_amount: number
  paid_amount: number
  currency: string
  status: OrderStatus
  created_at: string
  paid_at: string
  completed_at: string
}

export type OrderHistoryList = {
  total: number
  /** 与请求参数 scope 一致；企业订单为 ENTERPRISE */
  scope: OrderHistoryScope | 'PLATFORM' | 'TENANT'
  items: OrderHistoryItem[]
}

export type OrderHistoryScope = 'PERSONAL' | 'ENTERPRISE'

export type OrderCouponPurchaseType = 'PACKAGE' | 'RECHARGE'

export type AvailableOrderCoupon = {
  coupon_id: string
  template_name: string
  discount_amount: number
}

export type OrderCouponQuote = {
  original_amount: number
  base_payable_amount: number
  discount_amount: number
  payable_amount: number
  available_coupons: AvailableOrderCoupon[]
}

export type ListOrderHistoryParams = {
  page: number
  page_size: number
  /**
   * PERSONAL：当前用户个人租户订单
   * ENTERPRISE：当前用户有权限的企业租户订单（通常为 owner）
   */
  scope?: OrderHistoryScope
  order_no?: string
  status?: OrderStatus
  item_type?: OrderItemType
  /** 可选：筛选指定企业租户 */
  tenant_public_id?: string
}

export async function listOrderHistory(params: ListOrderHistoryParams) {
  const { data } = await request.get<ApiResponse<OrderHistoryList>>(
    '/v1/orders',
    {
      params: {
        page: params.page,
        page_size: params.page_size,
        scope: params.scope,
        order_no: params.order_no || undefined,
        status: params.status || undefined,
        item_type: params.item_type || undefined,
        tenant_public_id: params.tenant_public_id || undefined,
      },
    }
  )
  if (data.code !== 0) throw new Error(data.msg || '查询订单历史失败')
  return data.data
}

export async function quoteOrderCoupon(params: {
  purchase_type: OrderCouponPurchaseType
  purchase_id: string
  coupon_id?: string | null
}) {
  const { data } = await request.post<ApiResponse<OrderCouponQuote>>(
    '/v1/orders/coupons/quote',
    {
      purchase_type: params.purchase_type,
      purchase_id: params.purchase_id,
      coupon_id: params.coupon_id || undefined,
    }
  )
  if (data.code !== 0) throw new Error(data.msg || '优惠券试算失败')
  return data.data
}
