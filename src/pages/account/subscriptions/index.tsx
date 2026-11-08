import { UpgradePlansSection } from '@/pages/account/components/UpgrPlanSect'
import { Crown } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { canPurchaseSubscription } from '@/utils/tenantAccess'
import { ProfileDropdown } from '@/components/business'
import { ContentPage } from '@/components/layout/PageShell'
import { PageSurface } from '@/components/layout/PageSurface'
import { Header } from '@/components/layout/header'

export const SubscriptionsPage = () => {
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const canPurchase = canPurchaseSubscription(tenant)

  return (
    <>
      <Header>
        <div className='flex min-w-0 items-center gap-2'>
          <Crown className='text-primary size-5 shrink-0' />
          <span className='truncate font-medium'>订阅中心</span>
        </div>
        <div className='ms-auto flex items-center'>
          <ProfileDropdown />
        </div>
      </Header>
      <ContentPage
        title='选择套餐'
        description='比较不同套餐版本与购买方式，按需选择月付、年付或自动续费。'
        surface={false}
      >
        {canPurchase ? (
          <UpgradePlansSection />
        ) : (
          <PageSurface className='text-muted-foreground flex min-h-52 items-center justify-center text-sm'>
            企业套餐仅管理员可购买，请联系管理员处理
          </PageSurface>
        )}
      </ContentPage>
    </>
  )
}
