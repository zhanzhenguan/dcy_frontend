import type { PaymentMethod } from '@/services/api/paymentApi'

export type OrderPaymentInfo = {
  orderNo: string
  productName: string
  spaceName: string
  currency: string
  /** 原价，单位分 */
  originalAmount: number
  /** 实付，单位分 */
  payableAmount: number
  /** 折扣金额，单位分；0 表示无折扣 */
  discountAmount: number
  discountLabel?: string
  /** 支付截止时间（Unix 秒）；缺省则用 expiresInSeconds 起算 */
  expireAt?: number
  /** 相对倒计时秒数，默认 15 分钟 */
  expiresInSeconds?: number
  /** 扫码内容或已生成的二维码图片地址 */
  qrPayload?: string
  qrImageUrl?: string
  /** 支付成功后的回调 / 回跳地址 */
  callbackUrl?: string
  /** 成功后回跳倒计时秒数，默认 5 */
  callbackCountdownSeconds?: number
}

export type OrderPaymentPageProps = {
  order: OrderPaymentInfo
  /** 默认支付方式 */
  defaultMethod?: PaymentMethod
  /** 是否调用后端创建支付流水；演示页可关 */
  createAttempt?: boolean
  onPaid?: (paymentNo: string) => void
}
