import { Link } from '@tanstack/react-router'
import { ArrowLeft, Settings2 } from 'lucide-react'
import { useAccountBillingNav } from '@/hooks/useAccountBillingNav'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageSurface } from '@/components/layout/PageSurface'
import { ProfileSettingsForm } from './components/ProfileSettingsForm'

/** 个人资料设置：独立模块页，不再使用弹窗编辑。 */
export const ProfileSettingsPage = () => {
  const { shellTitle } = useAccountBillingNav()

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <Settings2 className='text-primary size-5 shrink-0' />
          <span className='truncate font-medium'>设置</span>
        </div>
        <div className='ms-auto flex items-center gap-1'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        <Button variant='ghost' size='sm' className='-ms-2 w-fit gap-1.5' asChild>
          <Link to='/profile'>
            <ArrowLeft className='size-4' />
            返回{shellTitle}
          </Link>
        </Button>
        <PageSurface>
          <ProfileSettingsForm />
        </PageSurface>
      </Main>
    </>
  )
}
