import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Building2,
  ImageUp,
  Loader2,
  RefreshCw,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { getApiErrorMessage } from '@/services/api/apiError'
import { uploadCreativeAsset } from '@/services/api/creativeApi'
import {
  deactivateCurrentTenant,
  getCurrentTenant,
  listTenantMembers,
  transferCurrentTenant,
  updateCurrentTenant,
} from '@/services/api/tenantApi'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alertDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageSurface } from '@/components/layout/PageSurface'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import { JoinApprovalSettings } from './components/JoinApprovalSettings'

export const OrganizationSettingsPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const updateTenant = useAuthStore((state) => state.auth.updateTenant)
  const switchTenant = useAuthStore((state) => state.auth.switchTenant)
  const [companyName, setCompanyName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [industry, setIndustry] = useState('')
  const [memberPublicId, setMemberPublicId] = useState('')
  const [deactivateName, setDeactivateName] = useState('')

  const tenantQuery = useQuery({
    queryKey: ['current-tenant', tenant?.public_id],
    queryFn: getCurrentTenant,
    enabled: tenant?.tenant_type === 'ENTERPRISE' && tenant.role === 'owner',
  })
  const membersQuery = useQuery({
    queryKey: ['tenant-members', tenant?.public_id],
    queryFn: listTenantMembers,
    enabled: tenant?.tenant_type === 'ENTERPRISE' && tenant.role === 'owner',
  })

  useEffect(() => {
    if (!tenantQuery.data) return
    setCompanyName(tenantQuery.data.company_name)
    setLogoUrl(tenantQuery.data.logo_url)
    setIndustry(tenantQuery.data.industry)
  }, [tenantQuery.data])

  const updateMutation = useMutation({
    mutationFn: updateCurrentTenant,
    onSuccess: (updated) => {
      updateTenant(updated)
      queryClient.setQueryData(['current-tenant', updated.public_id], updated)
      void queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('企业信息已保存')
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '保存企业信息失败')),
  })

  const logoUploadMutation = useMutation({
    mutationFn: uploadCreativeAsset,
    onSuccess: (asset) => {
      setLogoUrl(asset.url)
      toast.success('Logo 上传成功')
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, 'Logo 上传失败，请稍后重试')),
  })

  const handleLogoChange = (file?: File) => {
    if (!file) return
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
      toast.error('仅支持 PNG、JPG、GIF 或 WebP 格式的图片')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB')
      return
    }
    logoUploadMutation.mutate(file)
  }

  const transferMutation = useMutation({
    mutationFn: transferCurrentTenant,
    onSuccess: (updated) => {
      updateTenant(updated)
      void queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('企业已转让，你的角色已调整为 Manager')
      void navigate({ to: '/dashboard' })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '转让企业失败')),
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateCurrentTenant,
    onSuccess: (session) => {
      switchTenant(session)
      queryClient.clear()
      toast.success('企业已注销，当前已切换到个人空间')
      void navigate({ to: '/dashboard' })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '注销企业失败')),
  })

  const current = tenantQuery.data
  const transferCandidates =
    membersQuery.data?.items.filter((member) => member.role.code !== 'owner') ??
    []
  const selectedMember = transferCandidates.find(
    (member) => member.public_id === memberPublicId
  )
  const canDeactivate = Boolean(
    current?.company_name && deactivateName === current.company_name
  )

  if (tenant?.tenant_type !== 'ENTERPRISE' || tenant.role !== 'owner') {
    return (
      <>
        <Header fixed>
          <div className='flex min-w-0 items-center gap-2'>
            <Building2 className='text-primary size-5 shrink-0' />
            <span className='truncate font-medium'>企业设置</span>
          </div>
          <div className='ms-auto flex items-center gap-1'>
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>
        <Main className='space-y-6'>
          <PageSurface>
            <div className='border-destructive/30 bg-destructive/5 text-destructive mx-auto max-w-xl border px-5 py-4 text-sm'>
              企业设置仅对当前企业的 Owner 开放。
            </div>
          </PageSurface>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <Building2 className='text-primary size-5 shrink-0' />
          <span className='truncate font-medium'>企业设置</span>
          {tenant?.company_name ? (
            <Badge variant='outline' className='hidden sm:inline-flex'>
              {tenant.company_name}
            </Badge>
          ) : null}
        </div>
        <div className='ms-auto flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            title='刷新企业信息'
            disabled={tenantQuery.isFetching || membersQuery.isFetching}
            onClick={() => {
              void tenantQuery.refetch()
              void membersQuery.refetch()
            }}
          >
            <RefreshCw
              className={tenantQuery.isFetching ? 'animate-spin' : ''}
            />
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        <PageSurface className='space-y-8'>
          {tenantQuery.isError && (
            <div className='border-destructive/40 bg-destructive/5 text-destructive border px-4 py-3 text-sm'>
              企业信息加载失败：{getApiErrorMessage(tenantQuery.error)}
            </div>
          )}

          <section className='max-w-3xl space-y-5'>
            <div>
              <h2 className='text-lg font-semibold'>基本信息</h2>
              <p className='text-muted-foreground mt-1 text-sm'>
                企业名称会展示在租户切换和管理页面中。
              </p>
            </div>
          <div className='grid gap-5 sm:grid-cols-2'>
                        <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='company-logo'>企业 Logo</Label>
              <div className='flex items-center gap-4'>
                <div className='bg-muted flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border'>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt='企业 Logo 预览'
                      className='size-full object-contain'
                    />
                  ) : (
                    <Building2 className='text-muted-foreground size-8' />
                  )}
                </div>
                <div className='space-y-2'>
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      asChild
                      disabled={logoUploadMutation.isPending}
                    >
                      <label htmlFor='company-logo' className='cursor-pointer'>
                        {logoUploadMutation.isPending ? (
                          <Loader2 className='animate-spin' />
                        ) : (
                          <ImageUp />
                        )}
                        {logoUploadMutation.isPending
                          ? '上传中...'
                          : '上传图片'}
                      </label>
                    </Button>
                    {logoUrl && (
                      <Button
                        type='button'
                        variant='ghost'
                        disabled={logoUploadMutation.isPending}
                        onClick={() => setLogoUrl('')}
                      >
                        <X />
                        移除
                      </Button>
                    )}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    支持 PNG、JPG、GIF、WebP 图片，不超过 10MB
                  </p>
                  <input
                    id='company-logo'
                    type='file'
                    accept='image/png,image/jpeg,image/gif,image/webp'
                    className='hidden'
                    disabled={logoUploadMutation.isPending}
                    onChange={(event) => {
                      handleLogoChange(event.target.files?.[0])
                      event.target.value = ''
                    }}
                  />
                </div>
              </div>
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='company-name'>企业名称</Label>
              <Input
                id='company-name'
                maxLength={128}
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='industry'>所属行业</Label>
              <Input
                id='industry'
                maxLength={64}
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                placeholder='例如：电商、教育、文旅'
              />
            </div>

          </div>
          <Button
            disabled={
              updateMutation.isPending ||
              logoUploadMutation.isPending ||
              companyName.trim().length < 2
            }
            onClick={() =>
              updateMutation.mutate({
                company_name: companyName.trim(),
                logo_url: logoUrl.trim(),
                industry: industry.trim(),
              })
            }
          >
            <Save />
            {updateMutation.isPending ? '保存中...' : '保存修改'}
          </Button>
        </section>

        <JoinApprovalSettings
          tenant={current}
          enabled={Boolean(current) && !tenantQuery.isError}
        />

        <section className='max-w-3xl space-y-5 border-t pt-6'>
          <div>
            <h2 className='text-lg font-semibold'>转让企业</h2>
            <p className='text-muted-foreground mt-1 text-sm'>
              接收成员将成为 Owner，你将自动变更为 Manager。
            </p>
          </div>
          <div className='max-w-md space-y-2'>
            <Label>接收成员</Label>
            <Select value={memberPublicId} onValueChange={setMemberPublicId}>
              <SelectTrigger>
                <SelectValue placeholder='选择企业成员' />
              </SelectTrigger>
              <SelectContent>
                {transferCandidates.map((member) => (
                  <SelectItem key={member.public_id} value={member.public_id}>
                    {member.nickname || member.email} · {member.role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant='outline'
                disabled={!selectedMember || transferMutation.isPending}
              >
                <Send />
                转让企业
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认转让企业？</AlertDialogTitle>
                <AlertDialogDescription>
                  企业将转让给{' '}
                  {selectedMember?.nickname || selectedMember?.email}
                  。确认后你将失去企业管理权限。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    selectedMember &&
                    transferMutation.mutate(selectedMember.public_id)
                  }
                >
                  确认转让
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>

        <section className='border-destructive/40 max-w-3xl space-y-5 border-t pt-6'>
          <div>
            <h2 className='text-destructive text-lg font-semibold'>注销企业</h2>
            <p className='text-muted-foreground mt-1 text-sm'>
              注销后企业立即停止使用，成员无法再访问企业数据，此操作不可撤销。
            </p>
          </div>
          <div className='max-w-md space-y-2'>
            <Label htmlFor='deactivate-name'>
              输入“{current?.company_name}”确认
            </Label>
            <Input
              id='deactivate-name'
              value={deactivateName}
              onChange={(event) => setDeactivateName(event.target.value)}
              autoComplete='off'
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant='destructive'
                disabled={!canDeactivate || deactivateMutation.isPending}
              >
                <Trash2 />
                注销企业
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  永久注销 {current?.company_name}？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  企业和所有成员关系将停止使用。确认后系统会切换到你的个人空间。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  className='bg-destructive hover:bg-destructive/90 text-white'
                  onClick={() =>
                    current && deactivateMutation.mutate(current.company_name)
                  }
                >
                  确认注销
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
        </PageSurface>
      </Main>
    </>
  )
}
