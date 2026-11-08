import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Building2,
  Check,
  Copy,
  Crown,
  Gift,
  Settings2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { getPersonalInvitation } from '@/services/api/marketingApi'
import { useAccountBillingNav } from '@/hooks/useAccountBillingNav'
import { canViewCreditDetails } from '@/utils/tenantAccess'
import { useSessionTenant } from '@/hooks/useSessionTenant'
import { resolveTenantPlanDisplay } from '@/utils/subscriptionDisplay'
import { getUserAccount } from '@/utils/user'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/common'
import { CreditRechargeSection } from '@/pages/account/components/CredRechSect'
import { AccountBillingShell } from '@/pages/account/components/AccountBillingShell'
import { UpgradePlansSection } from '@/pages/account/components/UpgrPlanSect'

export const ProfilePage = () => {
  const session = useAuthStore((state) => state.auth.session)
  const { tenant } = useSessionTenant()
  const { isEnterpriseOwner, canManageBilling } = useAccountBillingNav()
  const canOpenCredits = canViewCreditDetails(tenant)
  const [copied, setCopied] = useState(false)
  const { label: subscriptionPlan, displayLabel: subscriptionPlanDisplay } =
    resolveTenantPlanDisplay(tenant)
  const invitationQuery = useQuery({
    queryKey: ['personal-invitation'],
    queryFn: getPersonalInvitation,
  })
  const inviteLink = invitationQuery.data?.referral_code
    ? `${window.location.origin}/sign-up?ref=${encodeURIComponent(invitationQuery.data.referral_code)}`
    : ''

  const handleCopyLink = () => {
    if (!inviteLink) return
    void navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    toast.success('邀请链接已复制到剪贴板！')
    setTimeout(() => setCopied(false), 2000)
  }

  const companyName = tenant?.company_name?.trim() || '未命名企业'
  const companyIndustry = tenant?.industry?.trim() || ''
  const companyLogo = tenant?.logo_url?.trim() || ''
  const loginAccount = session?.user ? getUserAccount(session.user) : ''
  const creditBalance = (session?.credit_balance ?? 0).toLocaleString('en-US')

  const creditBalanceBlock = canOpenCredits ? (
    <Link
      to='/credits'
      className='hover:bg-accent/50 -mx-1.5 inline-flex cursor-pointer items-baseline gap-2 rounded-md px-1.5 py-0.5 pt-1 transition-colors'
      title='查看积分记录'
    >
      <span className='text-primary text-2xl font-bold tracking-tight'>
        {creditBalance}
      </span>
      <span className='text-muted-foreground text-xs font-medium'>剩余积分</span>
    </Link>
  ) : (
    <div
      className='-mx-1.5 inline-flex items-baseline gap-2 px-1.5 py-0.5 pt-1'
      title='仅管理员可查看积分明细'
    >
      <span className='text-primary text-2xl font-bold tracking-tight'>
        {creditBalance}
      </span>
      <span className='text-muted-foreground text-xs font-medium'>剩余积分</span>
    </div>
  )

  return (
    <>
      <AccountBillingShell active='profile' surface={false}>
        {isEnterpriseOwner ? (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <Card className='p-6'>
              <div className='mb-4 flex items-center justify-between gap-3'>
                <h3 className='text-sm font-semibold'>个人信息</h3>
                <Button
                  variant='outline'
                  size='sm'
                  asChild
                  className='gap-1.5 rounded-lg text-xs'
                >
                  <Link to='/profile-settings'>
                    <Settings2 className='size-3.5' />
                    设置
                  </Link>
                </Button>
              </div>
              <div className='flex flex-col gap-6 sm:flex-row sm:items-center'>
                <UserAvatar
                  src={session?.user.avatar_url}
                  alt={session?.user.nickname || '用户头像'}
                  className='size-16 shrink-0 rounded-2xl shadow-xs'
                  imageClassName='rounded-2xl'
                  fallbackClassName='rounded-2xl'
                />
                <div className='space-y-1'>
                  <h2 className='text-xl font-bold tracking-tight'>
                    {session?.user.nickname || '用户'}
                  </h2>
                  {loginAccount ? (
                    <p className='text-muted-foreground font-mono text-sm'>
                      {loginAccount}
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card className='p-6'>
              <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                <h3 className='text-sm font-semibold'>企业信息</h3>
                <Button
                  variant='outline'
                  size='sm'
                  asChild
                  className='gap-1.5 rounded-lg text-xs'
                >
                  <Link to='/organization-settings'>
                    <Settings2 className='size-3.5' />
                    设置
                    <ArrowRight className='size-3.5' />
                  </Link>
                </Button>
              </div>
              <div className='flex flex-col gap-6 sm:flex-row sm:items-center'>
                <div className='relative shrink-0'>
                  <div className='bg-muted flex size-16 items-center justify-center overflow-hidden rounded-2xl border shadow-xs'>
                    {companyLogo ? (
                      <img
                        src={companyLogo}
                        alt={`${companyName} Logo`}
                        className='size-full object-contain'
                      />
                    ) : (
                      <Building2 className='text-muted-foreground size-8' />
                    )}
                  </div>
                  <Badge className='absolute -right-2 -bottom-2 border-transparent bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.5 text-[10px] text-white shadow-xs'>
                    <Crown className='me-1 size-3' /> {subscriptionPlanDisplay}
                  </Badge>
                </div>
                <div className='space-y-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h2 className='text-xl font-bold tracking-tight'>
                      {companyName}
                    </h2>
                    <Badge variant='outline'>
                      {subscriptionPlan === '未开通'
                        ? subscriptionPlan
                        : `${subscriptionPlan} 套餐`}
                    </Badge>
                  </div>
                  {companyIndustry ? (
                    <p className='text-muted-foreground text-sm'>
                      所属行业：{companyIndustry}
                    </p>
                  ) : (
                    <p className='text-muted-foreground text-sm'>
                      尚未填写所属行业
                    </p>
                  )}
                  {creditBalanceBlock}
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card className='p-6'>
            <div className='flex flex-col gap-6 sm:flex-row sm:items-center'>
              <div className='relative shrink-0'>
                <UserAvatar
                  src={session?.user.avatar_url}
                  alt={session?.user.nickname || '用户头像'}
                  className='size-16 rounded-2xl shadow-xs'
                  imageClassName='rounded-2xl'
                  fallbackClassName='rounded-2xl'
                />
                <Badge className='absolute -right-2 -bottom-2 border-transparent bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.5 text-[10px] text-white shadow-xs'>
                  <Crown className='me-1 size-3' /> {subscriptionPlanDisplay}
                </Badge>
              </div>

              <div className='space-y-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h2 className='text-xl font-bold tracking-tight'>
                    {session?.user.nickname || '用户'}
                  </h2>
                  <Badge variant='outline'>
                    {subscriptionPlan === '未开通'
                      ? subscriptionPlan
                      : `${subscriptionPlan} 套餐`}
                  </Badge>
                  <Button
                    variant='outline'
                    size='sm'
                    asChild
                    className='gap-1.5 rounded-lg text-xs'
                  >
                    <Link to='/profile-settings'>
                      <Settings2 className='size-3.5' />
                      设置
                    </Link>
                  </Button>
                </div>

                {loginAccount ? (
                  <p className='text-muted-foreground font-mono text-sm'>
                    {loginAccount}
                  </p>
                ) : null}

                {creditBalanceBlock}
              </div>
            </div>
          </Card>
        )}

        {canManageBilling ? (
          <>
            <UpgradePlansSection />
            <CreditRechargeSection />
          </>
        ) : null}

        <Card className='space-y-6 p-6'>
          <div className='flex flex-col justify-between gap-6 lg:flex-row lg:items-center'>
            <div className='flex items-start gap-4'>
              <div className='flex size-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'>
                <Gift className='size-6' />
              </div>
              <div className='space-y-1'>
                <h2 className='text-lg font-bold tracking-tight'>分享赚积分</h2>
                <p className='text-muted-foreground max-w-xl text-xs sm:text-sm'>
                  分享个人邀请链接，好友完成注册后将按当前营销活动规则获得积分奖励。
                </p>
              </div>
            </div>
          </div>

          <div className='flex flex-col items-stretch gap-3 sm:flex-row'>
            <Input
              readOnly
              value={inviteLink}
              placeholder={
                invitationQuery.isLoading
                  ? '正在生成个人邀请链接...'
                  : '邀请链接暂不可用'
              }
              className='font-mono text-xs sm:text-sm'
            />
            <Button
              onClick={handleCopyLink}
              disabled={!inviteLink}
              className='shrink-0 gap-2'
            >
              {copied ? (
                <Check className='size-4' />
              ) : (
                <Copy className='size-4' />
              )}
              <span>{copied ? '已复制' : '复制链接'}</span>
            </Button>
          </div>

          <div className='bg-muted/40 space-y-2 rounded-lg border p-4 text-xs'>
            <h4 className='font-semibold'>邀请规则</h4>
            <div className='text-muted-foreground space-y-1.5'>
              <p>1. 此链接仅用于邀请个人用户注册，不会加入企业或组织。</p>
              <p>2. 每位新用户只能绑定一位邀请人，绑定后不可修改。</p>
              <p>
                3. 注册奖励与邀请奖励可以同时发放，具体积分以当前营销配置为准。
              </p>
            </div>
          </div>
        </Card>
      </AccountBillingShell>
    </>
  )
}
