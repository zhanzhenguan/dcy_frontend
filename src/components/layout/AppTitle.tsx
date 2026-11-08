import { Link } from '@tanstack/react-router'
import { PortalLogo } from '@/components/common'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

export const AppTitle = () => {
  const { setOpenMobile, state, isMobile } = useSidebar()
  const collapsed = state === 'collapsed' && !isMobile

  return (
    <SidebarMenu className={collapsed ? 'items-center' : undefined}>
      <SidebarMenuItem className={collapsed ? 'flex w-full justify-center' : undefined}>
        <SidebarMenuButton
          size={collapsed ? 'default' : 'lg'}
          className={
            collapsed
              ? 'size-8! justify-center overflow-visible p-0! hover:bg-transparent active:bg-transparent'
              : 'gap-0 py-0 hover:bg-transparent active:bg-transparent'
          }
          tooltip='大词源AI'
          asChild
        >
          <Link
            to='/dashboard'
            onClick={() => setOpenMobile(false)}
            className={
              collapsed
                ? 'flex size-8 items-center justify-center overflow-visible'
                : 'flex items-center gap-2'
            }
            aria-label='大词源AI'
          >
            <PortalLogo
              variant='app'
              showName={false}
              size={collapsed ? 24 : 36}
              className={collapsed ? 'shrink-0' : undefined}
            />
            {!collapsed ? (
              <span className='grid min-w-0 flex-1 text-start text-sm leading-tight'>
                <span className='text-sidebar-foreground truncate font-bold'>
                  大词源AI
                </span>
                <span className='text-muted-foreground truncate text-xs dark:text-slate-300/80'>
                  AI 视频生成平台
                </span>
              </span>
            ) : null}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
