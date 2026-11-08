import { type ReactNode } from 'react'
import { Building2, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/header'
import { ContentPage } from '@/components/layout/PageShell'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import { useAccountBillingNav } from '@/hooks/useAccountBillingNav'
import { AccountBillingTabs, type AccountBillingTab } from './AccountBillingTabs'

type AccountBillingShellProps = {
  active: AccountBillingTab
  children: ReactNode
  headerActions?: ReactNode
  surface?: boolean
  mainClassName?: string
}

/** 账户概览 / 订单 / 发票 共用顶栏与标题区，Tab 以下由各页自行渲染 */
export const AccountBillingShell = ({
  active,
  children,
  headerActions,
  surface = true,
  mainClassName,
}: AccountBillingShellProps) => {
  const {
    showTabs,
    shellTitle,
    shellDescription,
    profileTabLabel,
    ordersLabel,
    isEnterprise,
  } = useAccountBillingNav()

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          {isEnterprise ? (
            <Building2 className='text-primary size-5 shrink-0' />
          ) : (
            <UserRound className='text-primary size-5 shrink-0' />
          )}
          <span className='truncate font-medium'>{shellTitle}</span>
          <Badge
            variant='outline'
            className='border-primary/20 bg-primary/5 text-primary hidden text-[10px] font-normal sm:inline-flex'
          >
            {shellDescription}
          </Badge>
        </div>
        <div className='ms-auto flex items-center gap-1'>
          {headerActions}
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <ContentPage
        title={shellTitle}
        description={shellDescription}
        nav={
          showTabs ? (
            <AccountBillingTabs
              active={active}
              profileLabel={profileTabLabel}
              ordersLabel={ordersLabel}
            />
          ) : undefined
        }
        surface={surface}
        mainClassName={mainClassName}
      >
        {children}
      </ContentPage>
    </>
  )
}
