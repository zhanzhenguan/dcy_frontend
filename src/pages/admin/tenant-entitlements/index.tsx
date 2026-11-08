import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Coins, Gift, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageShell } from '@/components/layout/PageShell'
import { getApiErrorMessage } from '@/services/api/apiError'
import { adjustTenantCredits } from '@/services/api/creditApi'
import {
  grantSubscription,
  listGrantableAdminSubscriptionPlans,
} from '@/services/api/subscriptionApi'
import {
  searchAdminTenants,
  type AdminTenantPreview,
} from '@/services/api/tenantApi'
import { BenefitPanel } from './benefit-panel'

type GrantableOption = {
  id: string
  label: string
}

export const TenantEntitlements = () => {
  const [tenant, setTenant] = useState<AdminTenantPreview | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditSource, setCreditSource] = useState<
    'COMPENSATION' | 'MANUAL_ADJUST'
  >('MANUAL_ADJUST')
  const [creditRemark, setCreditRemark] = useState('')
  const [billingOptionId, setBillingOptionId] = useState('')
  const tenantType = tenant?.tenant_type

  const plansQuery = useQuery({
    queryKey: ['admin-subscription-plans', 'grantable', tenantType],
    queryFn: () => listGrantableAdminSubscriptionPlans(tenantType!),
    enabled: Boolean(tenantType),
  })
  const options = useMemo<GrantableOption[]>(() => {
    if (!tenantType) return []
    return (plansQuery.data ?? []).flatMap((plan) => {
      if (
        plan.tenant_type !== tenantType ||
        !plan.enabled ||
        plan.current_version.status !== 'ACTIVE'
      ) {
        return []
      }
      return plan.current_version.billing_options
        .filter((option) => option.enabled && option.option_type === 'NORMAL')
        .map((option) => ({
          id: option.id,
          label: `${plan.name} · ${plan.current_version.version_no} · ${periodLabel(option.billing_period)} · ${plan.current_version.points_amount} 积分`,
        }))
    })
  }, [plansQuery.data, tenantType])

  const selectTenant = (nextTenant: AdminTenantPreview | null) => {
    setTenant(nextTenant)
    setBillingOptionId('')
  }

  const creditMutation = useMutation({
    mutationFn: adjustTenantCredits,
    onSuccess: (account) => {
      toast.success(`积分已发放，当前余额 ${account.balance.toLocaleString()}`)
      setCreditAmount('')
      setCreditRemark('')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '积分发放失败')),
  })
  const subscriptionMutation = useMutation({
    mutationFn: ({
      tenantId,
      optionId,
    }: {
      tenantId: string
      optionId: string
    }) => grantSubscription(tenantId, optionId),
    onSuccess: (result) => {
      toast.success(`已发放 ${result.plan_name} 订阅权益`)
      setBillingOptionId('')
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '订阅权益发放失败')),
  })

  const submitCredit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number(creditAmount)
    if (!tenant || !Number.isSafeInteger(amount) || amount <= 0) {
      toast.error('请选择租户并填写正整数积分')
      return
    }
    creditMutation.mutate({
      tenant_public_id: tenant.public_id,
      amount,
      source_type: creditSource,
      remark: creditRemark.trim(),
      idempotency_key: crypto.randomUUID(),
    })
  }

  const submitSubscription = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!tenant || !billingOptionId) {
      toast.error('请选择租户和订阅方案')
      return
    }
    subscriptionMutation.mutate({
      tenantId: tenant.public_id,
      optionId: billingOptionId,
    })
  }

  return (
    <PageShell
      title='租户权益发放'
      actions={
        <Button
          variant='outline'
          size='icon'
          title='刷新订阅方案'
          disabled={!tenantType || plansQuery.isFetching}
          onClick={() => void plansQuery.refetch()}
        >
          <RefreshCw className={plansQuery.isFetching ? 'animate-spin' : ''} />
        </Button>
      }
      surfaceClassName='space-y-6'
    >
      <TenantSelector tenant={tenant} onSelect={selectTenant} />
      {tenant && <TenantPreview tenant={tenant} />}

      <div className='grid gap-6 xl:grid-cols-2'>
        <form
          className='space-y-5 rounded-xl border p-5'
          onSubmit={submitCredit}
        >
          <div className='flex items-center gap-2 text-base font-semibold'>
            <Coins className='size-4 text-amber-600' />
            增加积分
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field label='积分数量' htmlFor='grant-credit-amount'>
              <Input
                id='grant-credit-amount'
                inputMode='numeric'
                min='1'
                placeholder='例如 1000'
                value={creditAmount}
                onChange={(event) => setCreditAmount(event.target.value)}
              />
            </Field>
            <Field label='发放类型' htmlFor='grant-credit-source'>
              <Select
                value={creditSource}
                onValueChange={(value) =>
                  setCreditSource(value as typeof creditSource)
                }
              >
                <SelectTrigger id='grant-credit-source' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='MANUAL_ADJUST'>人工调整</SelectItem>
                  <SelectItem value='COMPENSATION'>补偿</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label='备注' htmlFor='grant-credit-remark'>
            <Textarea
              id='grant-credit-remark'
              rows={3}
              value={creditRemark}
              onChange={(event) => setCreditRemark(event.target.value)}
            />
          </Field>
          <Button type='submit' disabled={creditMutation.isPending}>
            <Coins />
            发放积分
          </Button>
        </form>

        <form
          className='space-y-5 rounded-xl border p-5'
          onSubmit={submitSubscription}
        >
          <div className='flex items-center gap-2 text-base font-semibold'>
            <Gift className='size-4 text-rose-600' />
            发放订阅权益
          </div>
          <Field label='订阅方案' htmlFor='grant-subscription-option'>
            <Select
              value={billingOptionId}
              onValueChange={setBillingOptionId}
              disabled={!tenantType || plansQuery.isLoading}
            >
              <SelectTrigger id='grant-subscription-option' className='w-full'>
                <SelectValue
                  placeholder={
                    !tenantType
                      ? '请先选择目标租户'
                      : plansQuery.isLoading
                        ? '正在加载方案'
                        : options.length === 0
                          ? '该租户类型暂无可发放方案'
                          : '选择订阅方案'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button
            type='submit'
            disabled={
              !tenantType ||
              subscriptionMutation.isPending ||
              plansQuery.isLoading ||
              options.length === 0
            }
          >
            <Gift />
            发放订阅权益
          </Button>
        </form>
      </div>
      <BenefitPanel />
    </PageShell>
  )
}

