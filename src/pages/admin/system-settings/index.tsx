import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createSystemSetting,
  deleteSystemSetting,
  listSystemSettings,
  updateSystemSetting,
  type SystemSetting,
  type SystemSettingInput,
} from '@/services/api/systemSettingsApi'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/common'
import { Pagination } from '@/components/common'
import { PageShell } from '@/components/layout/PageShell'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const PAYMENT_PROVIDERS_SETTING_KEY = 'payment.available_providers'

export const SystemSettingsAdmin = () => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [editing, setEditing] = useState<SystemSetting | null | undefined>()
  const [deleting, setDeleting] = useState<SystemSetting | null>(null)

  const query = useQuery({
    queryKey: ['admin-system-settings', { page, pageSize, appliedKeyword }],
    queryFn: () =>
      listSystemSettings({
        page,
        page_size: pageSize,
        keyword: appliedKeyword || undefined,
      }),
  })
  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] })
  }
  const search = () => {
    setAppliedKeyword(keyword.trim())
    setPage(1)
  }
  const changePageSize = (size: number) => {
    setPageSize(size)
    setPage(1)
  }

  const deleteMutation = useMutation({
    mutationFn: deleteSystemSetting,
    onSuccess: () => {
      toast.success('系统常量已删除')
      setDeleting(null)
      if (items.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        refresh()
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '删除失败')),
  })

  return (
    <>
      <PageShell
        title='系统常量维护'
        description='维护 system_settings 表中的系统常量；删除正在被业务使用的常量会影响系统行为。'
        actions={
          <>
            <Button
              variant='outline'
              size='icon'
              title='刷新'
              disabled={query.isFetching}
              onClick={refresh}
            >
              <RefreshCw className={query.isFetching ? 'animate-spin' : ''} />
            </Button>
            <Button onClick={() => setEditing(null)}>
              <Plus />
              新增常量
            </Button>
          </>
        }
        surfaceClassName='space-y-4'
      >
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          value={keyword}
          placeholder='搜索常量键名或说明'
          className='max-w-xs'
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') search()
          }}
        />
        <Button variant='outline' onClick={search}>
          <Search />
          搜索
        </Button>
        {appliedKeyword && (
          <Button
            variant='ghost'
            onClick={() => {
              setKeyword('')
              setAppliedKeyword('')
              setPage(1)
            }}
          >
            清除筛选
          </Button>
        )}
      </div>

      {query.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-4 py-3 text-sm'>
          系统常量列表加载失败：{getApiErrorMessage(query.error)}
        </div>
      )}

      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>常量键名</TableHead>
              <TableHead>常量值</TableHead>
              <TableHead>说明</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className='w-24 text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <span className='bg-muted flex size-9 shrink-0 items-center justify-center rounded-md'>
                      <KeyRound className='size-4' />
                    </span>
                    <span className='font-mono text-sm font-medium'>
                      {item.setting_key}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className='text-muted-foreground block max-w-72 truncate font-mono text-sm'
                    title={item.setting_value}
                  >
                    {item.setting_value}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className='text-muted-foreground block max-w-48 truncate text-sm'
                    title={item.description || ''}
                  >
                    {item.description || '-'}
                  </span>
                </TableCell>
                <TableCell className='text-muted-foreground text-sm'>
                  {new Date(item.updated_at).toLocaleString('zh-CN')}
                </TableCell>
                <TableCell>
                  <div className='flex justify-end gap-1'>
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
            {!query.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className='text-muted-foreground h-28 text-center'
                >
                  {appliedKeyword
                    ? '未找到匹配的系统常量。'
                    : '暂无系统常量，请先新增。'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageChange={setPage}
        onPageSizeChange={changePageSize}
      />
      </PageShell>

      {editing !== undefined && (
        <SystemSettingDialog
          setting={editing}
          onClose={() => setEditing(undefined)}
          onSaved={refresh}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title='删除系统常量'
        desc={`确认删除“${deleting?.setting_key ?? ''}”？删除后相关功能将回退到默认行为，请谨慎操作。`}
        destructive
        confirmText='删除'
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </>
  )
}

function SystemSettingDialog({
  setting,
  onClose,
  onSaved,
}: {
  setting: SystemSetting | null
  onClose: () => void
  onSaved: () => void
}) {
  const [settingKey, setSettingKey] = useState(setting?.setting_key ?? '')
  const [settingValue, setSettingValue] = useState(setting?.setting_value ?? '')
  const [description, setDescription] = useState(setting?.description ?? '')
  const [paymentProviders, setPaymentProviders] = useState(() =>
    parsePaymentProviders(setting?.setting_value ?? '')
  )
  const mutation = useMutation({
    mutationFn: (input: SystemSettingInput) =>
      setting
        ? updateSystemSetting(setting.id, input)
        : createSystemSetting(input),
    onSuccess: () => {
      toast.success(setting ? '系统常量已更新' : '系统常量已创建')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '保存失败')),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const key = settingKey.trim()
    const value = settingValue.trim()
    if (!key) {
      toast.error('请输入常量键名')
      return
    }
    if (!value && !isPaymentProvidersSetting) {
      toast.error('请输入常量值')
      return
    }
    if (isPaymentProvidersSetting && paymentProviders.length === 0) {
      toast.error('请至少启用一个支付渠道')
      return
    }
    mutation.mutate({
      setting_key: key,
      setting_value: isPaymentProvidersSetting
        ? JSON.stringify(paymentProviders)
        : value,
      description: description.trim() || undefined,
    })
  }

  const isPaymentProvidersSetting =
    settingKey.trim() === PAYMENT_PROVIDERS_SETTING_KEY

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{setting ? '编辑系统常量' : '新增系统常量'}</DialogTitle>
          <DialogDescription>
            {setting
              ? '常量键名是全局唯一标识，新增后不可修改；修改值会影响依赖该常量的功能。'
              : '常量键名全局唯一，创建后不可修改。'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='flex min-h-0 flex-1 flex-col'>
          <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pe-1'>
            <Field id='setting-key' label='常量键名'>
              <Input
                id='setting-key'
                value={settingKey}
                maxLength={64}
                placeholder='如 subscription.development_mode'
                disabled={Boolean(setting)}
                onChange={(event) => setSettingKey(event.target.value)}
                required
              />
            </Field>
            {isPaymentProvidersSetting ? (
              <Field id='payment-providers' label='可用支付渠道'>
                <div className='space-y-2 rounded-md border p-3'>
                  <PaymentProviderOption
                    value='wechat'
                    label='微信支付'
                    checked={paymentProviders.includes('wechat')}
                    onCheckedChange={(checked) =>
                      setPaymentProviders((current) =>
                        togglePaymentProvider(current, 'wechat', checked)
                      )
                    }
                  />
                  <PaymentProviderOption
                    value='alipay'
                    label='支付宝'
                    checked={paymentProviders.includes('alipay')}
                    onCheckedChange={(checked) =>
                      setPaymentProviders((current) =>
                        togglePaymentProvider(current, 'alipay', checked)
                      )
                    }
                  />
                  <PaymentProviderOption
                    value='bank_transfer'
                    label='对公转账'
                    checked={paymentProviders.includes('bank_transfer')}
                    onCheckedChange={(checked) =>
                      setPaymentProviders((current) =>
                        togglePaymentProvider(current, 'bank_transfer', checked)
                      )
                    }
                  />
                </div>
              </Field>
            ) : (
              <Field id='setting-value' label='常量值'>
                <Textarea
                  id='setting-value'
                  value={settingValue}
                  className='field-sizing-fixed h-56 resize-y overflow-y-auto font-mono text-sm'
                  placeholder='请输入常量值'
                  onChange={(event) => setSettingValue(event.target.value)}
                  required
                />
              </Field>
            )}
            <Field id='setting-description' label='说明'>
              <Input
                id='setting-description'
                value={description}
                maxLength={255}
                placeholder='该常量的用途说明（可选）'
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </div>
          <DialogFooter className='mt-4 shrink-0'>
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

function PaymentProviderOption({
  value,
  label,
  checked,
  onCheckedChange,
}: {
  value: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label
      htmlFor={`payment-provider-${value}`}
      className='flex cursor-pointer items-center gap-3 text-sm'
    >
      <Checkbox
        id={`payment-provider-${value}`}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
      {label}
    </label>
  )
}

function parsePaymentProviders(value: string) {
  try {
    const providers: unknown = JSON.parse(value)
    if (!Array.isArray(providers)) return []
    return providers.filter(
      (provider): provider is 'wechat' | 'alipay' | 'bank_transfer' =>
        provider === 'wechat' ||
        provider === 'alipay' ||
        provider === 'bank_transfer'
    )
  } catch {
    return []
  }
}

function togglePaymentProvider(
  providers: ('wechat' | 'alipay' | 'bank_transfer')[],
  provider: 'wechat' | 'alipay' | 'bank_transfer',
  enabled: boolean
) {
  if (enabled)
    return providers.includes(provider) ? providers : [...providers, provider]
  return providers.filter((item) => item !== provider)
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
