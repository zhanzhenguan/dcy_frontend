import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  QrCode,
} from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createPaymentAttempt,
  type PaymentMethod,
} from '@/services/api/paymentApi'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import type { OrderPaymentPageProps } from './types'

export const OrderPaymentPage = ({
  order,
  defaultMethod = 'alipay',
  createAttempt = false,
  onPaid,
}: OrderPaymentPageProps) => {
  const navigate = useNavigate()
  const [method, setMethod] = useState<PaymentMethod>(defaultMethod)
  const [now, setNow] = useState(() => Date.now())
  const [paid, setPaid] = useState(false)
  const [paymentNo, setPaymentNo] = useState('')
  const [callbackLeft, setCallbackLeft] = useState(
    () => order.callbackCountdownSeconds ?? 5
  )

  const callbackUrl = order.callbackUrl?.trim() || '/profile'
  const callbackSeconds = order.callbackCountdownSeconds ?? 5

  const expireAtMs = useMemo(() => {
    if (order.expireAt) return order.expireAt * 1000
    const seconds = order.expiresInSeconds ?? 15 * 60
    return Date.now() + seconds * 1000
  }, [order.expireAt, order.expiresInSeconds])

  const remainMs = Math.max(0, expireAtMs - now)
  const expired = remainMs <= 0

  useEffect(() => {
    if (paid) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [paid])

  const attemptMutation = useMutation({
    mutationFn: (next: PaymentMethod) =>
      createPaymentAttempt(order.orderNo, next),
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '创建支付单失败')),
  })

  useEffect(() => {
    if (!createAttempt || expired || paid) return
    attemptMutation.mutate(method)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutate identity 不稳定
  }, [createAttempt, expired, method, order.orderNo, paid])

  const markPaid = (nextPaymentNo?: string) => {
    if (paid) return
    const no =
      nextPaymentNo ||
      attemptMutation.data?.payment_no ||
      `DEMO-${order.orderNo}`
    setPaymentNo(no)
    setPaid(true)
    setCallbackLeft(callbackSeconds)
    onPaid?.(no)
    toast.success('支付成功')
  }

  useEffect(() => {
    if (!paid) return
    if (callbackLeft <= 0) {
      goCallback(callbackUrl, navigate)
      return
    }
    const timer = window.setTimeout(
      () => setCallbackLeft((value) => value - 1),
      1000
    )
    return () => window.clearTimeout(timer)
  }, [paid, callbackLeft, callbackUrl, navigate])

  const qrSrc = useMemo(() => {
    if (order.qrImageUrl) return order.qrImageUrl
    const payload =
      order.qrPayload ||
      attemptMutation.data?.payment_no ||
      `${order.orderNo}:${method}:${order.payableAmount}`
    return buildQrImageUrl(payload)
  }, [
    attemptMutation.data?.payment_no,
    method,
    order.orderNo,
    order.payableAmount,
    order.qrImageUrl,
    order.qrPayload,
  ])

  const scanHint =
    method === 'alipay'
      ? '请使用支付宝扫一扫完成支付'
      : '请使用微信扫一扫完成支付'

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='truncate font-medium'>订单支付</span>
        </div>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='max-w-6xl space-y-5 pb-16'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h1 className='text-2xl font-bold tracking-tight'>订单支付</h1>
          {!paid && (
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium',
                expired
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
              )}
            >
              <Clock className='size-4 shrink-0' />
              {expired
                ? '支付已超时，请重新下单'
                : `请在 ${formatCountdown(remainMs)} 内完成支付`}
            </div>
          )}
        </div>

        {paid ? (
          <PaymentSuccessPanel
            orderNo={order.orderNo}
            paymentNo={paymentNo}
            amountLabel={formatMoney(order.payableAmount, order.currency)}
            callbackUrl={callbackUrl}
            countdown={callbackLeft}
            onJumpNow={() => goCallback(callbackUrl, navigate)}
          />
        ) : (
          <div className='grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.9fr)]'>
            <section className='bg-card overflow-hidden rounded-xl border shadow-xs'>
              <div className='border-b border-emerald-100/80 bg-emerald-50/70 px-6 py-5 dark:border-emerald-900/40 dark:bg-emerald-950/30'>
                <h2 className='text-lg font-semibold'>选择支付方式</h2>
                <p className='text-muted-foreground mt-1 text-sm'>
                  支持支付宝、微信扫码支付，支付成功后即刻开通服务。
                </p>
              </div>

              <div className='space-y-6 p-6'>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <PaymentMethodButton
                    active={method === 'alipay'}
                    disabled={expired}
                    label='支付宝'
                    onClick={() => setMethod('alipay')}
                    icon={<AlipayIcon className='size-7' />}
                  />
                  <PaymentMethodButton
                    active={method === 'wechat'}
                    disabled={expired}
                    label='微信支付'
                    onClick={() => setMethod('wechat')}
                    icon={<WechatIcon className='size-7' />}
                  />
                </div>

                <div className='bg-muted/50 flex flex-col items-center justify-center rounded-xl px-4 py-10'>
                  <div className='bg-background w-full max-w-[17.5rem] rounded-xl border p-4 shadow-xs'>
                    <div className='bg-background relative mx-auto aspect-square w-full overflow-hidden rounded-lg'>
                      {attemptMutation.isPending && createAttempt ? (
                        <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm'>
                          <Loader2 className='size-6 animate-spin' />
                          正在生成收款码
                        </div>
                      ) : (
                        <img
                          src={qrSrc}
                          alt='支付二维码'
                          className={cn(
                            'size-full object-contain',
                            expired && 'opacity-40 grayscale'
                          )}
                        />
                      )}
                    </div>
                    <div className='text-muted-foreground mt-3 space-y-0.5 text-center text-[11px] leading-4'>
                      <div>订单支付 / Scan to Pay</div>
                      <div>
                        {method === 'alipay' ? 'Alipay' : 'WeChat Pay'} ·
                        Amount:{' '}
                        {formatMoney(order.payableAmount, order.currency)}{' '}
                        {order.currency}
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'mt-5 flex items-center gap-2 text-sm font-medium',
                      method === 'alipay'
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    <QrCode className='size-4 shrink-0' />
                    {expired ? '二维码已失效' : scanHint}
                  </div>

                  {!expired && (
                    <Button
                      className='mt-6'
                      variant='secondary'
                      onClick={() => markPaid()}
                    >
                      我已完成支付
                    </Button>
                  )}
                </div>
              </div>
            </section>

            <aside className='bg-card overflow-hidden rounded-xl border shadow-xs'>
              <div className='border-b border-emerald-100/80 bg-emerald-50/70 px-5 py-4 dark:border-emerald-900/40 dark:bg-emerald-950/30'>
                <h2 className='font-semibold'>订单信息</h2>
              </div>

              <div className='space-y-5 p-5'>
                <dl className='space-y-4 text-sm'>
                  <div className='flex items-start justify-between gap-4'>
                    <dt className='text-muted-foreground shrink-0'>产品名称</dt>
                    <dd className='text-end font-medium'>{order.productName}</dd>
                  </div>
                  <div className='flex items-start justify-between gap-4'>
                    <dt className='text-muted-foreground shrink-0'>订单编号</dt>
                    <dd className='font-mono text-end text-xs break-all'>
                      {order.orderNo}
                    </dd>
                  </div>
                  <div className='flex items-start justify-between gap-4'>
                    <dt className='text-muted-foreground shrink-0'>当前空间</dt>
                    <dd className='flex max-w-[70%] items-center justify-end gap-1.5 text-end font-medium'>
                      <Building2 className='size-3.5 shrink-0 text-amber-500' />
                      <span className='min-w-0 break-words'>
                        {order.spaceName}
                      </span>
                    </dd>
                  </div>
                </dl>

                <div className='border-t pt-4'>
                  <dl className='space-y-3 text-sm'>
                    <div className='flex items-center justify-between gap-3'>
                      <dt className='text-muted-foreground'>原价</dt>
                      <dd className='text-muted-foreground line-through'>
                        {formatMoney(order.originalAmount, order.currency)}
                      </dd>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className='flex items-center justify-between gap-3'>
                        <dt className='text-muted-foreground'>
                          {order.discountLabel || '优惠折扣'}
                        </dt>
                        <dd className='font-medium text-emerald-600 dark:text-emerald-400'>
                          - {formatMoney(order.discountAmount, order.currency)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className='rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-4 dark:border-emerald-900/50 dark:bg-emerald-950/40'>
                  <div className='text-muted-foreground text-sm'>实付金额</div>
                  <div className='mt-1 text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300'>
                    {formatMoney(order.payableAmount, order.currency)}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </Main>
    </>
  )
}

function PaymentSuccessPanel({
  orderNo,
  paymentNo,
  amountLabel,
  callbackUrl,
  countdown,
  onJumpNow,
}: {
  orderNo: string
  paymentNo: string
  amountLabel: string
  callbackUrl: string
  countdown: number
  onJumpNow: () => void
}) {
  return (
    <section className='bg-card mx-auto w-full max-w-xl overflow-hidden rounded-xl border shadow-xs'>
      <div className='flex flex-col items-center px-6 py-10 text-center'>
        <div className='flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'>
          <CheckCircle2 className='size-9' />
        </div>
        <h2 className='mt-5 text-2xl font-bold'>支付成功</h2>
        <p className='text-muted-foreground mt-2 text-sm'>
          订单已支付完成，服务即将开通。
        </p>

        <dl className='bg-muted/40 mt-6 w-full space-y-3 rounded-xl px-4 py-4 text-left text-sm'>
          <div className='flex justify-between gap-3'>
            <dt className='text-muted-foreground'>订单编号</dt>
            <dd className='font-mono text-xs break-all'>{orderNo}</dd>
          </div>
          <div className='flex justify-between gap-3'>
            <dt className='text-muted-foreground'>支付单号</dt>
            <dd className='font-mono text-xs break-all'>{paymentNo}</dd>
          </div>
          <div className='flex justify-between gap-3'>
            <dt className='text-muted-foreground'>实付金额</dt>
            <dd className='font-semibold text-emerald-700 dark:text-emerald-300'>
              {amountLabel}
            </dd>
          </div>
        </dl>

        <div className='mt-6 w-full rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-4 dark:border-emerald-900/50 dark:bg-emerald-950/40'>
          <div className='text-sm font-medium text-emerald-800 dark:text-emerald-200'>
            {countdown > 0
              ? `${countdown} 秒后跳转回调地址`
              : '正在跳转回调地址…'}
          </div>
          <div className='text-muted-foreground mt-2 flex items-start gap-2 break-all text-xs'>
            <ExternalLink className='mt-0.5 size-3.5 shrink-0' />
            <span>{callbackUrl}</span>
          </div>
        </div>

        <div className='mt-6 flex flex-wrap items-center justify-center gap-3'>
          <Button onClick={onJumpNow}>立即跳转</Button>
        </div>
      </div>
    </section>
  )
}

function goCallback(
  callbackUrl: string,
  navigate: ReturnType<typeof useNavigate>
) {
  if (/^https?:\/\//i.test(callbackUrl)) {
    window.location.assign(callbackUrl)
    return
  }
  void navigate({ to: callbackUrl as '/' })
}

function PaymentMethodButton({
  active,
  disabled,
  label,
  icon,
  onClick,
}: {
  active: boolean
  disabled?: boolean
  label: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative flex min-h-16 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors',
        active
          ? label === '支付宝'
            ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/30'
            : 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30'
          : 'border-border bg-background hover:bg-muted/40',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      {icon}
      <span className='text-base font-semibold'>{label}</span>
      {active && (
        <span
          className={cn(
            'absolute top-2 right-2 flex size-5 items-center justify-center rounded-full text-white',
            label === '支付宝' ? 'bg-sky-500' : 'bg-emerald-500'
          )}
        >
          <Check className='size-3 stroke-[3]' />
        </span>
      )}
    </button>
  )
}

function formatCountdown(ms: number) {
  const total = Math.floor(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency || 'CNY',
  }).format(cents / 100)
}

