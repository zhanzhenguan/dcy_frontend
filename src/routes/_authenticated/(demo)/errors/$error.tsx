import { createFileRoute } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/common'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/business'
import { Search } from '@/components/common'
import { ThemeSwitch } from '@/components/common'
import { ForbiddenError } from '@/pages/errors/forb'
import { GeneralError } from '@/pages/errors/GeneralError'
import { MaintenanceError } from '@/pages/errors/MainError'
import { NotFoundError } from '@/pages/errors/NotFounErro'
import { UnauthorisedError } from '@/pages/errors/UnauError'

export const Route = createFileRoute('/_authenticated/(demo)/errors/$error')({
  component: RouteComponent,
})

function RouteComponent() {
  const { error } = Route.useParams()

  const errorMap: Record<string, React.ComponentType> = {
    unauthorized: UnauthorisedError,
    forbidden: ForbiddenError,
    'not-found': NotFoundError,
    'internal-server-error': GeneralError,
    'maintenance-error': MaintenanceError,
  }
  const ErrorComponent = errorMap[error] || NotFoundError

  return (
    <>
      <Header fixed className='border-b'>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <div className='flex-1 [&>div]:h-full'>
        <ErrorComponent />
      </div>
    </>
  )
}
