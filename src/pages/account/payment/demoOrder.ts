import type { OrderPaymentInfo } from './types'

/** 设计稿演示订单，便于单独预览支付模块 */
export const DEMO_PAYMENT_ORDER: OrderPaymentInfo = {
  orderNo: 'ORDER-20231027-001',
  productName: '专业版套餐 - 包年',
  spaceName: '厦门XX科技有限公司',
  currency: 'CNY',
  originalAmount: 29900,
  payableAmount: 20000,
  discountAmount: 9900,
  discountLabel: '企业专享折扣',
  expiresInSeconds: 15 * 60,
  qrPayload: 'https://pay.example.com/demo/ORDER-20231027-001',
  callbackUrl: '/profile',
  callbackCountdownSeconds: 5,
}
