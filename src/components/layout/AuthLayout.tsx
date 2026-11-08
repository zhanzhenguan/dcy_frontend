import { Outlet } from '@tanstack/react-router'
import { getCookie } from '@/utils/cookies'
import { cn } from '@/utils/utils'
import { LayoutProvider } from '@/context/LayoutProvider'
import { SearchProvider } from '@/context/SearchProvider'
import { MessageNotificationsProvider } from '@/hooks/useMessageNotifications'
import { useSyncTenantCredits } from '@/hooks/useSyncTenantCredits'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { SkipToMain } from '@/components/common'
import { AppSidebar } from '@/components/layout/AppSidebar'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  useSyncTenantCredits()

  return (
    <MessageNotificationsProvider>
      <SearchProvider>
        <LayoutProvider>
          <SidebarProvider
            defaultOpen={defaultOpen}
            className='h-svh overflow-hidden'
          >
            <SkipToMain />
            <AppSidebar />
            <SidebarInset
              className={cn(
                // Set content container, so we can use container queries
                '@container/content min-w-0',

                // 右侧主区域：底色画布（浅灰 / 暗色深底），卡片用 surface/card
                'bg-background',

                // 右侧独立滚动，顶栏 sticky 才能固定；去掉 inset 顶部空隙
                'h-svh overflow-y-auto overscroll-y-contain',
                'md:peer-data-[variant=inset]:mt-0!',
                'md:peer-data-[variant=inset]:rounded-t-none',
                'md:peer-data-[variant=inset]:h-[calc(100svh-(var(--spacing)*2))]',
                // 侧栏收起时去掉额外左边距，内容贴合图标栏；左右留白交给 Main 统一 padding
                'md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ms-0!'
              )}
            >
              {children ?? <Outlet />}
            </SidebarInset>
          </SidebarProvider>
        </LayoutProvider>
      </SearchProvider>
    </MessageNotificationsProvider>
  )
}