function TenantSelector({
  tenant,
  onSelect,
}: {
  tenant: AdminTenantPreview | null
  onSelect: (tenant: AdminTenantPreview | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const tenantsQuery = useQuery({
    queryKey: ['admin-tenant-search', keyword],
    queryFn: () => searchAdminTenants({ keyword, page_size: 20 }),
    enabled: open,
  })

  return (
    <Field label='目标租户' htmlFor='tenant-selector'>
      <div className='flex gap-2'>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id='tenant-selector'
              type='button'
              variant='outline'
              role='combobox'
              aria-expanded={open}
              className='h-auto min-h-9 min-w-0 flex-1 justify-between gap-3 py-2 text-left font-normal'
            >
              {tenant ? (
                <span className='min-w-0'>
                  <span className='block truncate'>{tenant.display_name}</span>
                  <span className='text-muted-foreground block truncate font-mono text-xs'>
                    {tenant.public_id}
                  </span>
                </span>
              ) : (
                <span className='text-muted-foreground'>选择租户</span>
              )}
              <ChevronsUpDown className='text-muted-foreground size-4 shrink-0' />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className='w-[min(36rem,calc(100vw-2rem))] p-0'
            align='start'
          >
            <Command shouldFilter={false}>
              <CommandInput
                value={keyword}
                onValueChange={setKeyword}
                placeholder='搜索名称、Owner 昵称或 UUID'
              />
              <CommandList>
                {tenantsQuery.isFetching && (
                  <div className='text-muted-foreground px-3 py-6 text-center text-sm'>
                    正在搜索
                  </div>
                )}
                {!tenantsQuery.isFetching && (
                  <CommandEmpty>没有匹配的租户</CommandEmpty>
                )}
                <CommandGroup>
                  {(tenantsQuery.data?.items ?? []).map((item) => (
                    <CommandItem
                      key={item.public_id}
                      value={item.public_id}
                      onSelect={() => {
                        onSelect(item)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'size-4',
                          item.public_id === tenant?.public_id
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      <span className='min-w-0'>
                        <span className='block truncate'>
                          {item.display_name}
                        </span>
                        <span className='text-muted-foreground block truncate font-mono text-xs'>
                          {item.public_id}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {tenant && (
          <Button
            type='button'
            variant='outline'
            size='icon'
            title='清除已选租户'
            onClick={() => onSelect(null)}
          >
            <X />
          </Button>
        )}
      </div>
    </Field>
  )
}

function TenantPreview({ tenant }: { tenant: AdminTenantPreview }) {
  const subscription =
    tenant.plan_level_name || tenant.plan_level_code || '未订阅'
  return (
    <div className='bg-muted/30 grid gap-4 rounded-xl border p-5 sm:grid-cols-2 xl:grid-cols-4'>
      <div className='min-w-0 xl:col-span-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='truncate font-semibold'>{tenant.display_name}</span>
          <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
            {tenant.status === 'active' ? '正常' : tenant.status}
          </Badge>
          <Badge variant='outline'>
            {tenant.tenant_type === 'ENTERPRISE' ? '企业租户' : '个人租户'}
          </Badge>
        </div>
        <div className='text-muted-foreground mt-1 truncate font-mono text-xs'>
          {tenant.public_id}
        </div>
      </div>
      <PreviewItem label='当前套餐' value={subscription} />
      <PreviewItem
        label='套餐到期'
        value={formatDateTime(tenant.plan_expires_at)}
      />
      <PreviewItem
        label='可用积分'
        value={tenant.available_credit.toLocaleString()}
      />
      <PreviewItem
        label='积分总额'
        value={tenant.credit_balance.toLocaleString()}
      />
      <PreviewItem label='所属行业' value={tenant.industry || '-'} />
    </div>
  )
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='min-w-0'>
      <div className='text-muted-foreground text-xs'>{label}</div>
      <div className='mt-1 truncate text-sm font-medium'>{value}</div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className='space-y-2'>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function periodLabel(period: string) {
  if (period === 'QUARTER') return '季度'
  if (period === 'YEAR') return '年度'
  return '月度'
}

function formatDateTime(value: string) {
  if (!value) return '长期 / 未订阅'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
