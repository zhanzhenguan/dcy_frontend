import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Gift, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import { ContentPage } from '@/components/layout/PageShell'
import { Header } from '@/components/layout/header'
import { getApiErrorMessage } from '@/services/api/apiError'
import { syncCreditBalance } from '@/services/api/creditApi'
import { redeemCode } from '@/services/api/redeemApi'

export function RedeemPage() {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{
    reward_type: string
    points: number
    coupon_id: string
  } | null>(null)
  const mutation = useMutation({
    mutationFn: () => redeemCode(code.trim()),
    onSuccess: (data) => {
      setResult(data)
      setCode('')
      toast.success('兑换成功')
      if (data.reward_type === 'POINTS') {
        void syncCreditBalance(queryClient).catch(() => undefined)
      } else {
        void queryClient.invalidateQueries({ queryKey: ['my-coupons'] })
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '兑换失败')),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!code.trim()) {
      toast.error('请输入兑换码')
      return
    }
    mutation.mutate()
  }
  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <Gift className='text-primary size-5 shrink-0' />
          <span className='truncate font-medium'>兑换码</span>
        </div>
        <div className='ms-auto flex items-center gap-1'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <ContentPage
        title='兑换码兑换'
        description='输入渠道获得的兑换码，立即获得积分或优惠券奖励'
        surface={false}
      >
        <Card className='rounded-md'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Gift className='text-primary size-4' />
              输入兑换码
            </CardTitle>
            <CardDescription>
              每个兑换码只能兑换一次，兑换后立即到账
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className='flex flex-col gap-4 sm:flex-row sm:items-end'
              onSubmit={submit}
            >
              <div className='flex-1 space-y-2'>
                <Label htmlFor='redeem-code'>兑换码</Label>
                <Input
                  id='redeem-code'
                  value={code}
                  autoCapitalize='characters'
                  spellCheck={false}
                  placeholder='如 ABCD2345EFGH6789'
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
              <Button type='submit' disabled={mutation.isPending}>
                立即兑换
              </Button>
            </form>
            {result && (
              <div className='bg-muted mt-4 flex items-center gap-3 rounded-md p-4 text-sm'>
                <Ticket className='text-primary size-5' />
                {result.reward_type === 'POINTS' ? (
                  <span>
                    兑换成功，已到账 <strong>{result.points}</strong> 积分
                  </span>
                ) : (
                  <span>兑换成功，优惠券已发放，可到「我的优惠券」查看</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </ContentPage>
    </>
  )
}
