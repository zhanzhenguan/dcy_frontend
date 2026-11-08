import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/common'
import { Header } from '@/components/layout/header'
import { ContentPage } from '@/components/layout/PageShell'
import { ProfileDropdown } from '@/components/business'
import { Search } from '@/components/common'
import { ThemeSwitch } from '@/components/common'
import { UsersDialogs } from './components/UsersDialogs'
import { UsersPrimaryButtons } from './components/UserPrimButt'
import { UsersProvider } from './components/UsersProvider'
import { UsersTable } from './components/UsersTable'
import { users } from './data/users'

const route = getRouteApi('/_authenticated/(demo)/users/')

export const Users = () => {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  return (
    <UsersProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <ContentPage
        title='User List'
        description='Manage your users and their roles here.'
        actions={<UsersPrimaryButtons />}
        mainClassName='flex flex-1 flex-col'
        className='flex min-h-0 flex-1 flex-col'
        surfaceClassName='flex flex-1 flex-col gap-4 sm:gap-6'
      >
        <UsersTable data={users} search={search} navigate={navigate} />
      </ContentPage>

      <UsersDialogs />
    </UsersProvider>
  )
}
