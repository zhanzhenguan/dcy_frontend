import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Check,
  ChevronsUpDown,
  Pencil,
  Plus,
  Send,
  Ticket,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pagination } from '@/components/common'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createCouponTemplate,
  deleteCouponTemplate,
  getCouponTemplate,
  listCouponTemplates,
  listCouponRecords,
  manualIssueCoupon,
  type CouponTemplate,
  type CouponRecord,
  updateCouponTemplate,
} from '@/services/api/couponApi'
import {
  searchAdminTenants,
  listAdminTenantMembers,
  type AdminTenantPreview,
  type AdminTenantMember,
} from '@/services/api/tenantApi'

export function CouponTemplatesAdminPage() {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [editing, setEditing] = useState<CouponTemplate | null>(null)
  const [deleting, setDeleting] = useState<CouponTemplate | null>(null)
  const [activeTab, setActiveTab] = useState<'templates' | 'issued' | 'used'>(
    'templates'
  )
  const [recordPage, setRecordPage] = useState(1)
  const [recordTemplateId, setRecordTemplateId] = useState('')
  const [recordTenantId, setRecordTenantId] = useState('')
  const query = useQuery({
    queryKey: ['coupon-templates'],
    queryFn: () => listCouponTemplates({ page: 1, page_size: 100 }),
  })
  const recordsQuery = useQuery({
    queryKey: [
      'coupon-records',
      activeTab,
      recordPage,
      recordTemplateId,
      recordTenantId,
    ],
    queryFn: () =>
      listCouponRecords({
        page: recordPage,
        page_size: 20,
        record_type: activeTab === 'used' ? 'USED' : 'ISSUED',
        template_id: recordTemplateId || undefined,
        tenant_public_id: recordTenantId || undefined,
      }),
    enabled: activeTab !== 'templates',
  })
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ['coupon-templates'] })
  const editMutation = useMutation({
    mutationFn: getCouponTemplate,
    onSuccess: setEditing,
    onError: (error) => toast.error(getApiErrorMessage(error, '读取模板失败')),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteCouponTemplate,
    onSuccess: () => {
      toast.success('优惠券模板已删除')
      setDeleting(null)
      refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '删除模板失败')),
  })
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h1 className='text-xl font-semibold'>优惠券中心</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            管理满减券和折扣券模板
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => setIssuing(true)}>
            <Send />
            手动发券
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus />
            新建模板
          </Button>
          <Button asChild variant='outline' size='icon' title='查看我的优惠券'>
            <Link to='/coupons'>
              <Ticket />
            </Link>
          </Button>
        </div>
      </div>
      <Card className='rounded-md'>
        <CardHeader>
          <CardTitle className='text-base'>优惠券管理</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as 'templates' | 'issued' | 'used')
              setRecordPage(1)
            }}
          >
            <TabsList>
              <TabsTrigger value='templates'>优惠券模板</TabsTrigger>
              <TabsTrigger value='issued'>发放记录</TabsTrigger>
              <TabsTrigger value='used'>使用记录</TabsTrigger>
            </TabsList>
            <TabsContent value='templates' className='mt-4'>
              {query.isLoading ? (
                <Skeleton className='h-48' />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>优惠</TableHead>
                      <TableHead>范围</TableHead>
                      <TableHead>有效期</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className='text-right'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.data?.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className='font-medium'>
                          {item.name}
                        </TableCell>
                        <TableCell>
                          {item.coupon_type === 'FULL_REDUCTION'
                            ? `减 ¥${(item.discount_amount / 100).toFixed(2)}`
                            : `${(item.discount_rate / 100).toFixed(1)} 折`}
                        </TableCell>
                        <TableCell>{item.scope}</TableCell>
                        <TableCell>
                          {item.valid_type === 'FIXED'
                            ? item.valid_end_at
                            : `领取后 ${item.valid_duration_days} 天`}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === 'ACTIVE' ? 'default' : 'secondary'
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right'>
                          <Button
                            variant='ghost'
                            size='icon'
                            title='编辑模板'
                            onClick={() => editMutation.mutate(item.id)}
                            disabled={editMutation.isPending}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            title='删除模板'
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 className='text-destructive' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            {(['issued', 'used'] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className='mt-4 space-y-4'>
                <div className='flex flex-wrap gap-2'>
                  <Input
                    className='w-44'
                    placeholder='模板 ID'
                    value={recordTemplateId}
                    onChange={(event) => {
                      setRecordTemplateId(event.target.value)
                      setRecordPage(1)
                    }}
                  />
                  <Input
                    className='w-56'
                    placeholder='租户公开 ID'
                    value={recordTenantId}
                    onChange={(event) => {
                      setRecordTenantId(event.target.value)
                      setRecordPage(1)
                    }}
                  />
                </div>
                <CouponRecordsTable
                  items={recordsQuery.data?.items ?? []}
                  loading={recordsQuery.isLoading}
                  recordType={tab === 'used' ? 'USED' : 'ISSUED'}
                />
                <Pagination
                  currentPage={recordPage}
                  totalPages={Math.max(
                    1,
                    Math.ceil((recordsQuery.data?.total ?? 0) / 20)
                  )}
                  totalItems={recordsQuery.data?.total ?? 0}
                  pageSize={20}
                  onPageChange={setRecordPage}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      {creating && (
        <TemplateDialog onClose={() => setCreating(false)} onSaved={refresh} />
      )}
      {editing && (
        <TemplateDialog
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      {issuing && (
        <ManualIssueDialog
          templates={query.data?.items ?? []}
          onClose={() => setIssuing(false)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title='删除优惠券模板'
        desc={`确定删除“${deleting?.name ?? ''}”吗？已发放过的模板不能删除。`}
        cancelBtnText='取消'
        confirmText='删除'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  )
}

function CouponRecordsTable({
  items,
  loading,
  recordType,
}: {
  items: CouponRecord[]
  loading: boolean
  recordType: 'ISSUED' | 'USED'
}) {
  if (loading) return <Skeleton className='h-40' />
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>优惠券</TableHead>
          <TableHead>租户</TableHead>
          <TableHead>用户</TableHead>
          <TableHead>
            {recordType === 'USED' ? '使用时间' : '发放时间'}
          </TableHead>
          <TableHead>状态</TableHead>
          <TableHead>订单号</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.coupon_id}>
            <TableCell>
              <div className='font-medium'>{item.template_name}</div>
              <div className='text-muted-foreground text-xs'>
                #{item.coupon_id}
              </div>
            </TableCell>
            <TableCell>
              <div>{item.tenant_name}</div>
              <div className='text-muted-foreground text-xs'>
                {item.tenant_public_id}
              </div>
            </TableCell>
            <TableCell>
              <div>{item.user_name || '-'}</div>
              <div className='text-muted-foreground text-xs'>
                #{item.user_id}
              </div>
            </TableCell>
            <TableCell>
              {formatDate(
                recordType === 'USED' ? item.used_at : item.issued_at
              )}
            </TableCell>
            <TableCell>
              <Badge variant={item.status === 'USED' ? 'secondary' : 'default'}>
                {item.status}
              </Badge>
            </TableCell>
            <TableCell>{item.used_order_no || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function formatDate(value: string) {
  return value
    ? new Date(value).toLocaleString('zh-CN', { hour12: false })
    : '-'
}

function TemplateDialog({
  template,
  onClose,
  onSaved,
}: {
  template?: CouponTemplate
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [type, setType] = useState<CouponTemplate['coupon_type']>(
    template?.coupon_type ?? 'FULL_REDUCTION'
  )
  const [threshold, setThreshold] = useState(
    String(template?.threshold_amount ?? 0)
  )
  const [amount, setAmount] = useState(
    String(
      template?.coupon_type === 'FULL_REDUCTION'
        ? template.discount_amount
        : (template?.discount_rate ?? 1000)
    )
  )
  const [capAmount, setCapAmount] = useState(String(template?.cap_amount ?? 0))
  const [scope, setScope] = useState<CouponTemplate['scope']>(
    template?.scope ?? 'ALL'
  )
  const [validType, setValidType] = useState<CouponTemplate['valid_type']>(
    template?.valid_type ?? 'AFTER_ISSUE'
  )
  const [days, setDays] = useState(String(template?.valid_duration_days ?? 7))
  const [validStartAt, setValidStartAt] = useState(
    toLocalDateTime(template?.valid_start_at)
  )
  const [validEndAt, setValidEndAt] = useState(
    toLocalDateTime(template?.valid_end_at)
  )
  const [status, setStatus] = useState<CouponTemplate['status']>(
    template?.status ?? 'ACTIVE'
  )
  const [items, setItems] = useState(
    template?.items
      .map((item) => `${item.item_type}:${item.item_id}`)
      .join(', ') ?? ''
  )
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof createCouponTemplate>[0]) =>
      template
        ? updateCouponTemplate(template.id, input)
        : createCouponTemplate(input),
    onSuccess: () => {
      toast.success(template ? '优惠券模板已更新' : '优惠券模板已创建')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '保存模板失败')),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = positiveInteger(amount)
    const thresholdAmount = nonNegativeInteger(threshold)
    const cap = nonNegativeInteger(capAmount)
    const duration = positiveInteger(days)
    const specifiedItems = parseSpecifiedItems(items)
    if (
      !name.trim() ||
      value === null ||
      thresholdAmount === null ||
      cap === null ||
      (validType === 'AFTER_ISSUE' && duration === null) ||
      (scope === 'SPECIFIED' &&
        (specifiedItems === null || specifiedItems.length === 0))
    ) {
      toast.error('请填写有效的模板信息')
      return
    }
    if (validType === 'FIXED' && (!validStartAt || !validEndAt)) {
      toast.error('请填写固定有效期')
      return
    }
    mutation.mutate({
      name,
      coupon_type: type,
      threshold_amount: thresholdAmount,
      scope,
      valid_type: validType,
      status,
      items: specifiedItems ?? [],
      ...(validType === 'AFTER_ISSUE'
        ? { valid_duration_days: duration ?? undefined }
        : {
            valid_start_at: new Date(validStartAt).toISOString(),
            valid_end_at: new Date(validEndAt).toISOString(),
          }),
      ...(type === 'FULL_REDUCTION'
        ? { discount_amount: value }
        : { discount_rate: value, cap_amount: cap }),
    })
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {template ? '编辑优惠券模板' : '新建优惠券模板'}
          </DialogTitle>
        </DialogHeader>
        <form className='space-y-4' onSubmit={submit}>
          <Field label='名称'>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label='类型'>
            <Select
              value={type}
              onValueChange={(value) => {
                const couponType = value as CouponTemplate['coupon_type']
                setType(couponType)
                setAmount(couponType === 'DISCOUNT' ? '850' : '1000')
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='FULL_REDUCTION'>满减券</SelectItem>
                <SelectItem value='DISCOUNT'>折扣券</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label='使用门槛（分）'>
            <Input
              inputMode='numeric'
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
            />
          </Field>
          <Field
            label={
              type === 'FULL_REDUCTION' ? '满减金额（分）' : '折扣率（千分比）'
            }
          >
            <Input
              inputMode='numeric'
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          {type === 'DISCOUNT' && (
            <Field label='优惠上限（分，0 为不设上限）'>
              <Input
                inputMode='numeric'
                value={capAmount}
                onChange={(event) => setCapAmount(event.target.value)}
              />
            </Field>
          )}
          <Field label='适用范围'>
            <Select
              value={scope}
              onValueChange={(value) =>
                setScope(value as CouponTemplate['scope'])
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>全部</SelectItem>
                <SelectItem value='PACKAGE'>套餐</SelectItem>
                <SelectItem value='RECHARGE'>充值</SelectItem>
                <SelectItem value='SPECIFIED'>指定商品</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {scope === 'SPECIFIED' && (
            <Field label='指定商品（类型:ID，逗号分隔）'>
              <Input
                value={items}
                placeholder='PLAN_VERSION:1, RECHARGE_OPTION:2'
                onChange={(event) => setItems(event.target.value)}
              />
            </Field>
          )}
          <Field label='有效期类型'>
            <Select
              value={validType}
              onValueChange={(value) =>
                setValidType(value as CouponTemplate['valid_type'])
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='AFTER_ISSUE'>领取后生效</SelectItem>
                <SelectItem value='FIXED'>固定有效期</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {validType === 'AFTER_ISSUE' ? (
            <Field label='领取后有效天数'>
              <Input
                inputMode='numeric'
                value={days}
                onChange={(event) => setDays(event.target.value)}
              />
            </Field>
          ) : (
            <>
              <Field label='生效时间'>
                <Input
                  type='datetime-local'
                  value={validStartAt}
                  onChange={(event) => setValidStartAt(event.target.value)}
                />
              </Field>
              <Field label='失效时间'>
                <Input
                  type='datetime-local'
                  value={validEndAt}
                  onChange={(event) => setValidEndAt(event.target.value)}
                />
              </Field>
            </>
          )}
          <Field label='状态'>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as CouponTemplate['status'])
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ACTIVE'>启用</SelectItem>
                <SelectItem value='DISABLED'>停用</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ManualIssueDialog({
  templates,
  onClose,
}: {
  templates: CouponTemplate[]
  onClose: () => void
}) {
  const [templateID, setTemplateID] = useState(templates[0]?.id ?? '')
  const [tenant, setTenant] = useState<AdminTenantPreview | null>(null)
  const [user, setUser] = useState<AdminTenantMember | null>(null)
  const mutation = useMutation({
    mutationFn: manualIssueCoupon,
    onSuccess: () => {
      toast.success('优惠券已发放')
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '发券失败')),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!templateID || !tenant || !user) {
      toast.error('请选择优惠券模板、目标租户和目标用户')
      return
    }
    mutation.mutate({
      template_id: templateID,
      tenant_id: tenant.id,
      user_id: user.user_id,
    })
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>手动发券</DialogTitle>
        </DialogHeader>
        <form className='space-y-4' onSubmit={submit}>
          <Field label='优惠券模板'>
            <Select value={templateID} onValueChange={setTemplateID}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='选择模板' />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <SearchTenantSelector
            tenant={tenant}
            onSelect={(value) => {
              setTenant(value)
              setUser(null)
            }}
          />
          <SearchUserSelector
            tenant={tenant}
            user={user}
            onSelect={setUser}
          />
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              发放
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SearchTenantSelector({
  tenant,
  onSelect,
}: {
  tenant: AdminTenantPreview | null
  onSelect: (tenant: AdminTenantPreview | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const tenantsQuery = useQuery({
    queryKey: ['coupon-issue-tenants', keyword],
    queryFn: () =>
      searchAdminTenants({ keyword: keyword.trim(), page_size: 50 }),
    enabled: open,
  })

  return (
    <Field label='目标租户'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className='h-auto min-h-9 w-full justify-between gap-3 py-2 text-left font-normal'
          >
            <span
              className={cn('truncate', !tenant && 'text-muted-foreground')}
            >
              {tenant?.display_name ?? '搜索并选择租户'}
            </span>
            <ChevronsUpDown className='text-muted-foreground size-4 shrink-0' />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='w-[min(28rem,calc(100vw-2rem))] p-0'
          align='start'
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={keyword}
              onValueChange={setKeyword}
              placeholder='搜索租户名称或 Owner 昵称'
            />
            <CommandList>
              <CommandEmpty>没有匹配的活跃租户</CommandEmpty>
              <CommandGroup>
                {(tenantsQuery.data?.items ?? [])
                  .filter((item) => item.status === 'active')
                  .map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => {
                        onSelect(item)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'size-4',
                          item.id === tenant?.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className='min-w-0 truncate'>
                        {item.display_name}
                        <span className='text-muted-foreground ml-2 text-xs'>
                          {item.tenant_type === 'PERSONAL' ? '个人' : '企业'}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </Field>
  )
}

function SearchUserSelector({
  tenant,
  user,
  onSelect,
}: {
  tenant: AdminTenantPreview | null
  user: AdminTenantMember | null
  onSelect: (user: AdminTenantMember | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const usersQuery = useQuery({
    queryKey: ['coupon-issue-users', tenant?.public_id, keyword],
    queryFn: () =>
      listAdminTenantMembers(tenant!.public_id, {
        keyword: keyword.trim() || undefined,
        page_size: 50,
      }),
    enabled: open && !!tenant,
  })

  return (
    <Field label='目标用户'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            disabled={!tenant}
            className='h-auto min-h-9 w-full justify-between gap-3 py-2 text-left font-normal'
          >
            <span className={cn('truncate', !user && 'text-muted-foreground')}>
              {user
                ? user.nickname || user.email
                : tenant
                  ? '搜索并选择用户'
                  : '请先选择目标租户'}
            </span>
            <ChevronsUpDown className='text-muted-foreground size-4 shrink-0' />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='w-[min(28rem,calc(100vw-2rem))] p-0'
          align='start'
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={keyword}
              onValueChange={setKeyword}
              placeholder='搜索用户昵称或邮箱'
            />
            <CommandList>
              <CommandEmpty>没有匹配的租户成员</CommandEmpty>
              <CommandGroup>
                {(usersQuery.data?.items ?? []).map((item) => (
                  <CommandItem
                    key={item.public_id}
                    value={item.user_id}
                    onSelect={() => {
                      onSelect(item)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'size-4',
                        item.user_id === user?.user_id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <span className='min-w-0 truncate'>
                      {item.nickname || '未设置昵称'}
                      {item.email && (
                        <span className='text-muted-foreground ml-2 text-xs'>
                          {item.email}
                        </span>
                      )}
                      <span className='text-muted-foreground ml-2 text-xs'>
                        {item.role_name}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </Field>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function nonNegativeInteger(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

function positiveInteger(value: string) {
  const parsed = nonNegativeInteger(value)
  return parsed !== null && parsed > 0 ? parsed : null
}

function parseSpecifiedItems(value: string) {
  if (!value.trim()) return []
  const result = value.split(',').map((item) => {
    const [item_type, item_id] = item.trim().split(':')
    return { item_type: item_type?.trim(), item_id: item_id?.trim() }
  })
  return result.every(
    (item) =>
      (item.item_type === 'PLAN_VERSION' ||
        item.item_type === 'RECHARGE_OPTION') &&
      /^[1-9]\d*$/.test(item.item_id ?? '')
  )
    ? (result as CouponTemplate['items'])
    : null
}

function toLocalDateTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