function buildQrImageUrl(payload: string) {
  const size = 280
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`
}

function AlipayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 48 48' className={className} aria-hidden>
      <rect width='48' height='48' rx='10' fill='#1677FF' />
      <path
        fill='#fff'
        d='M12 30.5c3.8-1.6 7.9-2.7 12.2-3.2-1.7-2.3-3-4.8-3.8-7.5h4.1c.6 2 1.6 3.9 2.9 5.6 3.6-.3 7-.1 10.1.6v3.2c-3.7-.7-7.6-.9-11.5-.5 2.4 2.7 5.5 4.9 9.1 6.4l-1.7 3.2c-4.3-1.9-8-4.6-10.8-7.9-3.5 1-6.8 2.5-9.6 4.4L12 30.5zm8.2-16.2h3.2l.7 3.8h6.4v3.1h-7.1l-.6 3.1h8.9v3.1H14.8v-3.1h5l.6-3.1H14v-3.1h5.5l-.3-3.8z'
      />
    </svg>
  )
}

function WechatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 48 48' className={className} aria-hidden>
      <rect width='48' height='48' rx='10' fill='#07C160' />
      <path
        fill='#fff'
        d='M18.8 14.5c-5.4 0-9.8 3.7-9.8 8.3 0 2.7 1.5 5.1 3.9 6.7l-.9 3.2 3.5-1.8c1.1.3 2.2.5 3.3.5.3 0 .7 0 1-.1-.2-.7-.3-1.4-.3-2.1 0-4.9 4.7-8.9 10.5-8.9.3 0 .6 0 .9.1-1.5-3.6-5.6-6-10.1-6zm-3.7 5.2a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm7.4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm13.4 4.2c-4.8 0-8.7 3.3-8.7 7.3 0 2.4 1.4 4.5 3.5 5.9l-.8 2.7 3.1-1.6c.9.3 1.9.4 2.9.4 4.8 0 8.7-3.3 8.7-7.3s-3.9-7.4-8.7-7.4zm-3.4 4.6a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3zm6.7 0a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3z'
      />
    </svg>
  )
}
