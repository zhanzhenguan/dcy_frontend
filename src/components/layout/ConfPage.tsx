import { type ReactNode } from 'react'
import { Settings } from 'lucide-react'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import { Header } from './header'
import { Main } from './main'

type ConfigurationPageProps = {
  children: ReactNode
}

export const ConfigurationPage = ({ children }: ConfigurationPageProps) => {
  return (
    <>
      <Header fixed>
        <Settings className='text-primary size-5 shrink-0' />
        <span className='truncate font-medium'>系统配置</span>
        {/* <Search /> */}
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          {/* <ConfigDrawer /> */}
          <ProfileDropdown />
        </div>
      </Header>

      {/* 标题在灰底 Main 上；白底由各页内容/表格自行承担 */}
      <Main className='flex min-w-0 flex-1 flex-col'>{children}</Main>
    </>
  )
}
