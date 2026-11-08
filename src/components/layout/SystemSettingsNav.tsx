import { Link, useLocation } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { isSuperAdmin } from '@/utils/tenantAccess'
import {
  DropdownMenu,
  DropdownMenuContent,
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
import { systemSettingsNavItems } from './data/sidebarData'
import type { NavLink } from './types'

function isActivePath(href: string, url: string) {
  return href === url || href.split('?')[0] === url
}

/** 超级管理员：侧边栏底部「系统设置」，点击展开模块菜单 */
export const SystemSettingsNav = () => {
  const user = useAuthStore((state) => state.auth.user)
  const { isMobile, setOpenMobile, state } = useSidebar()
  const href = useLocation({ select: (location) => location.href })
  const collapsed = state === 'collapsed' && !isMobile

  if (!isSuperAdmin(user)) return null

  const items = systemSettingsNavItems.filter(
    (item): item is NavLink => Boolean(item.url)
  )
  const anyActive = items.some((item) => isActivePath(href, String(item.url)))

  return (
    <SidebarMenu className={collapsed ? 'items-center' : undefined}>
      <SidebarMenuItem
        className={collapsed ? 'flex w-full justify-center' : undefined}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              isActive={anyActive}
              tooltip='系统设置'
              className={
                collapsed
                  ? 'size-8! justify-center data-[state=open]:bg-sidebar-accent'
                  : 'data-[state=open]:bg-sidebar-accent'
              }
            >
              <Settings />
              <span className={collapsed ? 'sr-only' : undefined}>系统设置</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='max-h-[min(24rem,70vh)] min-w-56 overflow-y-auto rounded-lg'
            align='start'
            side={isMobile ? 'top' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-muted-foreground text-xs'>
              系统设置
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {items.map((item) => (
              <DropdownMenuItem
                key={`${item.title}-${item.url}`}
                asChild
                className={
                  isActivePath(href, String(item.url)) ? 'bg-accent' : undefined
                }
              >
                <Link to={item.url} onClick={() => setOpenMobile(false)}>
                  {item.icon ? <item.icon /> : null}
                  <span>{item.title}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
