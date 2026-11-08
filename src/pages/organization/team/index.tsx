import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { UsersRound } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { listTenantJoinRequests } from '@/services/api/tenantApi'
import {
  isCurrentEnterpriseOwner,
  isCurrentEnterpriseStaff,
} from '@/utils/tenantAccess'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageSurface } from '@/components/layout/PageSurface'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch, AnimatedTabs } from '@/components/common'
import { OrganizationMembersPage } from './components/members'
import { OrganizationGroupsPage } from './components/groups'
import { OrganizationJoinRequestsPanel } from './components/join-requests'
import type { OrganizationTeamPageProps, TeamTab } from './types'

export const OrganizationTeamPage = ({ tab }: OrganizationTeamPageProps) => {
  const navigate = useNavigate()
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const canAccessTeam = isCurrentEnterpriseStaff(tenant)
  const canReviewJoins = isCurrentEnterpriseOwner(tenant)

  const pendingQuery = useQuery({
    queryKey: ['tenant-join-requests', tenant?.public_id, 'pending'],
    queryFn: () => listTenantJoinRequests('pending'),
    enabled: canReviewJoins && Boolean(tenant?.public_id),
  })
  const pendingCount = pendingQuery.data?.length ?? 0

  const availableTabs = useMemo((): TeamTab[] => {
    if (!canAccessTeam) return []
    return canReviewJoins
      ? ['members', 'groups', 'join-requests']
      : ['members', 'groups']
  }, [canAccessTeam, canReviewJoins])

  const activeTab =
    availableTabs.includes(tab) && availableTabs.length > 0
      ? tab
      : (availableTabs[0] ?? 'members')

  const goTab = (value: string) => {
    void navigate({
      to: '/organization-team',
      search: { tab: value as TeamTab },
    })
  }

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <UsersRound className='text-primary size-5 shrink-0' />
          <span className='truncate font-medium'>团队成员</span>
          {tenant?.company_name && (
            <Badge variant='outline' className='hidden sm:inline-flex'>
              {tenant.company_name}
            </Badge>
          )}
        </div>
        <div className='ms-auto flex items-center gap-1'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        <PageSurface className='overflow-hidden p-0'>
          {!canAccessTeam ? (
            <div className='border-amber-300 bg-amber-50 m-5 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'>
              当前账号没有团队成员管理权限，或尚未切换到企业工作空间。
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={goTab}
              className='gap-0'
            >
              <AnimatedTabs
                variant='pill'
                value={activeTab}
                onValueChange={goTab}
                items={[
                  { value: 'members', label: '成员' },
                  { value: 'groups', label: '分组' },
                  ...(canReviewJoins
                    ? [
                        {
                          value: 'join-requests',
                          label: '待审核',
                          badge:
                            pendingCount > 0 ? String(pendingCount) : undefined,
                        },
                      ]
                    : []),
                ]}
                className='px-5 pt-4'
                listClassName='border bg-card shadow-xs'
              />
              <div className='p-5 pt-4'>
                <TabsContent value='members' className='mt-0'>
                  <OrganizationMembersPage embedded />
                </TabsContent>
                <TabsContent value='groups' className='mt-0'>
                  <OrganizationGroupsPage embedded />
                </TabsContent>
                {canReviewJoins ? (
                  <TabsContent value='join-requests' className='mt-0'>
                    <OrganizationJoinRequestsPanel />
                  </TabsContent>
                ) : null}
              </div>
            </Tabs>
          )}
        </PageSurface>
      </Main>
    </>
  )
}
