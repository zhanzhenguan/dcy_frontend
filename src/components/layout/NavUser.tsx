import { Link } from '@tanstack/react-router'
import {
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from 'lucide-react'
import useDialogState from '@/hooks/useDialStat'
import { canPurchaseSubscription } from '@/utils/tenantAccess'
import { UserAvatar } from '@/components/common'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdownMenu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { SignOutDialog } from '@/components/common'
import { useAuthStore } from '@/stores/authStore'
import { useMessageNotifications } from '@/hooks/useMessageNotifications'

type NavUserProps = {
  user: {
    name: string
    email: string
    avatar: string
  }
}

export const NavUser = ({ user }: NavUserProps) => {
  const { isMobile } = useSidebar()
  const [open, setOpen] = useDialogState()
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const canPurchase = canPurchaseSubscription(tenant)
  const { unreadCount } = useMessageNotifications()

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                <UserAvatar
                  src={user.avatar}
                  alt={user.name}
                  className='h-8 w-8 rounded-lg'
                  fallbackClassName='rounded-lg'
                />
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-semibold'>{user.name}</span>
                  {user.email && (
                    <span className='truncate text-xs'>{user.email}</span>
                  )}
                </div>
                <ChevronsUpDown className='ms-auto size-4' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={4}
            >
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-1 py-1.5 text-start text-sm'>
                  <UserAvatar
                    src={user.avatar}
                    alt={user.name}
                    className='h-8 w-8 rounded-lg'
                    fallbackClassName='rounded-lg'
                  />
                  <div className='grid flex-1 text-start text-sm leading-tight'>
                    <span className='truncate font-semibold'>{user.name}</span>
                    {user.email && (
                      <span className='truncate text-xs'>{user.email}</span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              {canPurchase ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link to='/subscriptions'>
                        <Sparkles />
                        升级订阅
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {canPurchase ? (
                  <DropdownMenuItem asChild>
                    <Link to='/subscriptions'>
                      <CreditCard />
                      订阅与计费
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild>
                  <Link to='/settings/notifications'>
                    <Bell />
                    消息
                    {unreadCount > 0 ? (
                      <span className='ms-auto text-xs tabular-nums'>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : null}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                onClick={() => setOpen(true)}
              >
                <LogOut />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
