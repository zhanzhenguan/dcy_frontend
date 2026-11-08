import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Building2, ChevronDown, KeyRound, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import {
  isCurrentEnterpriseManager,
  isCurrentEnterpriseStaff,
  isEnterpriseTenant,
} from '@/utils/tenantAccess'
import { getUserAccount, getUserDisplayName } from '@/utils/user'
import { cn } from '@/utils/utils'
import useDialogState from '@/hooks/useDialStat'
import { useSessionTenant } from '@/hooks/useSessionTenant'
import { formatTenantRoleLabel } from '@/hooks/useTenantSwitch'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdownMenu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAvatar, ChangePasswordDialog, SignOutDialog } from '@/components/common'
import { getApiErrorMessage } from '@/services/api/apiError'
import { createTenant, type CreateTenantInput } from '@/services/api/tenantApi'
import { commonAccountNavItems, roleAccountNavItems } from '@/components/layout/data/sidebarData'
import { buildNavAccessContext, resolveAccountNavItems } from '@/components/layout/navAccess'

/** 与侧栏菜单 hover 一致（覆盖默认 accent） */
const profileMenuItemClass =
  'h-8 gap-2 rounded-lg px-2.5 focus:!bg-sidebar-accent focus:!text-sidebar-accent-foreground data-[highlighted]:!bg-sidebar-accent data-[highlighted]:!text-sidebar-accent-foreground'

type ProfileDropdownProps = {
  /** full：头像+姓名+角色（各页统一默认）；icon：仅头像 */
  variant?: 'full' | 'icon'
  className?: string
}

