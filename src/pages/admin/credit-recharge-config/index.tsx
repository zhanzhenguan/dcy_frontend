import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Eye,
  LayoutList,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createCreditRechargePlan,
  deleteCreditRechargePlan,
  listAdminCreditRechargePlans,
  updateCreditRechargePlan,
  type CreditRechargePlan,
  type CreditRechargePlanInput,
} from '@/services/api/creditRechargeApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common'
import { PageShell } from '@/components/layout/PageShell'
import { CreditRechargeSection } from '@/pages/account/components/CredRechSect'

export const CreditRechargeConfiguration = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'list' | 'preview'>('list')
  const [editing, setEditing] = useState<
    CreditRechargePlan | null | undefined
  >()
  const [deleting, setDeleting] = useState<CreditRechargePlan | null>(null)

  const plansQuery = useQuery({
    queryKey: ['admin-credit-recharge-plans'],
    queryFn: listAdminCreditRechargePlans,
  })

  const plans = plansQuery.data?.items ?? []
  const loading = plansQuery.isFetching

  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ['admin-credit-recharge-plans'],
    })
    void queryClient.invalidateQueries({ queryKey: ['credit-recharge-plans'] })
  }

  const deleteMutation = useMutation({
    mutationFn: deleteCreditRechargePlan,
    onSuccess: () => {
      toast.success('积分充值包已删除')
      setDeleting(null)
      refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '删除失败')),
  })

  return (
    <>
      <PageShell
        title='积分充值策略配置'
        description='管理维护按需购买的积分充值策略、价格、基础与赠送积分额度及前台展现。'
        actions={
          <>
            {/* View Tab Switcher */}
            <div className='bg-muted me-2 flex rounded-lg p-1 text-xs font-medium'>
              <Button
                variant={activeTab === 'list' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setActiveTab('list')}
                className='h-7 gap-1.5 rounded-md px-3 text-xs'
              >
                <LayoutList className='size-3.5' />
                策略列表
              </Button>
              <Button
                variant={activeTab === 'preview' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setActiveTab('preview')}
                className='h-7 gap-1.5 rounded-md px-3 text-xs'
              >
                <Eye className='size-3.5' />
                账户中心卡片预览
              </Button>
            </div>

            <Button
              variant='outline'
              size='icon'
              title='刷新'
              disabled={loading}
              onClick={refresh}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button onClick={() => setEditing(null)}>
              <Plus />
              新增充值包
            </Button>
          </>
        }
        surfaceClassName='space-y-6'
      >
      {activeTab === 'preview' ? (
        <div className='bg-muted/20 space-y-4 rounded-2xl border p-6'>
          <div className='flex items-center justify-between border-b pb-3'>
            <div>
              <h3 className='flex items-center gap-2 text-sm font-semibold'>
                <Eye className='text-primary size-4' />
                账户中心『积分充值』实时渲染预览
              </h3>
              <p className='text-muted-foreground mt-0.5 text-xs'>
                展示当前配置在账户中心呈现的样式
              </p>
            </div>
            <Badge variant='outline'>实时预览</Badge>
          </div>
          <CreditRechargeSection overridePlans={plans} previewMode />
        </div>
      ) : (
        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>充值包名称 / 编码</TableHead>
                <TableHead>原价 / 实际价格</TableHead>
                <TableHead>基础积分</TableHead>
                <TableHead>赠送积分</TableHead>
                <TableHead>角标 / 推荐</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className='w-24 text-right'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className='flex items-center gap-1.5 font-medium'>
                      {plan.name}
                      {plan.is_featured && (
                        <Sparkles className='text-primary size-3.5' />
                      )}
                    </div>
                    <div className='text-muted-foreground max-w-64 truncate font-mono text-xs'>
                      {plan.code}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='font-medium'>{formatPrice(plan)}</div>
                    {plan.original_price_cents > plan.price_cents && (
                      <div className='text-muted-foreground text-xs line-through'>
                        ¥{plan.original_price_cents / 100}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{plan.credits.toLocaleString()} 积分</TableCell>
                  <TableCell>
                    {plan.bonus_credits > 0 ? (
                      <span className='font-semibold text-amber-600 dark:text-amber-400'>
                        +{plan.bonus_credits.toLocaleString()} 积分
                      </span>
                    ) : (
                      <span className='text-muted-foreground text-xs'>-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {plan.badge_text ? (
                      <Badge
                        variant={plan.is_featured ? 'default' : 'destructive'}
                      >
                        {plan.badge_text}
                      </Badge>
                    ) : (
                      <span className='text-muted-foreground text-xs'>-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.enabled ? 'default' : 'secondary'}>
                      {plan.enabled ? '启用' : '停用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className='flex justify-end gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        title='编辑'
                        onClick={() => setEditing(plan)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        title='删除'
                        onClick={() => setDeleting(plan)}
                      >
                        <Trash2 className='text-destructive' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!plansQuery.isLoading && plans.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='text-muted-foreground h-28 text-center'
                  >
                    暂无积分充值包
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      </PageShell>

      {editing !== undefined && (
        <CreditRechargePlanDialog
          plan={editing}
          onClose={() => setEditing(undefined)}
          onSaved={refresh}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title='删除积分充值包'
        desc={`确定删除“${deleting?.name ?? ''}”吗？已产生购买订单的策略不可删除。`}
        cancelBtnText='取消'
        confirmText='删除'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </>
  )
}

function CreditRechargePlanDialog({
  plan,
  onClose,
  onSaved,
}: {
  plan: CreditRechargePlan | null
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(plan?.code ?? '')
  const [name, setName] = useState(plan?.name ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [price, setPrice] = useState(plan ? String(plan.price_cents / 100) : '')
  const [originalPrice, setOriginalPrice] = useState(
    plan && plan.original_price_cents > 0
      ? String(plan.original_price_cents / 100)
      : ''
  )
  const [currency, setCurrency] = useState(plan?.currency ?? 'CNY')
  const [credits, setCredits] = useState(String(plan?.credits ?? ''))
  const [bonusCredits, setBonusCredits] = useState(
    String(plan?.bonus_credits ?? '0')
  )
  const [badgeText, setBadgeText] = useState(plan?.badge_text ?? '')
  const [isFeatured, setIsFeatured] = useState(plan?.is_featured ?? false)
  const [enabled, setEnabled] = useState(plan?.enabled ?? true)
  const [sortOrder, setSortOrder] = useState(String(plan?.sort_order ?? 10))

  const mutation = useMutation({
    mutationFn: (input: CreditRechargePlanInput) =>
      plan
        ? updateCreditRechargePlan(plan.id, input)
        : createCreditRechargePlan(input),
    onSuccess: () => {
      toast.success(plan ? '积分充值包已更新' : '积分充值包已创建')
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
      description,
      price_cents: Math.round(Number(price) * 100),
      original_price_cents: originalPrice
        ? Math.round(Number(originalPrice) * 100)
        : 0,
      currency,
      credits: Number(credits),
      bonus_credits: Number(bonusCredits),
      badge_text: badgeText,
      is_featured: isFeatured,
      enabled,
      sort_order: Number(sortOrder),
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {plan ? '编辑积分充值包' : '新增积分充值包'}
          </DialogTitle>
          <DialogDescription>
            配置面向用户展示的充值价格、积分额度、赠送积分与营销角标。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field id='recharge-code' label='策略编码'>
              <Input
                id='recharge-code'
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder='recharge_520'
                required
              />
            </Field>
            <Field id='recharge-name' label='充值包名称'>
              <Input
                id='recharge-name'
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder='520 积分包'
                required
              />
            </Field>

            <Field id='recharge-price' label='实际价格 (元)'>
              <Input
                id='recharge-price'
                type='number'
                min='0'
                step='0.01'
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder='240'
                required
              />
            </Field>
            <Field id='recharge-original-price' label='划线原价 (元，可选)'>
              <Input
                id='recharge-original-price'
                type='number'
                min='0'
                step='0.01'
                value={originalPrice}
                onChange={(event) => setOriginalPrice(event.target.value)}
                placeholder='260'
              />
            </Field>

            <Field id='recharge-credits' label='基础积分'>
              <Input
                id='recharge-credits'
                type='number'
                min='1'
                value={credits}
                onChange={(event) => setCredits(event.target.value)}
                placeholder='500'
                required
              />
            </Field>

            <Field id='recharge-bonus-credits' label='赠送积分 (可选)'>
              <Input
                id='recharge-bonus-credits'
                type='number'
                min='0'
                value={bonusCredits}
                onChange={(event) => setBonusCredits(event.target.value)}
                placeholder='20'
              />
            </Field>

            <Field id='recharge-badge-text' label='角标 / 赠送提示 (可选)'>
              <Input
                id='recharge-badge-text'
                value={badgeText}
                onChange={(event) => setBadgeText(event.target.value)}
                placeholder='如：+20 送、超值推荐'
              />
            </Field>

            <Field id='recharge-currency' label='币种'>
              <Input
                id='recharge-currency'
                value={currency}
                maxLength={3}
                onChange={(event) =>
                  setCurrency(event.target.value.toUpperCase())
                }
                required
              />
            </Field>

            <Field id='recharge-sort-order' label='排序 (数值越小越靠前)'>
              <Input
                id='recharge-sort-order'
                type='number'
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </Field>

            <div className='flex items-center gap-6 pt-6 sm:justify-start'>
              <div className='flex items-center gap-2'>
                <Switch
                  id='recharge-featured'
                  checked={isFeatured}
                  onCheckedChange={setIsFeatured}
                />
                <Label
                  htmlFor='recharge-featured'
                  className='cursor-pointer text-xs'
                >
                  高亮推荐
                </Label>
              </div>
              <div className='flex items-center gap-2'>
                <Switch
                  id='recharge-enabled'
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
                <Label
                  htmlFor='recharge-enabled'
                  className='cursor-pointer text-xs'
                >
                  启用策略
                </Label>
              </div>
            </div>
          </div>

          <Field id='recharge-description' label='一句话说明 (可选)'>
            <Input
              id='recharge-description'
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder='热门推荐积分充值包'
              maxLength={2000}
            />
          </Field>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? '保存中' : '保存配置'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function formatPrice(plan: CreditRechargePlan) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: plan.currency,
  }).format(plan.price_cents / 100)
}
