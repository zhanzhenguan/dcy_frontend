import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Coins, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { canManageAccountBilling } from '@/utils/tenantAccess'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  PaymentCheckoutDialog,
  PaymentMethodPicker,
  CouponPicker,
} from '@/components/business'
import { ConfirmDialog } from '@/components/common'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createPaymentAttempt,
  type PaymentAttempt,
  type PaymentMethod,
} from '@/services/api/checkoutApi'
import {
  syncCreditBalance,
} from '@/services/api/creditApi'
import {
  listCreditRechargePlans,
  purchaseCreditRecharge,
  type CreditRechargePurchase,
  type CreditRechargePlan,
} from '@/services/api/creditRechargeApi'

interface CreditRechargeSectionProps {
  /** 在管理后台预览模式下可以传 mock 或从外部传入 plans */
  overridePlans?: CreditRechargePlan[]
  /** 预览模式隐藏购买对话框与真实请求 */
  previewMode?: boolean
}

type CreditCheckout = {
  attempt: PaymentAttempt
  purchase: CreditRechargePurchase
}

export const CreditRechargeSection = ({
  overridePlans,
  previewMode = false,
}: CreditRechargeSectionProps) => {
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<CreditRechargePlan | null>(
    null
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [couponId, setCouponId] = useState<string | null>(null)
  const [couponPayableAmount, setCouponPayableAmount] = useState<number | null>(
    null
  )
  const [checkout, setCheckout] = useState<CreditCheckout | null>(null)

  const setCreditBalance = useAuthStore((state) => state.auth.setCreditBalance)
  const canRecharge = useAuthStore((state) =>
    canManageAccountBilling(state.auth.session?.tenant)
  )

  const plansQuery = useQuery({
    queryKey: ['credit-recharge-plans'],
    queryFn: listCreditRechargePlans,
    enabled: !overridePlans && !previewMode && canRecharge,
  })

  const completePurchase = (purchase: CreditRechargePurchase) => {
    setCreditBalance(purchase.credit_balance)
    void syncCreditBalance(queryClient).catch(() => undefined)
    toast.success(
      `充值成功！已为您增加 ${purchase.credits_granted.toLocaleString()} 积分`
    )
    setSelectedPlan(null)
    setCouponId(null)
    setCouponPayableAmount(null)
    void queryClient.invalidateQueries({
      queryKey: ['credit-recharge-plans'],
    })
    void queryClient.invalidateQueries({ queryKey: ['my-coupons'] })
  }
  const purchaseMutation = useMutation({
    mutationFn: async ({
      planId,
      couponId,
      method,
      paymentWindow,
    }: {
      planId: string
      couponId: string | null
      method: PaymentMethod | null
      paymentWindow: Window | null
    }) => {
      try {
        const purchase = await purchaseCreditRecharge(planId, couponId)
        if (!purchase.payment_required) return { purchase }
        if (!method) throw new Error('请选择支付渠道')
        const attempt = await createPaymentAttempt(purchase.order_no, method)
        if (method === 'alipay' && attempt.pay_url && paymentWindow) {
          paymentWindow.opener = null
          paymentWindow.location.replace(attempt.pay_url)
        }
        return { purchase, attempt }
      } catch (error) {
        paymentWindow?.close()
        throw error
      }
    },
    onSuccess: (result) => {
      if (result.attempt) {
        setSelectedPlan(null)
        setCheckout({ attempt: result.attempt, purchase: result.purchase })
        return
      }
      completePurchase(result.purchase)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '充值失败')),
  })

  const plans = overridePlans ?? plansQuery.data?.items ?? []
  const paymentMethods = plansQuery.data?.payment_methods ?? []
  const onlinePaymentMethods = paymentMethods.filter(
    (method): method is PaymentMethod => method !== 'bank_transfer'
  )

  return (
    <Card className='space-y-4 p-6'>
      <div className='space-y-1'>
        <h2 className='flex items-center gap-2 text-lg font-bold tracking-tight'>
          <Coins className='text-primary size-5' />
          积分充值
        </h2>
        <p className='text-muted-foreground text-xs'>
          按需购买积分，不过期，随时可用
        </p>
      </div>

      {!overridePlans && plansQuery.isLoading ? (
        <div className='text-muted-foreground flex min-h-36 items-center justify-center gap-2 rounded-xl border'>
          <Loader2 className='text-primary size-5 animate-spin' />
          <span>正在加载积分充值方案...</span>
        </div>
      ) : plans.length === 0 ? (
        <div className='text-muted-foreground flex min-h-36 items-center justify-center rounded-xl border text-sm'>
          暂无可选积分充值包
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'>
          {plans.map((plan) => {
            const totalCredits = plan.credits + plan.bonus_credits

            return (
              <div
                key={plan.id}
                className={`bg-muted/30 relative flex flex-col items-center justify-between space-y-3 rounded-xl border p-4 text-center transition-all ${
                  plan.is_featured
                    ? 'border-primary ring-primary/20 shadow-xs ring-1'
                    : 'border-border'
                }`}
              >
                {plan.badge_text && (
                  <Badge
                    className='absolute -top-2.5 px-2 text-[10px]'
                    variant={plan.is_featured ? 'default' : 'destructive'}
                  >
                    {plan.badge_text}
                  </Badge>
                )}

                <div className='space-y-1 pt-1'>
                  <div className='text-xl font-bold text-amber-600 dark:text-amber-400'>
                    {totalCredits.toLocaleString()}{' '}
                    <span className='text-muted-foreground text-xs font-normal'>
                      积分
                    </span>
                  </div>
                  <div className='flex items-center justify-center gap-1.5 text-sm font-semibold'>
                    <span>¥{plan.price_cents / 100}</span>
                    {plan.original_price_cents > plan.price_cents && (
                      <span className='text-muted-foreground text-xs font-normal line-through'>
                        ¥{plan.original_price_cents / 100}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => {
                    if (previewMode) {
                      toast.info(`预览模式：点击购买 ${plan.name}`)
                    } else {
                      setSelectedPlan(plan)
                      setCouponId(null)
                      setCouponPayableAmount(null)
                      setPaymentMethod(onlinePaymentMethods[0] ?? null)
                    }
                  }}
                  variant={plan.is_featured ? 'default' : 'outline'}
                  size='sm'
                  className='w-full'
                >
                  购买
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {!previewMode && (
        <ConfirmDialog
          open={Boolean(selectedPlan)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedPlan(null)
              setCouponId(null)
              setCouponPayableAmount(null)
            }
          }}
          title={`购买 ${selectedPlan?.name ?? ''}`}
          desc={
            selectedPlan ? (
              <div className='space-y-4'>
                <p>
                  确认花费 ¥{selectedPlan.price_cents / 100} 购买{' '}
                  {selectedPlan.name}？购买后将实时入账{' '}
                  {(
                    selectedPlan.credits + selectedPlan.bonus_credits
                  ).toLocaleString()}{' '}
                  积分（含 {selectedPlan.bonus_credits.toLocaleString('en-US')}{' '}
                  赠送积分）。
                </p>
                {selectedPlan.price_cents > 0 &&
                  !plansQuery.data?.development_mode && (
                    <PaymentMethodPicker
                      methods={paymentMethods}
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      bankTransferContent={
                        plansQuery.data?.bank_transfer_content ?? ''
                      }
                    />
                  )}
                <CouponPicker
                  open={Boolean(selectedPlan)}
                  purchaseType='RECHARGE'
                  purchaseId={selectedPlan.id}
                  value={couponId}
                  onChange={setCouponId}
                  onPayableAmountChange={setCouponPayableAmount}
                />
              </div>
            ) : (
              ''
            )
          }
          cancelBtnText='再想想'
          confirmText='确认并支付'
          isLoading={purchaseMutation.isPending}
          handleConfirm={() => {
            if (!selectedPlan) return
            const requiresPayment =
              (couponPayableAmount ?? selectedPlan.price_cents) > 0 &&
              !plansQuery.data?.development_mode
            if (requiresPayment && !paymentMethod) {
              toast.error('请选择支付渠道')
              return
            }
            const paymentWindow =
              requiresPayment && paymentMethod === 'alipay'
                ? window.open('about:blank', '_blank')
                : null
            purchaseMutation.mutate({
              planId: selectedPlan.id,
              couponId,
              method: paymentMethod,
              paymentWindow,
            })
          }}
        />
      )}
      <PaymentCheckoutDialog
        attempt={checkout?.attempt ?? null}
        onOpenChange={(open) => !open && setCheckout(null)}
        onPaid={() => {
          setCheckout(null)
          toast.success('支付成功，积分正在入账')
          void queryClient.invalidateQueries({
            queryKey: ['credit-recharge-plans'],
          })
          // 支付回调可能略早于入账，短延迟后再拉一次余额
          window.setTimeout(() => {
            void syncCreditBalance(queryClient).catch(() => undefined)
          }, 1500)
          void syncCreditBalance(queryClient).catch(() => undefined)
        }}
      />
    </Card>
  )
}
