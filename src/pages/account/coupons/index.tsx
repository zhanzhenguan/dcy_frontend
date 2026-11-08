import { type ReactNode, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Ticket } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import { ContentPage } from '@/components/layout/PageShell'
import { Header } from '@/components/layout/header'
import { listMyCoupons, type CouponInstance } from '@/services/api/couponApi'

const groups = [
  ['unused', '可用'],
  ['locked', '已锁定'],
  ['used', '已使用'],
  ['expired', '已过期'],
] as const

export function MyCouponsPage() {
  const query = useQuery({ queryKey: ['my-coupons'], queryFn: listMyCoupons })
  const [activeGroup, setActiveGroup] =
    useState<(typeof groups)[number][0]>('unused')

  if (query.isLoading)
    return (
      <CouponsLayout>
        <CouponsLoading />
      </CouponsLayout>
    )
  if (query.isError) {
    return (
      <CouponsLayout>
        <Card>
          <CardContent className='text-destructive flex items-center gap-3 py-10 text-sm'>
            <AlertCircle className='size-5' />
            {query.error.message || '优惠券加载失败'}
          </CardContent>
        </Card>
      </CouponsLayout>
    )
  }

  return (
    <CouponsLayout>
      <Card className='rounded-md'>
        <CardHeader>
          <CardTitle className='text-base'>优惠券列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeGroup}
            onValueChange={(value) =>
              setActiveGroup(value as (typeof groups)[number][0])
            }
          >
            <TabsList>
              {groups.map(([key, title]) => (
                <TabsTrigger key={key} value={key}>
                  {title}（{query.data?.[key].length ?? 0}）
                </TabsTrigger>
              ))}
            </TabsList>
            {groups.map(([key]) => {
              const coupons = query.data?.[key] ?? []
              return (
                <TabsContent key={key} value={key} className='mt-4'>
                  {coupons.length === 0 ? (
                    <p className='text-muted-foreground py-8 text-sm'>
                      暂无优惠券
                    </p>
                  ) : (
                    <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                      {coupons.map((coupon) => (
                        <CouponCard coupon={coupon} key={coupon.id} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>
    </CouponsLayout>
  )
}

function CouponsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header fixed>
        <div className='font-medium'>我的优惠券</div>
        <div className='ms-auto flex items-center gap-1'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <ContentPage
        title='我的优惠券'
        description='当前租户可在结算时使用的优惠券'
        surface={false}
      >
        {children}
      </ContentPage>
    </>
  )
}

function CouponCard({ coupon }: { coupon: CouponInstance }) {
  const isDiscount = coupon.coupon_type === 'DISCOUNT'
  const label = isDiscount
    ? `${(coupon.discount_rate / 100).toFixed(1)} 折`
    : `减 ${formatCents(coupon.discount_amount)}`
  return (
    <Card className='rounded-md'>
      <CardHeader className='flex-row items-start justify-between space-y-0 pb-3'>
        <div className='flex items-center gap-2'>
          <Ticket className='text-primary size-4' />
          <CardTitle className='text-base'>{coupon.template_name}</CardTitle>
        </div>
        <Badge variant={coupon.status === 'UNUSED' ? 'default' : 'secondary'}>
          {coupon.status}
        </Badge>
      </CardHeader>
      <CardContent className='space-y-2 text-sm'>
        <p className='text-lg font-semibold'>{label}</p>
        <p className='text-muted-foreground'>
          满 {formatCents(coupon.threshold_amount)} 可用
        </p>
        {isDiscount && coupon.cap_amount > 0 && (
          <p className='text-muted-foreground'>
            最多优惠 {formatCents(coupon.cap_amount)}
          </p>
        )}
        <p className='text-muted-foreground'>
          有效至 {formatDate(coupon.valid_end_at)}
        </p>
      </CardContent>
    </Card>
  )
}

function CouponsLoading() {
  return (
    <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton className='h-40' key={index} />
      ))}
    </div>
  )
}

function formatCents(value: number) {
  return `¥${(value / 100).toFixed(2)}`
}
function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
