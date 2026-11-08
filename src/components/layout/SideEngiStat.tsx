import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Gem } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { canManageAccountBilling } from '@/utils/tenantAccess'
import { resolveTenantPlanDisplay } from '@/utils/subscriptionDisplay'
import { PlansPickerDialog } from '@/components/business'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

/** 侧边栏底部：升级套餐 / 未开通入口（仅个人 / 企业 owner）——文案取 tenants/current */
export const SidebarEngineStatus = () => {
  const { setOpenMobile, state, isMobile } = useSidebar()
  const tenant = useAuthStore((state) => state.auth.session?.tenant ?? null)
  const [plansOpen, setPlansOpen] = useState(false)
  const canManageBilling = canManageAccountBilling(tenant)
  const { active, ctaLabel: label } = resolveTenantPlanDisplay(tenant)
  const collapsed = state === 'collapsed' && !isMobile

  const openPlansDialog = () => {
    setOpenMobile(false)
    setPlansOpen(true)
  }

  if (!canManageBilling) return null

  return (
    <>
      {collapsed ? (
        <SidebarMenu className='items-center'>
          <SidebarMenuItem className='flex w-full justify-center'>
            {active ? (
              <SidebarMenuButton
                tooltip={label}
                className='size-8! justify-center'
                aria-label={label}
                asChild
              >
                <Link to='/profile' onClick={() => setOpenMobile(false)}>
                  <Gem className='size-4' />
                  <span className='sr-only'>{label}</span>
                </Link>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                tooltip={label}
                className='size-8! justify-center'
                aria-label={label}
                onClick={openPlansDialog}
              >
                <Gem className='size-4' />
                <span className='sr-only'>{label}</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      ) : (
        <div>
          {active ? (
            <Link
              to='/profile'
              onClick={() => setOpenMobile(false)}
              className='bg-primary text-primary-foreground hover:brightness-105 dark:hover:bg-primary/90 flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-medium shadow-xs transition-all duration-200 active:scale-[0.98] dark:bg-primary [background-image:var(--portal-gradient)] dark:[background-image:none]'
            >
              {label}
            </Link>
          ) : (
            <button
              type='button'
              onClick={openPlansDialog}
              className='bg-primary text-primary-foreground hover:brightness-105 dark:hover:bg-primary/90 flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-medium shadow-xs transition-all duration-200 active:scale-[0.98] dark:bg-primary [background-image:var(--portal-gradient)] dark:[background-image:none]'
            >
              {label}
            </button>
          )}
        </div>
      )}

      <PlansPickerDialog open={plansOpen} onOpenChange={setPlansOpen} />
    </>
  )
}
