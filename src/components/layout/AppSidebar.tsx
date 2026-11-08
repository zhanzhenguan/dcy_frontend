import { useAuthStore } from '@/stores/authStore'
import {
  isCurrentEnterpriseManager,
  isCurrentEnterpriseStaff,
  isSuperAdmin,
} from '@/utils/tenantAccess'
import { useLayout } from '@/context/LayoutProvider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  commonNavGroups,
  roleNavGroups,
} from './data/sidebarData'
import {
  buildNavAccessContext,
  resolveSidebarNavGroups,
} from './navAccess'
import { AppTitle } from './AppTitle'
import { NavGroup } from './NavGroup'
import { SidebarEngineStatus } from './SideEngiStat'
import { SystemSettingsNav } from './SystemSettingsNav'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

export const AppSidebar = () => {
  const { collapsible, variant } = useLayout()
  const auth = useAuthStore((state) => state.auth)
  const user = auth.user
  const tenant = auth.session?.tenant
  // 必须当前已切换到企业租户；个人账户（我的组织）不展示企业菜单
  const isEnterpriseStaff = isCurrentEnterpriseStaff(tenant)
  const isEnterpriseManager = isCurrentEnterpriseManager(tenant)

  const navGroups = resolveSidebarNavGroups(
    commonNavGroups,
    roleNavGroups,
    buildNavAccessContext({
      user,
      tenant,
      isEnterpriseStaff,
      isEnterpriseManager,
    })
  )

  return (
    <Sidebar
      collapsible={collapsible}
      variant={variant}
      className='overflow-x-hidden border-e border-border dark:border-e-white/10'
    >
      <SidebarHeader className='group-data-[collapsible=icon]:items-center'>
        <AppTitle />
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent className='min-h-0 flex-1 overflow-y-auto'>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter className='mt-auto shrink-0 gap-1 p-2 group-data-[collapsible=icon]:items-center'>
        <SidebarEngineStatus />
        {/* 超级管理员：系统设置模块按角色动态挂载 */}
        {isSuperAdmin(user) ? <SystemSettingsNav /> : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
