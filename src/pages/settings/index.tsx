import { Outlet } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { ThemeSwitch } from '@/components/common'
import { ProfileDropdown } from '@/components/business'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/PageShell'
import { PageSurface } from '@/components/layout/PageSurface'

/** 设置区目前仅承载站内消息，不再展示 Profile / Account 等子模块侧栏 */
export const Settings = () => {
  return (
    <>
      <Header>
        <Bell className='text-primary size-5 shrink-0' />
        <span className='truncate font-medium'>消息</span>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed className='gap-4 lg:gap-6'>
        <PageHeader
          title='消息'
          description='查看积分、优惠券、兑换和权益到账等站内消息。'
        />
        <PageSurface className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <div className='flex min-h-0 w-full flex-1 overflow-y-auto p-1'>
            <Outlet />
          </div>
        </PageSurface>
      </Main>
    </>
  )
}