export const ProfileDropdown = ({
  variant = 'full',
  className,
}: ProfileDropdownProps) => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useDialogState()
  const [passwordOpen, setPasswordOpen] = useDialogState()
  const [createTenantOpen, setCreateTenantOpen] = useState(false)
  const user = useAuthStore((state) => state.auth.user)
  const session = useAuthStore((state) => state.auth.session)
  const tenant = useSessionTenant().tenant
  const isEnterprise = isEnterpriseTenant(tenant)
  const isEnterpriseStaff = isCurrentEnterpriseStaff(tenant)
  const isEnterpriseManager = isCurrentEnterpriseManager(tenant)

  const displayName = user ? getUserDisplayName(user) : 'User'
  const loginAccount = user ? getUserAccount(user) : ''
  const roleLabel = formatTenantRoleLabel(tenant?.role, isEnterprise)

  const accountItems = resolveAccountNavItems(
    commonAccountNavItems,
    roleAccountNavItems,
    buildNavAccessContext({
      user,
      tenant,
      isEnterpriseStaff,
      isEnterpriseManager,
    })
  )

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {variant === 'icon' ? (
            <Button
              variant='ghost'
              className={cn('relative h-8 w-8 rounded-full', className)}
              aria-label='打开用户菜单'
            >
              <UserAvatar
                src={user?.avatar_url}
                alt={displayName}
                className='h-8 w-8'
              />
            </Button>
          ) : (
            <Button
              variant='ghost'
              className={cn(
                'hover:bg-primary/15 hover:text-foreground dark:hover:bg-primary/25 relative h-auto gap-2 rounded-lg px-2 py-1.5 transition-colors',
                className
              )}
              aria-label='打开用户菜单'
            >
              <UserAvatar
                src={user?.avatar_url}
                alt={displayName}
                className='size-9'
              />
              <span className='hidden min-w-0 text-start sm:block'>
                <span className='text-foreground block truncate text-sm font-semibold'>
                  {displayName}
                </span>
                <span className='text-muted-foreground/55 block truncate text-xs'>
                  {roleLabel}
                </span>
              </span>
              <ChevronDown className='text-muted-foreground hidden size-4 sm:block' />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='w-64 rounded-xl border p-1.5 shadow-lg'
          align='end'
          sideOffset={8}
          forceMount
        >
          <DropdownMenuLabel className='px-2.5 py-2.5 font-normal'>
            <div className='flex items-start gap-3'>
              <UserAvatar
                src={user?.avatar_url}
                alt={displayName}
                className='size-10 shrink-0'
              />
              <div className='min-w-0 flex-1 space-y-1'>
                <p className='text-foreground truncate text-sm leading-none font-semibold'>
                  {displayName}
                </p>
                {loginAccount ? (
                  <p className='text-muted-foreground truncate text-xs leading-snug'>
                    {loginAccount}
                  </p>
                ) : null}
                {session?.tenant ? (
                  <p className='text-muted-foreground/80 truncate text-[11px] leading-snug'>
                    当前：
                    {isEnterprise
                      ? session.tenant.company_name || '企业租户'
                      : '个人用户'}
                  </p>
                ) : null}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className='my-1' />
          <DropdownMenuGroup className='space-y-0'>
            <DropdownMenuItem
              onSelect={() => setCreateTenantOpen(true)}
              className={profileMenuItemClass}
            >
              <span className='bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md'>
                <Building2 className='size-3.5' />
              </span>
              创建企业
            </DropdownMenuItem>
            {accountItems.map((item) => (
              <DropdownMenuItem
                key={`${item.title}-${item.url}`}
                asChild
                className={profileMenuItemClass}
              >
                <Link to={item.url}>
                  <span className='bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md'>
                    {item.icon ? <item.icon className='size-3.5' /> : null}
                  </span>
                  {item.title}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onSelect={() => setPasswordOpen(true)}
              className={profileMenuItemClass}
            >
              <span className='bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md'>
                <KeyRound className='size-3.5' />
              </span>
              修改密码
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className='my-1' />
          <DropdownMenuItem
            variant='destructive'
            onClick={() => setOpen(true)}
            className={cn(
              profileMenuItemClass,
              'focus:bg-destructive/10 focus:text-destructive'
            )}
          >
            <span className='bg-destructive/10 text-destructive flex size-6 shrink-0 items-center justify-center rounded-md'>
              <LogOut className='size-3.5' />
            </span>
            退出登录
            <DropdownMenuShortcut className='text-current opacity-70'>
              ⇧⌘Q
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
      <ChangePasswordDialog
        open={!!passwordOpen}
        onOpenChange={setPasswordOpen}
      />
      <CreateTenantDialog
        open={createTenantOpen}
        onOpenChange={setCreateTenantOpen}
        onCreated={() =>
          void queryClient.invalidateQueries({ queryKey: ['tenants'] })
        }
      />
    </>
  )
}

/** 工作台顶栏右侧用户入口；消息铃铛由 ThemeSwitch 左侧统一渲染 */
export const WorkbenchHeaderActions = ({
  className,
}: {
  className?: string
}) => {
  return (
    <div className={cn('ms-auto flex items-center', className)}>
      <ProfileDropdown variant='full' />
    </div>
  )
}

type CreateTenantDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

function CreateTenantDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateTenantDialogProps) {
  const [form, setForm] = useState<CreateTenantInput>({ company_name: '' })
  const mutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      toast.success('企业租户已创建')
      setForm({ company_name: '' })
      onCreated()
      onOpenChange(false)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '创建企业失败')),
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate({
      company_name: form.company_name.trim(),
      logo_url: form.logo_url?.trim() || undefined,
      industry: form.industry?.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>创建企业</DialogTitle>
          <DialogDescription>创建后你将成为该企业的管理员。</DialogDescription>
        </DialogHeader>
        <form className='space-y-4' onSubmit={submit}>
          <div className='space-y-2'>
            <Label htmlFor='tenant-company-name'>企业名称</Label>
            <Input
              id='tenant-company-name'
              required
              minLength={2}
              maxLength={128}
              value={form.company_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  company_name: event.target.value,
                }))
              }
              placeholder='例如：示例科技'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='tenant-industry'>所属行业</Label>
            <Input
              id='tenant-industry'
              maxLength={64}
              value={form.industry ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  industry: event.target.value,
                }))
              }
              placeholder='例如：软件服务'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='tenant-logo-url'>企业 Logo 地址</Label>
            <Input
              id='tenant-logo-url'
              type='url'
              value={form.logo_url ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  logo_url: event.target.value,
                }))
              }
              placeholder='https://example.com/logo.png'
            />
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? '创建中...' : '创建企业'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
