import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Landmark, Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  getPaymentStatus,
  type PaymentAttempt,
  type PaymentChannel,
  type PaymentMethod,
} from '@/services/api/checkoutApi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radioGroup'

type PaymentCheckoutDialogProps = {
  attempt: PaymentAttempt | null
  onOpenChange: (open: boolean) => void
  onPaid: () => void
}

export const PaymentCheckoutDialog = ({
  attempt,
  onOpenChange,
  onPaid,
}: PaymentCheckoutDialogProps) => {
  const paidRef = useRef(false)

  useEffect(() => {
    paidRef.current = false
  }, [attempt?.payment_no])

  useEffect(() => {
    if (!attempt) return
    let active = true
    const check = async () => {
      try {
        const status = await getPaymentStatus(attempt.payment_no)
        if (!active || paidRef.current) return
        if (
          status.payment_status === 'SUCCESS' ||
          status.order_status === 'COMPLETED'
        ) {
          paidRef.current = true
          toast.success('支付成功，订单已完成')
          onPaid()
          return
        }
        if (
          status.payment_status === 'FAILED' ||
          status.payment_status === 'CANCELLED'
        ) {
          toast.error('支付未完成，请重新发起支付')
          onOpenChange(false)
        }
      } catch (error) {
        if (active) toast.error(getApiErrorMessage(error, '查询支付状态失败'))
      }
    }
    void check()
    const timer = window.setInterval(() => void check(), 3000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [attempt, onOpenChange, onPaid])

  if (!attempt) return null
  const method = paymentMethodLabel(attempt.payment_method)
  const isWechat = attempt.payment_method === 'wechat'

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>{method}</DialogTitle>
          <DialogDescription>
            {isWechat
              ? '请使用微信扫描二维码完成支付。'
              : '支付页面已在新标签页打开，请在支付宝页面完成支付。'}
          </DialogDescription>
        </DialogHeader>
        <div className='flex min-h-48 flex-col items-center justify-center gap-4 py-2'>
          {isWechat && attempt.code_url ? (
            <QRCodeSVG value={attempt.code_url} size={208} includeMargin />
          ) : (
            <div className='bg-muted text-muted-foreground flex size-40 items-center justify-center rounded-md text-center text-sm'>
              等待支付宝支付完成
            </div>
          )}
          <div className='text-muted-foreground flex items-center gap-2 text-xs'>
            <Loader2 className='size-3 animate-spin' /> 正在确认支付结果
          </div>
        </div>
        <DialogFooter>
          {!isWechat && attempt.pay_url && (
            <Button variant='outline' asChild>
              <a href={attempt.pay_url} target='_blank' rel='noreferrer'>
                <ExternalLink /> 打开支付宝
              </a>
            </Button>
          )}
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            稍后支付
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function paymentMethodLabel(method: PaymentMethod) {
  return method === 'wechat' ? '微信支付' : '支付宝'
}

export const PaymentMethodPicker = ({
  methods,
  value,
  onChange,
  bankTransferContent,
}: {
  methods: PaymentChannel[]
  value: PaymentMethod | null
  onChange: (value: PaymentMethod) => void
  bankTransferContent: string
}) => {
  const [bankTransferOpen, setBankTransferOpen] = useState(false)

  return (
    <div className='space-y-2'>
      <p className='text-foreground text-sm font-medium'>支付方式</p>
      <RadioGroup
        value={value ?? ''}
        onValueChange={(next) => onChange(next as PaymentMethod)}
      >
        {methods.map((method) =>
          method === 'bank_transfer' ? (
            <button
              key={method}
              type='button'
              className='border-input flex w-full cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-left text-sm'
              onClick={() => setBankTransferOpen(true)}
            >
              <Landmark className='text-primary size-5' aria-hidden />
              <span>对公转账</span>
            </button>
          ) : (
            <label
              key={method}
              className='border-input flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm'
            >
              <RadioGroupItem value={method} />
              <img
                src={`/images/${method}.png`}
                alt=''
                className='size-6 object-contain'
              />
              <span>{paymentMethodLabel(method)}</span>
            </label>
          )
        )}
      </RadioGroup>
      {methods.length === 0 && (
        <p className='text-destructive text-xs'>当前没有可用支付渠道</p>
      )}
      <Dialog open={bankTransferOpen} onOpenChange={setBankTransferOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>对公转账</DialogTitle>
            <DialogDescription>请按以下信息完成转账。</DialogDescription>
          </DialogHeader>
          <div className='text-foreground max-h-80 overflow-y-auto text-sm leading-6 whitespace-pre-wrap'>
            {bankTransferContent || '暂未配置对公转账信息，请联系管理员。'}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
