import { Check, ChevronsUpDown, Layers, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import { cn } from '@/utils/utils'
import {
  formatTenantRoleLabel,
  useTenantSwitch,
} from '@/hooks/useTenantSwitch'
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

/** 与侧栏菜单 hover / 选中一致（覆盖默认 accent 紫色） */
const workspaceMenuItemClass =
  'h-10 gap-2.5 rounded-lg px-2.5 focus:!bg-sidebar-accent focus:!text-sidebar-accent-foreground data-[highlighted]:!bg-sidebar-accent data-[highlighted]:!text-sidebar-accent-foreground'

/** 侧边栏工作空间：单企业一键切换；多企业下列表选择 */
export const WorkspaceSwitcher = () => {
  const { isMobile, state } = useSidebar()
  const collapsed = state === 'collapsed' && !isMobile
  const {
    session,
    tenantsQuery,
    switchMutation,
    enterpriseTenants,
    personalTenant,
    selectTenant,
    isEnterprise,
  } = useTenantSwitch()

  const companyName =
    session?.tenant?.company_name?.trim() || '企业工作空间'
  const roleLabel = formatTenantRoleLabel(session?.tenant?.role, isEnterprise)
  const hasMultipleEnterprises = enterpriseTenants.length > 1
  const targetEnterprise = enterpriseTenants[0]
  const busy = switchMutation.isPending || tenantsQuery.isLoading
  const canToggle = isEnterprise
    ? Boolean(personalTenant)
    : Boolean(targetEnterprise)

  const handleToggle = () => {
    if (busy) return

    if (isEnterprise) {
      if (!personalTenant) {
        toast.error('暂无个人工作空间可切换')
        return
      }
      selectTenant(personalTenant.public_id)
      return
    }

    if (!targetEnterprise) {
      toast.error('暂无企业工作空间可切换')
      return
    }
    selectTenant(targetEnterprise.public_id)
  }

  const tooltipLabel = isEnterprise
    ? `${companyName} · ${roleLabel}`
    : `个人模式 · ${roleLabel}`

  const triggerClassName = cn(
    'data-[state=open]:bg-sidebar-accent',
    collapsed
      ? 'size-8! justify-center p-0!'
      : cn(
          'h-auto py-2.5',
          isEnterprise
            ? 'bg-muted/70 hover:bg-muted'
            : 'border-border bg-background hover:bg-muted/50 border'
        )
  )

  const collapsedIcon = isEnterprise ? (
    <span className='bg-muted text-foreground flex size-7 shrink-0 items-center justify-center rounded-lg'>
      <Layers className='size-3.5' />
    </span>
  ) : (
    <span className='bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg'>
      <UserRound className='size-3.5' />
    </span>
  )

  const expandedContent = isEnterprise ? (
    <>
      <span className='bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg'>
        <Layers className='size-4' />
      </span>
      <div className='grid min-w-0 flex-1 text-start leading-tight'>
        <span className='text-muted-foreground text-[11px] font-normal'>
          当前工作空间
        </span>
        <span className='text-foreground mt-0.5 truncate text-sm font-semibold'>
          {companyName}
        </span>
      </div>
      <ChevronsUpDown className='text-muted-foreground ms-auto size-4 shrink-0' />
    </>
  ) : (
    <>
      <span className='bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg'>
        <UserRound className='size-4' />
      </span>
      <div className='grid min-w-0 flex-1 text-start leading-tight'>
        <span className='truncate text-sm font-semibold'>个人模式</span>
        <span className='text-muted-foreground truncate text-xs'>
          {roleLabel}
        </span>
      </div>
      <ChevronsUpDown className='text-muted-foreground ms-auto size-4' />
    </>
  )

  const triggerContent = collapsed ? collapsedIcon : expandedContent

  return (
    <SidebarMenu className={collapsed ? 'items-center' : undefined}>
      <SidebarMenuItem
        className={collapsed ? 'flex w-full justify-center' : undefined}
      >
        {hasMultipleEnterprises ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size={collapsed ? 'default' : 'lg'}
                className={triggerClassName}
                disabled={busy}
                tooltip={tooltipLabel}
                title='选择工作空间'
                aria-label='选择工作空间'
              >
                {triggerContent}
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-64 rounded-xl border p-1.5 shadow-lg'
              align='start'
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={8}
            >
              <DropdownMenuLabel className='text-muted-foreground px-2.5 py-1.5 text-[11px] font-medium tracking-wide uppercase'>
                企业工作空间
              </DropdownMenuLabel>
              {tenantsQuery.isError ? (
                <DropdownMenuItem
                  disabled
                  className='text-destructive data-disabled:opacity-100'
                >
                  加载失败：
                  {getApiErrorMessage(tenantsQuery.error, '接口不可用')}
                </DropdownMenuItem>
              ) : tenantsQuery.isLoading ? (
                <DropdownMenuItem disabled className='h-10 px-2.5'>
                  加载中...
                </DropdownMenuItem>
              ) : (
                enterpriseTenants.map((tenant) => {
                  const active =
                    isEnterprise &&
                    tenant.public_id === session?.tenant?.public_id
                  return (
                    <DropdownMenuItem
                      key={tenant.public_id}
                      disabled={switchMutation.isPending}
                      onSelect={() => selectTenant(tenant.public_id)}
                      className={cn(
                        workspaceMenuItemClass,
                        active &&
                          '!bg-sidebar-accent !text-sidebar-accent-foreground focus:!bg-sidebar-accent focus:!text-sidebar-accent-foreground data-[highlighted]:!bg-sidebar-accent data-[highlighted]:!text-sidebar-accent-foreground'
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-md',
                          active
                            ? 'bg-sidebar-primary/15 text-sidebar-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Layers className='size-3.5' />
                      </span>
                      <span className='min-w-0 flex-1 truncate font-medium'>
                        {tenant.company_name}
                      </span>
                      {active ? (
                        <Check className='text-sidebar-primary ms-auto size-4 shrink-0' />
                      ) : null}
                    </DropdownMenuItem>
                  )
                })
              )}
              <DropdownMenuSeparator className='my-1.5' />
              <DropdownMenuItem
                disabled={!personalTenant || switchMutation.isPending}
                onSelect={() =>
                  personalTenant && selectTenant(personalTenant.public_id)
                }
                className={cn(
                  workspaceMenuItemClass,
                  !isEnterprise &&
                    '!bg-sidebar-accent !text-sidebar-accent-foreground focus:!bg-sidebar-accent focus:!text-sidebar-accent-foreground data-[highlighted]:!bg-sidebar-accent data-[highlighted]:!text-sidebar-accent-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-md',
                    !isEnterprise
                      ? 'bg-sidebar-primary/15 text-sidebar-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <UserRound className='size-3.5' />
                </span>
                <span className='min-w-0 flex-1 font-medium'>个人模式</span>
                {!isEnterprise ? (
                  <Check className='text-sidebar-primary ms-auto size-4 shrink-0' />
                ) : null}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarMenuButton
            size={collapsed ? 'default' : 'lg'}
            className={triggerClassName}
            disabled={busy || (!canToggle && !tenantsQuery.isLoading)}
            tooltip={tooltipLabel}
            title={isEnterprise ? '切换到个人模式' : '切换到企业工作空间'}
            aria-label={
              isEnterprise ? '切换到个人模式' : '切换到企业工作空间'
            }
            onClick={handleToggle}
          >
            {triggerContent}
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
