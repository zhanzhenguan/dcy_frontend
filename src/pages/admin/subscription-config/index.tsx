import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CirclePlus,
  Eye,
  Layers3,
  Pencil,
  RefreshCw,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import { listAdminDeliveryPlatforms } from '@/services/api/deliveryPlatformApi'
import { listModels } from '@/services/api/modelApi'
import {
  createBillingOption,
  createPlanLevel,
  createPlanVersion,
  createSubscriptionPlan,
  deleteBillingOption,
  deletePlanLevel,
  deletePlanVersion,
  deleteSubscriptionPlan,
  getSubscriptionSettings,
  listAdminSubscriptionPlans,
  listBillingOptions,
  listPlanLevels,
  listPlanVersions,
  setPlanCurrentVersion,
  updateBillingOption,
  updatePlanLevel,
  updatePlanVersion,
  updateSubscriptionPlan,
  updateSubscriptionSettings,
  type BillingOptionInput,
  type PlanBillingOption,
  type PlanCatalogItem,
  type PlanInput,
  type PlanLevel,
  type PlanLevelInput,
  type PlanVersion,
  type PlanVersionInput,
  type ResourceRestriction,
} from '@/services/api/subscriptionApi'
import { getVideoResolutions } from '@/services/api/systemSettingsApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scrollArea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog, Pagination, AnimatedTabs } from '@/components/common'
import { PageShell } from '@/components/layout/PageShell'

type DeleteTarget = {
  kind: '套餐' | '套餐等级' | '套餐版本' | '购买方案'
  id: string
  label: string
}

const VERSION_PAGE_SIZE = 5
/** 与 `vite --mode dev` / `build:dev` 对齐；仅开发环境展示订阅开发模式配置 */
const isDevMode = import.meta.env.MODE === 'dev'

