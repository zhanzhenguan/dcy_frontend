import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore, type AuthSession } from '@/stores/authStore'
import { getApiErrorMessage } from '@/services/api/apiError'
import { refreshSessionCreditBalance } from '@/services/api/creditApi'
import {
  acceptTenantInvitation,
  getTenantInvitation,
  listTenants,
  switchTenant,
  type Tenant,
  type TenantInvitationPreview,
} from '@/services/api/tenantApi'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { InvitationNotice, roleScope } from './components/InvitationNotice'
import { InvitationRegisterForm } from './components/InvitationRegisterForm'
import { InvitationSmsForm } from './components/InvitationSmsForm'
import {
  isAlreadyEnterpriseMemberMessage,
  isJoinApprovalPendingMessage,
} from '@/utils/invitationJoinMessages'
import '../auth.scss'

type GuestMode = 'register' | 'sms'

function findJoinedTenant(
  tenants: Tenant[],
  invitation: TenantInvitationPreview
) {
  if (invitation.tenant_public_id) {
    return tenants.find(
      (tenant) => tenant.public_id === invitation.tenant_public_id
    )
  }
  return tenants.find(
    (tenant) =>
      tenant.tenant_type === 'ENTERPRISE' &&
      tenant.company_name === invitation.company_name
  )
}

