import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownUp,
  ImageUp,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createDigitalHuman,
  deleteDigitalHuman,
  listAdminDigitalHumans,
  updateDigitalHuman,
  updateDigitalHumanStatus,
  uploadDigitalHumanAsset,
  type DigitalHuman,
  type DigitalHumanInput,
} from '@/services/api/digitalHumanApi'
import { listAdminSubscriptionPlans } from '@/services/api/subscriptionApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/common'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { PageShell } from '@/components/layout/PageShell'

const GENDERS = [
  { value: 'female', label: '女性' },
  { value: 'male', label: '男性' },
  { value: 'pet', label: '宠物' },
]

const REGIONS = ['欧美', '东南亚', '东亚', '拉美', '中东/非洲']
const DEFAULT_GRADIENT = 'from-pink-500 via-rose-500 to-purple-600'

function errorMessage(error: unknown, fallback = '操作失败，请稍后重试') {
  return getApiErrorMessage(error, fallback)
}

export const DigitalHumanAdmin = () => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<DigitalHuman | null | undefined>()
  const [deleting, setDeleting] = useState<DigitalHuman | null>(null)

  const listQuery = useQuery({
    queryKey: ['admin-digital-humans'],
    queryFn: listAdminDigitalHumans,
  })
  const plansQuery = useQuery({
    queryKey: ['admin-subscription-plans'],
    queryFn: listAdminSubscriptionPlans,
  })

  const items = listQuery.data?.items ?? []
  const plans = plansQuery.data ?? []
  const loading = listQuery.isFetching

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-digital-humans'] })
    void queryClient.invalidateQueries({ queryKey: ['digital-humans'] })
  }

  const deleteMutation = useMutation({
    mutationFn: deleteDigitalHuman,
    onSuccess: () => {
      toast.success('数字人已删除')
      setDeleting(null)
      refresh()
    },
    onError: (error) => toast.error(errorMessage(error, '删除失败')),
  })

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: 'listed' | 'unlisted'
    }) => updateDigitalHumanStatus(id, { status }),
    onSuccess: () => {
      toast.success('状态已更新')
      refresh()
    },
    onError: (error) => toast.error(errorMessage(error, '状态更新失败')),
  })

  const planName = (code: string) =>
    plans.find((plan) => plan.code === code)?.name ?? code ?? '无限制'

  return (
    <>
      <PageShell
        title='数字人维护'
        description='维护数字人形象、风格、语言与订阅权限，并管理上下架状态。'
        actions={
          <>
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
              新增数字人
            </Button>
          </>
        }
        surfaceClassName='space-y-6'
      >
      <div className='grid gap-4 border-b pb-4 sm:grid-cols-4'>
        <Metric icon={UserRound} label='数字人总数' value={items.length} />
        <Metric
          icon={UserRound}
          label='上架中'
          value={items.filter((item) => item.status === 'listed').length}
        />
        <Metric
          icon={UserRound}
          label='已下架'
          value={items.filter((item) => item.status === 'unlisted').length}
        />
        <Metric
          icon={UserRound}
          label='需订阅解锁'
          value={
            items.filter((item) => Boolean(item.required_plan_code)).length
          }
        />
      </div>

      <div className='mt-6 overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>性别</TableHead>
              <TableHead>地区</TableHead>
              <TableHead>所需套餐</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className='w-44 text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${item.gradient_bg || DEFAULT_GRADIENT} text-xs font-bold text-white`}
                    >
                      {item.avatar_initial}
                    </div>
                    <div className='min-w-0'>
                      <div className='truncate font-medium'>{item.name}</div>
                      <div className='text-muted-foreground max-w-48 truncate font-mono text-xs'>
                        {item.code}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {GENDERS.find((g) => g.value === item.gender)?.label ??
                    item.gender}
                </TableCell>
                <TableCell>{item.region}</TableCell>
                <TableCell>
                  {item.required_plan_code ? (
                    <Badge variant='secondary'>
                      {planName(item.required_plan_code)}
                    </Badge>
                  ) : (
                    <span className='text-muted-foreground text-xs'>
                      无限制
                    </span>
                  )}
                </TableCell>
                <TableCell>{item.sort_order}</TableCell>
                <TableCell>
                  <Badge
                    variant={item.status === 'listed' ? 'default' : 'secondary'}
                  >
                    {item.status === 'listed' ? '上架' : '下架'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className='flex justify-end gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      title={item.status === 'listed' ? '下架' : '上架'}
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          id: item.id,
                          status:
                            item.status === 'listed' ? 'unlisted' : 'listed',
                        })
                      }
                    >
                      <ArrowDownUp />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      title='编辑'
                      onClick={() => setEditing(item)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      title='删除'
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 className='text-destructive' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!listQuery.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className='text-muted-foreground h-28 text-center'
                >
                  暂无数字人，点击右上角新增
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </PageShell>

      {editing !== undefined && (
        <DigitalHumanDialog
          digitalHuman={editing}
          plans={plans}
          onClose={() => setEditing(undefined)}
          onSaved={refresh}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title='删除数字人'
        desc={`确定删除“${deleting?.name ?? ''}”吗？删除后无法恢复。`}
        cancelBtnText='取消'
        confirmText='删除'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound
  label: string
  value: number
}) {
  return (
    <div className='flex items-center gap-3'>
      <span className='bg-muted flex size-10 items-center justify-center rounded-md'>
        <Icon className='size-5' />
      </span>
      <div>
        <div className='text-2xl font-semibold'>{value}</div>
        <div className='text-muted-foreground text-xs'>{label}</div>
      </div>
    </div>
  )
}

function DigitalHumanDialog({
  digitalHuman,
  plans,
  onClose,
  onSaved,
}: {
  digitalHuman: DigitalHuman | null
  plans: { code: string; name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<DigitalHumanInput>({
    code: digitalHuman?.code ?? '',
    name: digitalHuman?.name ?? '',
    description: digitalHuman?.description ?? '',
    avatar_url: digitalHuman?.avatar_url ?? '',
    asset_id: digitalHuman?.asset_id ?? '',
    source: digitalHuman?.source ?? 'other',
    gradient_bg: digitalHuman?.gradient_bg ?? DEFAULT_GRADIENT,
    avatar_initial: digitalHuman?.avatar_initial ?? '',
    gender: digitalHuman?.gender ?? 'female',
    region: digitalHuman?.region ?? '欧美',
    age_group: digitalHuman?.age_group ?? '',
    styles: digitalHuman?.styles ?? [],
    languages: digitalHuman?.languages ?? [],
    required_plan_code: digitalHuman?.required_plan_code ?? '',
    sample_voice_url: digitalHuman?.sample_voice_url ?? '',
    rating: digitalHuman?.rating ?? 4.8,
    is_hot: digitalHuman?.is_hot ?? false,
    is_new: digitalHuman?.is_new ?? false,
    is_pro: digitalHuman?.is_pro ?? false,
    status: digitalHuman?.status ?? 'listed',
    sort_order: digitalHuman?.sort_order ?? 10,
  })
  const [stylesText, setStylesText] = useState(form.styles.join('，'))
  const [languagesText, setLanguagesText] = useState(form.languages.join('，'))
  const [avatarUrlInput, setAvatarUrlInput] = useState(form.avatar_url)

  const uploadMutation = useMutation({
    mutationFn: uploadDigitalHumanAsset,
    onSuccess: (data) => {
      setAvatarUrlInput(data.url)
      toast.success('素材已上传')
    },
    onError: (error) => toast.error(errorMessage(error, '素材上传失败')),
  })

  const saveMutation = useMutation({
    mutationFn: (input: DigitalHumanInput) =>
      digitalHuman
        ? updateDigitalHuman(digitalHuman.id, input)
        : createDigitalHuman(input),
    onSuccess: () => {
      toast.success(digitalHuman ? '数字人已更新' : '数字人已创建')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(errorMessage(error, '保存失败')),
  })

  const handleFile = (file: File | undefined) => {
    if (!file) return
    uploadMutation.mutate(file)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const styles = stylesText
      .split(/[，,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const languages = languagesText
      .split(/[，,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    saveMutation.mutate({
      ...form,
      avatar_url: avatarUrlInput,
      styles,
      languages,
      rating: Number(form.rating),
      sort_order: Number(form.sort_order),
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {digitalHuman ? '编辑数字人' : '新增数字人'}
          </DialogTitle>
          <DialogDescription>
            配置形象、风格、语言与最低订阅套餐门槛。订阅门槛留空表示免费全员可用。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field label='编码'>
              <Input
                value={form.code}
                disabled={Boolean(digitalHuman)}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder='lucy'
                required
              />
            </Field>
            <Field label='名称'>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label='性别'>
              <Select
                value={form.gender}
                onValueChange={(value) => setForm({ ...form, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择性别' />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label='地区'>
              <Select
                value={form.region}
                onValueChange={(value) => setForm({ ...form, region: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择地区' />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label='年龄段'>
              <Input
                value={form.age_group}
                onChange={(e) =>
                  setForm({ ...form, age_group: e.target.value })
                }
                placeholder='25-30'
              />
            </Field>
            <Field label='头像首字母'>
              <Input
                value={form.avatar_initial}
                onChange={(e) =>
                  setForm({ ...form, avatar_initial: e.target.value })
                }
                placeholder='EM'
              />
            </Field>
            <Field label='素材来源'>
              <Select
                value={form.source}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    source: value as DigitalHumanInput['source'],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择素材来源' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='other'>其它</SelectItem>
                  <SelectItem value='seedance'>Seedance</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label='素材 ID'>
              <Input
                value={form.asset_id}
                onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
                placeholder='Seedance 来源必填'
              />
            </Field>
            <Field label='渐变背景'>
              <Input
                value={form.gradient_bg}
                onChange={(e) =>
                  setForm({ ...form, gradient_bg: e.target.value })
                }
              />
            </Field>
            <Field label='评分'>
              <Input
                type='number'
                min='0'
                max='5'
                step='0.01'
                value={form.rating}
                onChange={(e) =>
                  setForm({ ...form, rating: Number(e.target.value) })
                }
              />
            </Field>
            <Field label='试听音色地址'>
              <Input
                value={form.sample_voice_url}
                onChange={(e) =>
                  setForm({ ...form, sample_voice_url: e.target.value })
                }
              />
            </Field>
            <Field label='最低订阅套餐'>
              <Select
                value={form.required_plan_code || '__none__'}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    required_plan_code: value === '__none__' ? '' : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='无限制' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>无限制（免费）</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.code} value={plan.code}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label='排序'>
              <Input
                type='number'
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: Number(e.target.value) })
                }
              />
            </Field>
            <Field label='状态'>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    status: value as DigitalHumanInput['status'],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择状态' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='listed'>上架</SelectItem>
                  <SelectItem value='unlisted'>下架</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label='说明'>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              maxLength={500}
            />
          </Field>

          <div className='grid gap-4 sm:grid-cols-2'>
            <Field label='风格（逗号分隔）'>
              <Input
                value={stylesText}
                onChange={(e) => setStylesText(e.target.value)}
                placeholder='美妆，时尚，生活'
                required
              />
            </Field>
            <Field label='语言（逗号分隔）'>
              <Input
                value={languagesText}
                onChange={(e) => setLanguagesText(e.target.value)}
                placeholder='英语，法语'
                required
              />
            </Field>
          </div>

          <div className='space-y-2'>
            <Label>头像 / 封面</Label>
            <div className='flex items-center gap-3'>
              <Input
                value={avatarUrlInput}
                onChange={(e) => setAvatarUrlInput(e.target.value)}
                placeholder='可填写外链地址，或点击右侧上传'
              />
              <label className='bg-background hover:bg-accent inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors'>
                <ImageUp className='size-4' />
                上传
                <input
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
            </div>
            {avatarUrlInput && (
              <img
                src={avatarUrlInput}
                alt='预览'
                className='h-24 w-24 rounded-md border object-cover'
              />
            )}
          </div>

          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
            <ToggleField
              label='热门'
              checked={form.is_hot}
              onChange={(checked) => setForm({ ...form, is_hot: checked })}
            />
            <ToggleField
              label='新上线'
              checked={form.is_new}
              onChange={(checked) => setForm({ ...form, is_new: checked })}
            />
            <ToggleField
              label='PRO 专享'
              checked={form.is_pro}
              onChange={(checked) => setForm({ ...form, is_pro: checked })}
            />
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button
              type='submit'
              disabled={saveMutation.isPending || uploadMutation.isPending}
            >
              {saveMutation.isPending ? '保存中' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className='flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm'>
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <span>{label}</span>
    </label>
  )
}