export const SubscriptionConfiguration = () => {
  const queryClient = useQueryClient()
  const [levelDialog, setLevelDialog] = useState<PlanLevel | null | undefined>()
  const [planDialog, setPlanDialog] = useState<
    PlanCatalogItem | null | undefined
  >()
  const [planDialogTenantType, setPlanDialogTenantType] = useState<
    'PERSONAL' | 'ENTERPRISE'
  >('PERSONAL')
  const [catalogTab, setCatalogTab] = useState<'PERSONAL' | 'ENTERPRISE'>(
    'PERSONAL'
  )
  const [mainTab, setMainTab] = useState('plans')
  const [activePlan, setActivePlan] = useState<PlanCatalogItem | null>(null)
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null)
  const levelsQuery = useQuery({
    queryKey: ['plan-levels'],
    queryFn: listPlanLevels,
  })
  const plansQuery = useQuery({
    queryKey: ['admin-subscription-plans'],
    queryFn: listAdminSubscriptionPlans,
  })
  const settingsQuery = useQuery({
    queryKey: ['subscription-settings'],
    queryFn: getSubscriptionSettings,
    enabled: isDevMode,
  })
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['plan-levels'] })
    void queryClient.invalidateQueries({
      queryKey: ['admin-subscription-plans'],
    })
    if (isDevMode) {
      void queryClient.invalidateQueries({ queryKey: ['subscription-settings'] })
    }
    void queryClient.invalidateQueries({ queryKey: ['subscription-plans'] })
  }
  const settingsMutation = useMutation({
    mutationFn: updateSubscriptionSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(['subscription-settings'], settings)
      void queryClient.invalidateQueries({ queryKey: ['subscription-plans'] })
      toast.success(
        settings.development_mode ? '开发模式已开启' : '开发模式已关闭'
      )
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '配置更新失败')),
  })
  const handleMainTabChange = (value: string) => {
    if (!isDevMode && value === 'settings') {
      setMainTab('plans')
      return
    }
    setMainTab(value)
  }
  const deleteMutation = useMutation({
    mutationFn: async (target: DeleteTarget) => {
      if (target.kind === '套餐') return deleteSubscriptionPlan(target.id)
      if (target.kind === '套餐等级') return deletePlanLevel(target.id)
      if (target.kind === '套餐版本') return deletePlanVersion(target.id)
      return deleteBillingOption(target.id)
    },
    onSuccess: () => {
      toast.success('已删除')
      setDeleting(null)
      refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '删除失败')),
  })
  const allPlans = plansQuery.data ?? []
  const personalPlans = sortPlans(
    allPlans.filter((plan) => plan.tenant_type === 'PERSONAL')
  )
  const enterprisePlans = sortPlans(
    allPlans.filter((plan) => plan.tenant_type === 'ENTERPRISE')
  )
  const activeMainTab =
    mainTab === 'settings' && !isDevMode ? 'plans' : mainTab

  return (
    <>
      <PageShell
        title='套餐配置'
        description='按套餐等级、套餐目录、套餐版本和购买方案四层维护对外订阅能力。'
        actions={
          <Button variant='outline' size='icon' title='刷新' onClick={refresh}>
            <RefreshCw
              className={
                plansQuery.isFetching || levelsQuery.isFetching
                  ? 'animate-spin'
                  : ''
              }
            />
          </Button>
        }
        surfaceClassName='space-y-6'
      >
      <Tabs
        value={activeMainTab}
        onValueChange={handleMainTabChange}
        className='gap-6'
      >
        <AnimatedTabs
          variant='pill'
          value={activeMainTab}
          onValueChange={handleMainTabChange}
          items={[
            { value: 'plans', label: '套餐目录' },
            { value: 'levels', label: '套餐等级' },
            ...(isDevMode
              ? [{ value: 'settings', label: '系统设置' }]
              : []),
          ]}
          listClassName='border bg-card shadow-xs'
        />

        <TabsContent value='plans' className='mt-0 space-y-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <p className='text-muted-foreground text-sm'>
              平台级配置：用 Tab 区分个人 / 企业套餐。
            </p>
            <Button
              onClick={() => {
                setPlanDialogTenantType(catalogTab)
                setPlanDialog(null)
              }}
            >
              <CirclePlus /> 新增套餐
            </Button>
          </div>

          <Tabs
            value={catalogTab}
            onValueChange={(value) =>
              setCatalogTab(value as 'PERSONAL' | 'ENTERPRISE')
            }
            className='gap-0 overflow-hidden rounded-xl border'
          >
            <AnimatedTabs
              variant='folder'
              value={catalogTab}
              onValueChange={(value) =>
                setCatalogTab(value as 'PERSONAL' | 'ENTERPRISE')
              }
              items={[
                {
                  value: 'PERSONAL',
                  label: `个人（${personalPlans.length}）`,
                },
                {
                  value: 'ENTERPRISE',
                  label: `企业（${enterprisePlans.length}）`,
                },
              ]}
            />

            <div className='p-4'>
            <TabsContent value='PERSONAL' className='mt-0'>
              <PlanCatalogGrid
                plans={personalPlans}
                loading={plansQuery.isLoading}
                error={plansQuery.error}
                isError={plansQuery.isError}
                emptyText='暂无个人套餐，请先新建。'
                onManageVersions={setActivePlan}
                onEdit={(plan) => {
                  setPlanDialogTenantType(plan.tenant_type)
                  setPlanDialog(plan)
                }}
                onDelete={(plan) =>
                  setDeleting({
                    kind: '套餐',
                    id: plan.id,
                    label: plan.name,
                  })
                }
              />
            </TabsContent>

            <TabsContent value='ENTERPRISE' className='mt-0'>
              <PlanCatalogGrid
                plans={enterprisePlans}
                loading={plansQuery.isLoading}
                error={plansQuery.error}
                isError={plansQuery.isError}
                emptyText='暂无企业套餐，请先新建。'
                onManageVersions={setActivePlan}
                onEdit={(plan) => {
                  setPlanDialogTenantType(plan.tenant_type)
                  setPlanDialog(plan)
                }}
                onDelete={(plan) =>
                  setDeleting({
                    kind: '套餐',
                    id: plan.id,
                    label: plan.name,
                  })
                }
              />
            </TabsContent>
            </div>
          </Tabs>
        </TabsContent>

        <TabsContent value='levels' className='mt-0 space-y-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <p className='text-muted-foreground text-sm'>
              等级编码是权限判断的唯一依据，已被套餐引用的等级应停用而非删除。
            </p>
            <Button onClick={() => setLevelDialog(null)}>
              <CirclePlus /> 新增等级
            </Button>
          </div>
          <div className='overflow-x-auto border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>等级</TableHead>
                  <TableHead>等级数值</TableHead>
                  <TableHead>说明</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className='w-24 text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(levelsQuery.data ?? []).map((level) => (
                  <TableRow key={level.id}>
                    <TableCell>
                      <div className='font-medium'>{level.name}</div>
                      <div className='text-muted-foreground font-mono text-xs'>
                        {level.code}
                      </div>
                    </TableCell>
                    <TableCell>{level.level_value}</TableCell>
                    <TableCell className='text-muted-foreground max-w-sm truncate'>
                      {level.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={level.enabled ? 'default' : 'secondary'}>
                        {level.enabled ? '启用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex justify-end gap-1'>
                        <Button
                          variant='ghost'
                          size='icon'
                          title='编辑'
                          onClick={() => setLevelDialog(level)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          title='删除'
                          onClick={() =>
                            setDeleting({
                              kind: '套餐等级',
                              id: level.id,
                              label: level.name,
                            })
                          }
                        >
                          <Trash2 className='text-destructive' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!levelsQuery.isLoading &&
                  (levelsQuery.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='text-muted-foreground h-28 text-center'
                      >
                        暂无套餐等级
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {isDevMode ? (
          <TabsContent value='settings' className='mt-0'>
            <div className='flex items-center justify-between gap-4 border p-5'>
              <div className='flex min-w-0 items-center gap-3'>
                <span className='bg-muted flex size-9 shrink-0 items-center justify-center rounded-md'>
                  <Settings2 className='size-4' />
                </span>
                <div>
                  <Label htmlFor='subscription-development-mode'>
                    订阅开发模式
                  </Label>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    开启后，可跳过支付完成套餐购买、积分入账和自动续费联调。
                  </p>
                </div>
              </div>
              <Switch
                id='subscription-development-mode'
                checked={settingsQuery.data?.development_mode ?? false}
                disabled={settingsQuery.isLoading || settingsMutation.isPending}
                onCheckedChange={(checked) => settingsMutation.mutate(checked)}
              />
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
      </PageShell>

      {levelDialog !== undefined && (
        <PlanLevelDialog
          level={levelDialog}
          onClose={() => setLevelDialog(undefined)}
          onSaved={refresh}
        />
      )}
      {planDialog !== undefined && (
        <PlanDialog
          plan={planDialog}
          levels={levelsQuery.data ?? []}
          defaultTenantType={planDialogTenantType}
          onClose={() => setPlanDialog(undefined)}
          onSaved={refresh}
        />
      )}
      {activePlan && (
        <PlanVersionsDialog
          plan={activePlan}
          onClose={() => setActivePlan(null)}
          onChanged={refresh}
          onDelete={setDeleting}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`删除${deleting?.kind ?? ''}`}
        desc={`确定删除“${deleting?.label ?? ''}”吗？已被订单或下级配置引用的记录不能删除。`}
        cancelBtnText='取消'
        confirmText='删除'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
    </>
  )
}

function sortPlans(plans: PlanCatalogItem[]) {
  return [...plans].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.name.localeCompare(b.name, 'zh-CN')
  })
}

function PlanCatalogGrid({
  plans,
  loading,
  error,
  isError,
  emptyText,
  onManageVersions,
  onEdit,
  onDelete,
}: {
  plans: PlanCatalogItem[]
  loading: boolean
  error: unknown
  isError: boolean
  emptyText: string
  onManageVersions: (plan: PlanCatalogItem) => void
  onEdit: (plan: PlanCatalogItem) => void
  onDelete: (plan: PlanCatalogItem) => void
}) {
  if (loading) return <LoadingState />
  if (isError) return <ErrorState error={error} />
  if (plans.length === 0) return <EmptyState>{emptyText}</EmptyState>

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      {plans.map((plan) => (
        <div key={plan.id} className='border p-5'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <h3 className='truncate font-semibold'>{plan.name}</h3>
                <Badge variant='outline'>
                  {plan.tenant_type === 'ENTERPRISE' ? '企业' : '个人'}
                </Badge>
                <Badge variant={plan.enabled ? 'default' : 'secondary'}>
                  {plan.enabled ? '启用' : '停用'}
                </Badge>
                {plan.plan_level_code && <Badge>{plan.plan_level_code}</Badge>}
              </div>
              <p className='text-muted-foreground mt-1 font-mono text-xs'>
                {plan.code}
              </p>
              <p className='text-muted-foreground mt-2 text-sm'>
                {plan.description || '暂无套餐说明'}
              </p>
            </div>
            <div className='flex shrink-0 gap-1'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onManageVersions(plan)}
              >
                <Layers3 /> 管理版本
              </Button>
              <Button
                variant='ghost'
                size='icon'
                title='编辑套餐'
                onClick={() => onEdit(plan)}
              >
                <Pencil />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                title='删除套餐'
                onClick={() => onDelete(plan)}
              >
                <Trash2 className='text-destructive' />
              </Button>
            </div>
          </div>
          <div className='mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm'>
            <div>
              <div className='text-muted-foreground text-xs'>当前在售版本</div>
              <div className='mt-1 font-medium'>
                {plan.current_version.id
                  ? plan.current_version.version_no
                  : '尚未设置'}
              </div>
            </div>
            <div>
              <div className='text-muted-foreground text-xs'>购买方案</div>
              <div className='mt-1 font-medium'>
                {(plan.current_version.billing_options ?? []).length} 个
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PlanLevelDialog({
  level,
  onClose,
  onSaved,
}: {
  level: PlanLevel | null
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(level?.code ?? '')
  const [name, setName] = useState(level?.name ?? '')
  const [levelValue, setLevelValue] = useState(String(level?.level_value ?? 0))
  const [description, setDescription] = useState(level?.description ?? '')
  const [enabled, setEnabled] = useState(level?.enabled ?? true)
  const mutation = useMutation({
    mutationFn: (input: PlanLevelInput) =>
      level ? updatePlanLevel(level.id, input) : createPlanLevel(input),
    onSuccess: () => {
      toast.success(level ? '套餐等级已更新' : '套餐等级已创建')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '保存失败')),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate({
      code,
      name,
      level_value: Number(levelValue),
      description,
      enabled,
    })
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{level ? '编辑套餐等级' : '新增套餐等级'}</DialogTitle>
          <DialogDescription>
            等级编码创建后不可修改，并作为功能权限判断依据。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field id='level-code' label='等级编码'>
              <Input
                id='level-code'
                value={code}
                disabled={Boolean(level)}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder='PRO'
                required
              />
            </Field>
            <Field id='level-name' label='等级名称'>
              <Input
                id='level-name'
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder='专业版'
                required
              />
            </Field>
            <Field id='level-value' label='等级数值'>
              <Input
                id='level-value'
                type='number'
                min='0'
                value={levelValue}
                onChange={(event) => setLevelValue(event.target.value)}
                required
              />
            </Field>
            <div className='flex items-end gap-2 pb-2'>
              <Switch
                id='level-enabled'
                checked={enabled}
                onCheckedChange={setEnabled}
              />
              <Label htmlFor='level-enabled'>启用等级</Label>
            </div>
          </div>
          <Field id='level-description' label='等级说明'>
            <Textarea
              id='level-description'
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? '保存中' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PlanDialog({
  plan,
  levels,
  defaultTenantType = 'PERSONAL',
  onClose,
  onSaved,
}: {
  plan: PlanCatalogItem | null
  levels: PlanLevel[]
  defaultTenantType?: 'PERSONAL' | 'ENTERPRISE'
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(plan?.code ?? '')
  const [name, setName] = useState(plan?.name ?? '')
  const [tenantType, setTenantType] = useState<'PERSONAL' | 'ENTERPRISE'>(
    plan?.tenant_type ?? defaultTenantType
  )
  const [levelCode, setLevelCode] = useState(
    plan?.plan_level_code || levels.find((level) => level.enabled)?.code || ''
  )
  const [description, setDescription] = useState(plan?.description ?? '')
  const [enabled, setEnabled] = useState(plan?.enabled ?? true)
  const mutation = useMutation({
    mutationFn: (input: PlanInput) =>
      plan
        ? updateSubscriptionPlan(plan.id, input)
        : createSubscriptionPlan(input),
    onSuccess: () => {
      toast.success(
        plan ? '套餐目录已更新' : '套餐目录已创建，请继续新增套餐版本'
      )
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '保存失败')),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const input: PlanInput = {
      code,
      name,
      tenant_type: tenantType,
      plan_level_code: levelCode,
      enabled,
      sort_order: plan?.sort_order ?? 10,
      description,
    }
    mutation.mutate(input)
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>{plan ? '编辑套餐目录' : '新增套餐目录'}</DialogTitle>
          <DialogDescription>
            套餐本身描述售卖对象；积分、权益、价格请在后续版本与购买方案中配置。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field id='plan-code' label='套餐编码'>
              <Input
                id='plan-code'
                value={code}
                disabled={Boolean(plan)}
                onChange={(event) => setCode(event.target.value.toLowerCase())}
                placeholder='pro_personal'
                required
              />
            </Field>
            <Field id='plan-name' label='套餐名称'>
              <Input
                id='plan-name'
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder='专业版'
                required
              />
            </Field>
            <Field id='plan-tenant-type' label='适用对象'>
              <Select
                value={tenantType}
                disabled={Boolean(plan)}
                onValueChange={(value: 'PERSONAL' | 'ENTERPRISE') =>
                  setTenantType(value)
                }
              >
                <SelectTrigger id='plan-tenant-type' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='PERSONAL'>个人</SelectItem>
                  <SelectItem value='ENTERPRISE'>企业</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field id='plan-level-code' label='套餐等级'>
              <Select value={levelCode} onValueChange={setLevelCode}>
                <SelectTrigger id='plan-level-code' className='w-full'>
                  <SelectValue placeholder='选择套餐等级' />
                </SelectTrigger>
                <SelectContent>
                  {levels
                    .filter((level) => level.enabled)
                    .map((level) => (
                      <SelectItem key={level.id} value={level.code}>
                        {level.name} ({level.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <div className='flex items-end gap-2 pb-2'>
              <Switch
                id='plan-enabled'
                checked={enabled}
                onCheckedChange={setEnabled}
              />
              <Label htmlFor='plan-enabled'>启用套餐</Label>
            </div>
          </div>
          <Field id='plan-description' label='套餐说明'>
            <Textarea
              id='plan-description'
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending || !levelCode}>
              {mutation.isPending ? '保存中' : plan ? '保存套餐' : '创建套餐'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PlanVersionsDialog({
  plan,
  onClose,
  onChanged,
  onDelete,
}: {
  plan: PlanCatalogItem
  onClose: () => void
  onChanged: () => void
  onDelete: (target: DeleteTarget) => void
}) {
  const queryClient = useQueryClient()
  const [versionDialog, setVersionDialog] = useState<
    PlanVersion | null | undefined
  >()
  const [billingVersion, setBillingVersion] = useState<PlanVersion | null>(null)
  const [showAllVersions, setShowAllVersions] = useState(true)
  const [versionPage, setVersionPage] = useState(1)
  const versionsQuery = useQuery({
    queryKey: ['plan-versions', plan.id],
    queryFn: () => listPlanVersions(plan.id),
  })
  const setCurrentMutation = useMutation({
    mutationFn: (versionId: string) =>
      setPlanCurrentVersion(plan.id, versionId),
    onSuccess: () => {
      toast.success('套餐版本已发布，存量订阅继续使用原版本')
      onChanged()
      void queryClient.invalidateQueries({
        queryKey: ['plan-versions', plan.id],
      })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '切换失败')),
  })
  const versions = versionsQuery.data ?? []
  const visibleVersions = showAllVersions
    ? versions
    : versions.filter((version) => version.id === plan.current_version.id)
  const totalVersionPages = Math.max(
    1,
    Math.ceil(visibleVersions.length / VERSION_PAGE_SIZE)
  )
  const currentVersionPage = Math.min(versionPage, totalVersionPages)
  const pagedVersions = showAllVersions
    ? visibleVersions.slice(
        (currentVersionPage - 1) * VERSION_PAGE_SIZE,
        currentVersionPage * VERSION_PAGE_SIZE
      )
    : visibleVersions

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='flex h-[min(46rem,92vh)] flex-col overflow-hidden sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>{plan.name} · 套餐版本</DialogTitle>
          <DialogDescription>
            草稿发布后即成为不可变快照，新购买使用新版本，存量订阅继续使用原版本。
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-wrap items-center justify-between gap-3 border-y py-3'>
          <div className='flex items-center gap-2'>
            <Switch
              id='show-all-plan-versions'
              checked={showAllVersions}
              onCheckedChange={(checked) => {
                setShowAllVersions(checked)
                setVersionPage(1)
              }}
            />
            <Label htmlFor='show-all-plan-versions'>显示所有版本</Label>
          </div>
          <Button onClick={() => setVersionDialog(null)}>
            <CirclePlus /> 新增版本
          </Button>
        </div>
        <ScrollArea className='min-h-0 flex-1 pr-3'>
          {versionsQuery.isLoading ? (
            <LoadingState />
          ) : visibleVersions.length === 0 ? (
            <EmptyState>
              {versions.length === 0
                ? '暂无版本，请先新增一个版本。'
                : '暂无当前生效版本。'}
            </EmptyState>
          ) : (
            <div className='space-y-3 py-1'>
              {pagedVersions.map((version) => (
                <div key={version.id} className='border p-4'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div>
                      <div className='flex items-center gap-2 font-semibold'>
                        {version.version_no}
                        {plan.current_version.id === version.id && (
                          <Badge>当前在售</Badge>
                        )}
                        <Badge
                          variant={
                            version.status === 'ACTIVE'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {version.status === 'ACTIVE'
                            ? '生效'
                            : version.status === 'RETIRED'
                              ? '已退役'
                              : '草稿'}
                        </Badge>
                        <Badge variant='outline'>
                          {version.plan_level_code}
                        </Badge>
                      </div>
                      <p className='text-muted-foreground mt-1 text-xs'>
                        {version.points_amount.toLocaleString()} 积分
                      </p>
                      <p className='text-muted-foreground mt-1 text-xs'>
                        发布时间：{formatPublishedAt(version.published_at)}
                      </p>
                    </div>
                    <div className='flex gap-1'>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={
                          version.status !== 'DRAFT' ||
                          setCurrentMutation.isPending
                        }
                        onClick={() => setCurrentMutation.mutate(version.id)}
                      >
                        发布版本
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        title={
                          version.status === 'DRAFT' ? '编辑版本' : '查看版本'
                        }
                        onClick={() => setVersionDialog(version)}
                      >
                        {version.status === 'DRAFT' ? <Pencil /> : <Eye />}
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        title='删除版本'
                        disabled={version.status !== 'DRAFT'}
                        onClick={() =>
                          onDelete({
                            kind: '套餐版本',
                            id: version.id,
                            label: version.version_no,
                          })
                        }
                      >
                        <Trash2 className='text-destructive' />
                      </Button>
                    </div>
                  </div>
                  <div className='mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3'>
                    <div className='text-muted-foreground text-sm'>
                      购买方案：{version.billing_options.length} 个
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setBillingVersion(version)}
                    >
                      <Sparkles /> 管理购买方案
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {showAllVersions && visibleVersions.length > 0 && (
          <Pagination
            currentPage={currentVersionPage}
            totalPages={totalVersionPages}
            totalItems={visibleVersions.length}
            pageSize={VERSION_PAGE_SIZE}
            onPageChange={setVersionPage}
            className='shrink-0 border-t pt-3 pb-0'
          />
        )}
        {versionDialog !== undefined && (
          <PlanVersionDialog
            plan={plan}
            version={versionDialog}
            versions={versions}
            onClose={() => setVersionDialog(undefined)}
            onSaved={() => {
              onChanged()
              void queryClient.invalidateQueries({
                queryKey: ['plan-versions', plan.id],
              })
            }}
          />
        )}
        {billingVersion && (
          <BillingOptionsDialog
            version={billingVersion}
            onClose={() => setBillingVersion(null)}
            onChanged={() => {
              onChanged()
              void queryClient.invalidateQueries({
                queryKey: ['plan-versions', plan.id],
              })
            }}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PlanVersionDialog({
  plan,
  version,
  versions,
  onClose,
  onSaved,
}: {
  plan: PlanCatalogItem
  version: PlanVersion | null
  versions: PlanVersion[]
  onClose: () => void
  onSaved: () => void
}) {
  const [versionNo, setVersionNo] = useState(
    version?.version_no ?? nextVersionNo(versions)
  )
  const [points, setPoints] = useState(String(version?.points_amount ?? 0))
  const readonly = Boolean(version && version.status !== 'DRAFT')
  const [benefits, setBenefits] = useState(
    benefitsToLines(version?.benefits ?? '')
  )
  const initialResources = version?.resource_config.resources ?? []
  const [resources, setResources] = useState<ResourceRestriction[]>(
    ['video_model', 'video_resolution', 'delivery_platform'].map(
      (key) =>
        initialResources.find((item) => item.key === key) ?? {
          key: key as ResourceRestriction['key'],
          mode: 'allowlist',
          values: [],
        }
    )
  )
  const modelsQuery = useQuery({
    queryKey: ['admin-model-options'],
    queryFn: listModels,
  })
  const resolutionsQuery = useQuery({
    queryKey: ['video-resolutions'],
    queryFn: getVideoResolutions,
  })
  const platformsQuery = useQuery({
    queryKey: ['admin-platform-options'],
    queryFn: listAdminDeliveryPlatforms,
  })
  const mutation = useMutation({
    mutationFn: (input: PlanVersionInput) =>
      version ? updatePlanVersion(version.id, input) : createPlanVersion(input),
    onSuccess: () => {
      toast.success(version ? '套餐版本已更新' : '套餐版本已创建')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '创建失败')),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextVersionNoValue = versionNo.trim()
    if (!nextVersionNoValue) {
      toast.error('请填写版本号')
      return
    }
    const input: PlanVersionInput = {
      plan_id: plan.id,
      version_no: nextVersionNoValue,
      points_amount: Number(points),
      benefits,
      resource_config: {
        schema_version: 1,
        resources,
        limits: version?.resource_config.limits ?? [],
        features: version?.resource_config.features ?? [],
      },
    }
    mutation.mutate(input)
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {readonly
              ? '查看套餐版本'
              : version
                ? '编辑套餐版本'
                : '新增套餐版本'}
          </DialogTitle>
          <DialogDescription>
            每行填写一项套餐权益，并选择该版本允许使用的系统资源。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field id='version-no' label='版本号'>
              <Input
                id='version-no'
                value={versionNo}
                disabled={readonly}
                onChange={(event) => setVersionNo(event.target.value)}
                placeholder='例如 V1'
                required
              />
              {!version && (
                <p className='text-muted-foreground text-xs'>
                  已按已有版本预填，可自行修改。
                </p>
              )}
            </Field>
            <Field id='version-level' label='套餐等级'>
              <Input id='version-level' value={plan.plan_level_code} disabled />
              <p className='text-muted-foreground text-xs'>
                继承自套餐目录，版本保存后作为历史等级快照。
              </p>
            </Field>
            <Field id='version-points' label='套餐积分额度'>
              <Input
                id='version-points'
                type='number'
                min='0'
                value={points}
                disabled={readonly}
                onChange={(event) => setPoints(event.target.value)}
                required
              />
            </Field>
          </div>
          <Field id='version-benefits' label='权益配置'>
            <Textarea
              id='version-benefits'
              rows={5}
              value={benefits}
              disabled={readonly}
              onChange={(event) => setBenefits(event.target.value)}
              placeholder={'每月 600 积分\n高清视频导出\n支持商用授权'}
            />
          </Field>
          <ResourceRestrictionEditor
            title='视频生成模型'
            restriction={resources.find((item) => item.key === 'video_model')!}
            options={(modelsQuery.data?.items ?? []).map((item) => ({
              value: item.id,
              label: `${item.provider_name} / ${item.name}${item.edition ? ` / ${item.edition}` : ''}`,
            }))}
            disabled={readonly}
            onChange={(next) =>
              setResources((items) =>
                items.map((item) => (item.key === next.key ? next : item))
              )
            }
          />
          <ResourceRestrictionEditor
            title='允许的分辨率'
            restriction={resources.find(
              (item) => item.key === 'video_resolution'
            )!}
            options={(resolutionsQuery.data?.resolutions ?? []).map(
              (value) => ({ value, label: value })
            )}
            disabled={readonly}
            onChange={(next) =>
              setResources((items) =>
                items.map((item) => (item.key === next.key ? next : item))
              )
            }
          />
          <ResourceRestrictionEditor
            title='允许的发布平台'
            restriction={resources.find(
              (item) => item.key === 'delivery_platform'
            )!}
            options={(platformsQuery.data?.items ?? []).map((item) => ({
              value: item.id,
              label: `${item.name} / ${item.region === 'domestic' ? '国内' : '海外'}${item.status === 'unlisted' ? '（已停用）' : ''}`,
            }))}
            disabled={readonly}
            onChange={(next) =>
              setResources((items) =>
                items.map((item) => (item.key === next.key ? next : item))
              )
            }
          />
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            {!readonly && (
              <Button type='submit' disabled={mutation.isPending}>
                {mutation.isPending
                  ? '保存中'
                  : version
                    ? '保存版本'
                    : '创建版本'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ResourceRestrictionEditor({
  title,
  restriction,
  options,
  disabled,
  onChange,
}: {
  title: string
  restriction: ResourceRestriction
  options: { value: string; label: string }[]
  disabled: boolean
  onChange: (value: ResourceRestriction) => void
}) {
  const allOptionValues = options.map((option) => option.value)
  const allAvailable =
    restriction.mode === 'all' ||
    (allOptionValues.length > 0 &&
      allOptionValues.every((value) => restriction.values.includes(value)))

  const toggle = (value: string, checked: boolean) => {
    const selectedValues =
      restriction.mode === 'all' ? allOptionValues : restriction.values
    const values = checked
      ? [...selectedValues, value]
      : selectedValues.filter((item) => item !== value)
    onChange({ ...restriction, mode: 'allowlist', values })
  }
  return (
    <section className='space-y-3 border-t pt-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Label>{title}</Label>
        <div className='flex items-center gap-2'>
          <Switch
            checked={allAvailable}
            disabled={disabled || options.length === 0}
            onCheckedChange={(checked) =>
              onChange({
                ...restriction,
                mode: 'allowlist',
                values: checked ? allOptionValues : [],
              })
            }
          />
          <span className='text-muted-foreground text-sm'>全部可用</span>
        </div>
      </div>
      <div className='grid gap-2 sm:grid-cols-2'>
        {options.map((option) => (
          <label
            key={option.value}
            className='flex min-h-9 items-center gap-2 border px-3 py-2 text-sm'
          >
            <Checkbox
              checked={
                restriction.mode === 'all' ||
                restriction.values.includes(option.value)
              }
              disabled={disabled}
              onCheckedChange={(checked) =>
                toggle(option.value, checked === true)
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
        {options.length === 0 && (
          <p className='text-muted-foreground text-sm'>暂无可配置项</p>
        )}
      </div>
    </section>
  )
}

function BillingOptionsDialog({
  version,
  onClose,
  onChanged,
  onDelete,
}: {
  version: PlanVersion
  onClose: () => void
  onChanged: () => void
  onDelete: (target: DeleteTarget) => void
}) {
  const queryClient = useQueryClient()
  const [optionDialog, setOptionDialog] = useState<
    PlanBillingOption | null | undefined
  >()
  const optionsQuery = useQuery({
    queryKey: ['billing-options', version.id],
    queryFn: () => listBillingOptions(version.id),
  })
  const options = optionsQuery.data ?? version.billing_options
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {version.version_no} · 购买方案
            {version.status === 'DRAFT' ? '（草稿）' : '（已发布）'}
          </DialogTitle>
          <DialogDescription>
            {version.status === 'DRAFT'
              ? '修改仅保存到当前草稿，点击“发布版本”后才会应用到用户端。'
              : '已发布版本是不可变快照，购买方案仅可查看。'}
          </DialogDescription>
        </DialogHeader>
        {version.status === 'DRAFT' && (
          <div className='flex justify-end'>
            <Button onClick={() => setOptionDialog(null)}>
              <CirclePlus /> 新增购买方案
            </Button>
          </div>
        )}
        {optionsQuery.isLoading ? (
          <LoadingState />
        ) : options.length === 0 ? (
          <EmptyState>暂无购买方案。</EmptyState>
        ) : (
          <div className='divide-y border'>
            {options.map((option) => (
              <div
                key={option.id}
                className='flex flex-wrap items-center justify-between gap-3 p-4'
              >
                <div>
                  <div className='flex flex-wrap items-center gap-2 font-medium'>
                    {billingLabel(option)}
                    {option.auto_renew && <Badge>自动续费</Badge>}
                    <Badge variant={option.enabled ? 'default' : 'secondary'}>
                      {option.enabled ? '启用' : '停用'}
                    </Badge>
                  </div>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    {option.option_type === 'TRIAL'
                      ? `试用 · 积分有效期 ${trialValidityLabel(option.trial_validity_period)}`
                      : `${formatPrice(option)} · ${billingPeriodLabel(option.billing_period)}`}{' '}
                    · 赠送 {option.bonus_points.toLocaleString()} 积分
                  </p>
                </div>
                <div className='flex gap-1'>
                  <Button
                    variant='ghost'
                    size='icon'
                    title={
                      version.status === 'DRAFT'
                        ? '编辑购买方案'
                        : '查看购买方案'
                    }
                    onClick={() => setOptionDialog(option)}
                  >
                    {version.status === 'DRAFT' ? <Pencil /> : <Eye />}
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    title='删除购买方案'
                    disabled={version.status !== 'DRAFT'}
                    onClick={() =>
                      onDelete({
                        kind: '购买方案',
                        id: option.id,
                        label: billingLabel(option),
                      })
                    }
                  >
                    <Trash2 className='text-destructive' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {optionDialog !== undefined && (
          <BillingOptionDialog
            version={version}
            option={optionDialog}
            onClose={() => setOptionDialog(undefined)}
            onSaved={async () => {
              onChanged()
              await Promise.all([
                queryClient.invalidateQueries({
                  queryKey: ['plan-versions'],
                }),
                queryClient.invalidateQueries({
                  queryKey: ['billing-options', version.id],
                }),
              ])
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function BillingOptionDialog({
  version,
  option,
  onClose,
  onSaved,
}: {
  version: PlanVersion
  option: PlanBillingOption | null
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const readonly = version.status !== 'DRAFT'
  const [optionType, setOptionType] = useState<'NORMAL' | 'TRIAL'>(
    option?.option_type ?? 'NORMAL'
  )
  const [period, setPeriod] = useState<'MONTH' | 'QUARTER' | 'YEAR'>(
    option?.billing_period || 'MONTH'
  )
  const [trialValidityPeriod, setTrialValidityPeriod] = useState<
    'MONTH' | 'QUARTER' | 'YEAR' | 'FOREVER'
  >(option?.trial_validity_period || 'MONTH')
  const [autoRenew, setAutoRenew] = useState(option?.auto_renew ?? false)
  const [price, setPrice] = useState(
    option ? String(option.price_cents / 100) : ''
  )
  const [originalPrice, setOriginalPrice] = useState(
    option?.original_price_cents
      ? String(option.original_price_cents / 100)
      : ''
  )
  const [bonusPoints, setBonusPoints] = useState(
    String(option?.bonus_points ?? 0)
  )
  const [currency, setCurrency] = useState(option?.currency ?? 'CNY')
  const [description, setDescription] = useState(option?.description ?? '')
  const [sortOrder, setSortOrder] = useState(String(option?.sort_order ?? 10))
  const [enabled, setEnabled] = useState(option?.enabled ?? true)
  const mutation = useMutation({
    mutationFn: (input: BillingOptionInput) =>
      option
        ? updateBillingOption(option.id, input)
        : createBillingOption(input),
    onSuccess: async () => {
      await onSaved()
      toast.success(
        option
          ? `购买方案已保存到 ${version.version_no} 草稿，发布版本后生效`
          : `购买方案已创建到 ${version.version_no} 草稿，发布版本后生效`
      )
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '创建失败')),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const input: BillingOptionInput = {
      plan_version_id: version.id,
      option_type: optionType,
      billing_period: optionType === 'TRIAL' ? '' : period,
      trial_validity_period: optionType === 'TRIAL' ? trialValidityPeriod : '',
      auto_renew: optionType === 'TRIAL' ? false : autoRenew,
      price_cents: Math.round(Number(price) * 100),
      original_price_cents: originalPrice
        ? Math.round(Number(originalPrice) * 100)
        : 0,
      bonus_points: Number(bonusPoints),
      currency,
      enabled,
      sort_order: Number(sortOrder),
      description,
    }
    mutation.mutate(input)
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            {readonly
              ? '查看购买方案'
              : option
                ? '编辑购买方案'
                : '新增购买方案'}
          </DialogTitle>
          <DialogDescription>
            {readonly
              ? '已生效套餐版本的购买方案仅可查看，不可修改。'
              : '价格、原价和赠送积分仅属于该套餐版本，不会影响历史订单。'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field id='billing-option-type' label='付款方案'>
              <Select
                value={optionType}
                disabled={readonly}
                onValueChange={(value: 'NORMAL' | 'TRIAL') => {
                  setOptionType(value)
                  if (value === 'TRIAL') {
                    setAutoRenew(false)
                  }
                }}
              >
                <SelectTrigger id='billing-option-type' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='NORMAL'>常规付款</SelectItem>
                  <SelectItem value='TRIAL'>试用</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {optionType === 'TRIAL' ? (
              <Field id='trial-validity-period' label='积分有效期'>
                <Select
                  value={trialValidityPeriod}
                  disabled={readonly}
                  onValueChange={(
                    value: 'MONTH' | 'QUARTER' | 'YEAR' | 'FOREVER'
                  ) => setTrialValidityPeriod(value)}
                >
                  <SelectTrigger id='trial-validity-period' className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='MONTH'>一个月</SelectItem>
                    <SelectItem value='QUARTER'>一个季度</SelectItem>
                    <SelectItem value='YEAR'>一年</SelectItem>
                    <SelectItem value='FOREVER'>永不过期</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Field id='billing-period' label='计费周期'>
                <Select
                  value={period}
                  disabled={readonly}
                  onValueChange={(value: 'MONTH' | 'QUARTER' | 'YEAR') =>
                    setPeriod(value)
                  }
                >
                  <SelectTrigger id='billing-period' className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='MONTH'>月付</SelectItem>
                    <SelectItem value='QUARTER'>季付</SelectItem>
                    <SelectItem value='YEAR'>年付</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field id='billing-price' label='实际价格（元）'>
              <Input
                id='billing-price'
                type='number'
                min='0'
                step='0.01'
                value={price}
                disabled={readonly}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </Field>
            <Field id='billing-original-price' label='划线原价（元）'>
              <Input
                id='billing-original-price'
                type='number'
                min='0'
                step='0.01'
                value={originalPrice}
                disabled={readonly}
                onChange={(event) => setOriginalPrice(event.target.value)}
              />
            </Field>
            <Field id='billing-bonus' label='赠送积分'>
              <Input
                id='billing-bonus'
                type='number'
                min='0'
                value={bonusPoints}
                disabled={readonly}
                onChange={(event) => setBonusPoints(event.target.value)}
              />
            </Field>
            <Field id='billing-currency' label='币种'>
              <Input
                id='billing-currency'
                maxLength={3}
                value={currency}
                disabled={readonly}
                onChange={(event) =>
                  setCurrency(event.target.value.toUpperCase())
                }
                required
              />
            </Field>
            <Field id='billing-sort' label='排序'>
              <Input
                id='billing-sort'
                type='number'
                value={sortOrder}
                disabled={readonly}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </Field>
            {optionType !== 'TRIAL' && (
              <div className='flex items-end gap-2 pb-2'>
                <Switch
                  id='billing-auto-renew'
                  checked={autoRenew}
                  disabled={readonly}
                  onCheckedChange={setAutoRenew}
                />
                <Label htmlFor='billing-auto-renew'>自动续费</Label>
              </div>
            )}
            <div className='flex items-end gap-2 pb-2'>
              <Switch
                id='billing-enabled'
                checked={enabled}
                disabled={readonly}
                onCheckedChange={setEnabled}
              />
              <Label htmlFor='billing-enabled'>启用购买方案</Label>
            </div>
          </div>
          <Field id='billing-description' label='购买方案说明'>
            <Input
              id='billing-description'
              value={description}
              disabled={readonly}
              onChange={(event) => setDescription(event.target.value)}
              placeholder='月付方案'
            />
          </Field>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              {readonly ? '关闭' : '取消'}
            </Button>
            {!readonly && (
              <Button type='submit' disabled={mutation.isPending}>
                {mutation.isPending
                  ? '保存中'
                  : option
                    ? '保存方案'
                    : '创建方案'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function benefitsToLines(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string')
        .join('\n')
    }
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed)
        .map(([key, item]) => `${key}：${String(item)}`)
        .join('\n')
    }
  } catch {
    // 兼容已经按逐行文本保存的早期数据。
  }
  return trimmed
}

function formatPublishedAt(value: string) {
  if (!value) return '未发布'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}

function nextVersionNo(versions: PlanVersion[]) {
  const maxVersion = versions.reduce((max, version) => {
    const match = /^V(\d+)$/i.exec(version.version_no.trim())
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `V${maxVersion + 1}`
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
function LoadingState() {
  return (
    <div className='text-muted-foreground flex min-h-32 items-center justify-center border text-sm'>
      正在加载配置...
    </div>
  )
}
function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className='text-muted-foreground flex min-h-32 items-center justify-center border text-sm'>
      {children}
    </div>
  )
}
function ErrorState({ error }: { error: unknown }) {
  return (
    <div className='border-destructive/40 text-destructive border p-4 text-sm'>
      {getApiErrorMessage(error, '加载失败')}
    </div>
  )
}
function billingLabel(option: PlanBillingOption) {
  if (option.option_type === 'TRIAL') {
    return (
      option.description ||
      `试用 · ${trialValidityLabel(option.trial_validity_period)}`
    )
  }
  return (
    option.description || `${billingPeriodLabel(option.billing_period)}方案`
  )
}
function billingPeriodLabel(period: PlanBillingOption['billing_period']) {
  return { MONTH: '月付', QUARTER: '季付', YEAR: '年付', '': '' }[period]
}
function trialValidityLabel(
  period: PlanBillingOption['trial_validity_period']
) {
  return {
    MONTH: '一个月',
    QUARTER: '一个季度',
    YEAR: '一年',
    FOREVER: '永不过期',
    '': '',
  }[period]
}
function formatPrice(option: PlanBillingOption) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: option.currency,
  }).format(option.price_cents / 100)
}