export const TenantInvitationJoinPage = () => {
  const navigate = useNavigate()
  const { invite } = useSearch({ from: '/(auth)/join/' })
  const session = useAuthStore((state) => state.auth.session)
  const setSession = useAuthStore((state) => state.auth.setSession)
  const applyTenantSwitch = useAuthStore((state) => state.auth.switchTenant)
  const queryClient = useQueryClient()
  const didStartAccept = useRef(false)
  const skipAcceptRef = useRef(false)
  const handledExistingRef = useRef(false)
  const [guestMode, setGuestMode] = useState<GuestMode>('register')
  const [redirecting, setRedirecting] = useState(false)

  const invitationQuery = useQuery({
    queryKey: ['tenant-invitation', invite],
    queryFn: () => getTenantInvitation(invite!),
    enabled: Boolean(invite),
    retry: false,
  })

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants,
    enabled: Boolean(session && invitationQuery.data),
    retry: false,
  })

  async function goWorkbench(message?: string) {
    setRedirecting(true)
    if (message) toast.success(message)
    await navigate({ to: '/dashboard', replace: true })
  }

  async function goSignIn(message?: string) {
    setRedirecting(true)
    if (message) toast.info(message)
    await navigate({
      to: '/sign-in',
      search: { redirect: '/dashboard' },
      replace: true,
    })
  }

  async function enterJoinedEnterprise(tenant: Tenant) {
    skipAcceptRef.current = true
    if (session && session.tenant.public_id !== tenant.public_id) {
      try {
        const data = await switchTenant(tenant.public_id)
        applyTenantSwitch(data)
        try {
          await refreshSessionCreditBalance()
        } catch {
          // ignore
        }
        await queryClient.invalidateQueries({ queryKey: ['tenants'] })
      } catch (error) {
        toast.error(getApiErrorMessage(error, '切换企业失败'))
        setRedirecting(false)
        return
      }
    }
    await goWorkbench('你已是该企业成员，已进入工作台')
  }

  const acceptMutation = useMutation({
    mutationFn: () => acceptTenantInvitation(invite!),
    onSuccess: async (data) => {
      applyTenantSwitch(data)
      try {
        await refreshSessionCreditBalance()
      } catch {
        // ignore; layout will sync credits for the new tenant
      }
      await queryClient.invalidateQueries({ queryKey: ['tenants'] })
      await queryClient.invalidateQueries({ queryKey: ['tenant-members'] })
      await goWorkbench('已加入企业并切换到该企业')
    },
    onError: async (error) => {
      const message = getApiErrorMessage(error, '加入企业失败')
      if (isJoinApprovalPendingMessage(message)) {
        didStartAccept.current = false
        toast.success(message)
        await navigate({ to: '/dashboard' })
        return
      }
      if (isAlreadyEnterpriseMemberMessage(message)) {
        if (session) {
          await goWorkbench('你已是该企业成员，已进入工作台')
        } else {
          await goSignIn('你已加入过该企业，请登录后进入工作台')
        }
        return
      }
      didStartAccept.current = false
      toast.error(message)
    },
  })

  // 已登录：若已在企业成员列表中，不再展示/调用加入，直接进工作台
  useEffect(() => {
    if (
      !session ||
      !invitationQuery.data ||
      !tenantsQuery.data ||
      handledExistingRef.current ||
      skipAcceptRef.current
    )
      return

    const joined = findJoinedTenant(tenantsQuery.data, invitationQuery.data)
    if (!joined) return

    handledExistingRef.current = true
    void enterJoinedEnterprise(joined)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when tenants+invite ready
  }, [session, invitationQuery.data, tenantsQuery.data])

  // 已登录且尚未是成员：自动 accept
  useEffect(() => {
    if (
      skipAcceptRef.current ||
      handledExistingRef.current ||
      !session ||
      !invitationQuery.data ||
      tenantsQuery.isLoading ||
      tenantsQuery.isFetching ||
      !tenantsQuery.data ||
      didStartAccept.current ||
      acceptMutation.isPending
    )
      return

    if (findJoinedTenant(tenantsQuery.data, invitationQuery.data)) return

    didStartAccept.current = true
    acceptMutation.mutate()
  }, [
    acceptMutation,
    invitationQuery.data,
    session,
    tenantsQuery.data,
    tenantsQuery.isFetching,
    tenantsQuery.isLoading,
  ])

  const destination = invite
    ? `/join?invite=${encodeURIComponent(invite)}`
    : '/join'

  async function handleAuthJoinSuccess(nextSession: AuthSession) {
    skipAcceptRef.current = true
    setSession(nextSession)
    try {
      await refreshSessionCreditBalance()
    } catch {
      // ignore
    }
    await queryClient.invalidateQueries({ queryKey: ['tenants'] })
    await queryClient.invalidateQueries({ queryKey: ['tenant-members'] })

    // 开启加入审核时：注册/短信成功会落到个人租户，不代表已加入目标企业
    const invitation = invitationQuery.data
    const joinedTarget = invitation
      ? Boolean(findJoinedTenant([nextSession.tenant], invitation))
      : nextSession.tenant.tenant_type === 'ENTERPRISE'

    if (!joinedTarget) {
      toast.success('已提交加入申请，等待企业审核')
      await navigate({ to: '/dashboard', replace: true })
      return
    }

    toast.success(
      `已加入 ${nextSession.tenant.company_name || '企业'}，欢迎 ${nextSession.user.nickname || nextSession.user.email}`
    )
    await navigate({ to: '/dashboard', replace: true })
  }

  async function handleGuestAlreadyMember() {
    await goSignIn('你已加入过该企业，请登录后进入工作台')
  }

  if (!invite || invitationQuery.isError) {
    return (
      <InvitationNotice
        title='邀请链接无效或已失效'
        detail='请联系企业管理员重新生成邀请链接。'
      />
    )
  }

  if (invitationQuery.isLoading || redirecting) {
    return (
      <InvitationNotice
        title={redirecting ? '正在跳转' : '正在验证邀请链接'}
        detail='请稍候。'
        loading
      />
    )
  }

  const invitation = invitationQuery.data!
  if (session) {
    return (
      <InvitationNotice
        title='正在处理邀请'
        detail={`正在确认与 ${invitation.company_name} 的成员关系…`}
        loading
      />
    )
  }

  return (
    <main className='bg-muted/30 flex min-h-screen items-center justify-center px-4 py-10'>
      <section className='bg-surface w-full max-w-md rounded-2xl border p-6 shadow-sm'>
        <div className='bg-primary/10 text-primary mb-5 flex size-11 items-center justify-center rounded-md'>
          <Building2 className='size-5' />
        </div>
        <h1 className='text-xl font-semibold'>
          {invitation.company_name} 邀请你加入
        </h1>
        <p className='text-muted-foreground mt-2 text-sm'>
          加入后将获得“{invitation.role.name}”角色，并拥有
          {roleScope(invitation.role.data_scope)}权限。一次完成注册并进入该企业。
        </p>
        <p className='text-muted-foreground mt-3 text-xs'>
          邀请有效期至 {new Date(invitation.expires_at).toLocaleString()}。
        </p>

        <div className='mt-5 flex rounded-full bg-slate-100 p-1 text-xs font-semibold'>
          <button
            type='button'
            onClick={() => setGuestMode('register')}
            className={cn(
              'flex-1 cursor-pointer rounded-full py-2 text-center transition-all duration-200',
              guestMode === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            邮箱注册
          </button>
          <button
            type='button'
            onClick={() => setGuestMode('sms')}
            className={cn(
              'flex-1 cursor-pointer rounded-full py-2 text-center transition-all duration-200',
              guestMode === 'sms'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            短信登录
          </button>
        </div>

        <div className='mt-5'>
          {guestMode === 'register' ? (
            <InvitationRegisterForm
              inviteCode={invite}
              onSuccess={handleAuthJoinSuccess}
              onAlreadyMember={handleGuestAlreadyMember}
            />
          ) : (
            <InvitationSmsForm
              inviteCode={invite}
              onSuccess={handleAuthJoinSuccess}
              onAlreadyMember={handleGuestAlreadyMember}
            />
          )}
        </div>

        <div className='mt-5 border-t pt-4 text-center'>
          <p className='text-muted-foreground mb-3 text-xs'>已有账号？</p>
          <Button asChild variant='outline' className='w-full'>
            <Link to='/sign-in' search={{ redirect: destination }}>
              登录后加入企业
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
