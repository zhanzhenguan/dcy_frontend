import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cpu, Pencil, Plus, RefreshCw, Server } from 'lucide-react'
import { toast } from 'sonner'
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
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { PageShell } from '@/components/layout/PageShell'
import { AnimatedTabs } from '@/components/common'
import {
  createModel,
  createModelProvider,
  listModelProviders,
  listModels,
  updateModel,
  updateModelProvider,
  type ModelConfig,
  type ModelInput,
  type ModelProvider,
  type ProviderInput,
} from '@/services/api/modelApi'
import { getVideoResolutions } from '@/services/api/systemSettingsApi'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试'
}

export const ModelConfiguration = () => {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('models')
  const [providerDialog, setProviderDialog] = useState<
    ModelProvider | null | undefined
  >()
  const [modelDialog, setModelDialog] = useState<
    ModelConfig | null | undefined
  >()
  const providersQuery = useQuery({
    queryKey: ['model-providers'],
    queryFn: listModelProviders,
  })
  const modelsQuery = useQuery({ queryKey: ['models'], queryFn: listModels })
  const resolutionsQuery = useQuery({
    queryKey: ['video-resolutions'],
    queryFn: getVideoResolutions,
  })
  const providers = providersQuery.data?.items ?? []
  const models = modelsQuery.data?.items ?? []
  const resolutions = resolutionsQuery.data?.resolutions ?? []
  const loading =
    providersQuery.isFetching ||
    modelsQuery.isFetching ||
    resolutionsQuery.isFetching
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['model-providers'] })
    void queryClient.invalidateQueries({ queryKey: ['models'] })
    void queryClient.invalidateQueries({ queryKey: ['model-catalog'] })
    void queryClient.invalidateQueries({
      queryKey: ['admin-global-model-rule'],
    })
  }
  return (
    <>
      <PageShell
        title='模型配置'
        description='维护供应商和模型的目录基础信息；计费、可用性、路由和画质提升请在全局规则中配置。'
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
            <Button
              disabled={
                loading ||
                (tab === 'models' &&
                  (providers.length === 0 || resolutions.length === 0))
              }
              onClick={() =>
                tab === 'providers'
                  ? setProviderDialog(null)
                  : setModelDialog(null)
              }
            >
              <Plus />
              {tab === 'providers' ? '新增供应商' : '新增模型'}
            </Button>
          </>
        }
        surfaceClassName='space-y-6'
      >
        <Tabs value={tab} onValueChange={setTab} className='gap-6'>
          <AnimatedTabs
            variant='pill'
            value={tab}
            onValueChange={setTab}
            items={[
              { value: 'models', label: '模型' },
              { value: 'providers', label: '供应商' },
            ]}
            listClassName='border bg-card shadow-xs'
          />
          <div className='space-y-6'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Metric icon={Server} label='供应商' value={providers.length} />
              <Metric icon={Cpu} label='模型' value={models.length} />
            </div>
            <TabsContent value='models' className='mt-0'>
              <div className='overflow-x-auto rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>模型</TableHead>
                      <TableHead>供应商</TableHead>
                      <TableHead>版本</TableHead>
                      <TableHead>排序</TableHead>
                      <TableHead className='w-24 text-right'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className='font-medium'>{item.name}</div>
                          <div className='text-muted-foreground max-w-72 truncate font-mono text-xs'>
                            {item.code}
                          </div>
                        </TableCell>
                        <TableCell>{item.provider_name}</TableCell>
                        <TableCell>{item.edition || '-'}</TableCell>
                        <TableCell>{item.sort_order}</TableCell>
                        <TableCell>
                          <EditAction onEdit={() => setModelDialog(item)} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!modelsQuery.isLoading && models.length === 0 && (
                      <EmptyRow columns={5} />
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value='providers' className='mt-0'>
              <div className='overflow-x-auto rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>供应商</TableHead>
                      <TableHead>策略编码</TableHead>
                      <TableHead>请求地址</TableHead>
                      <TableHead>模型数</TableHead>
                      <TableHead>排序</TableHead>
                      <TableHead className='w-24 text-right'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className='font-medium'>{item.name}</div>
                          <div className='text-muted-foreground max-w-80 truncate text-xs'>
                            {item.description || '暂无说明'}
                          </div>
                        </TableCell>
                        <TableCell className='font-mono text-xs'>
                          {item.code}
                        </TableCell>
                        <TableCell>
                          <div className='max-w-72 truncate font-mono text-xs'>
                            {item.base_url || '未配置'}
                          </div>
                          <div className='text-muted-foreground mt-1 text-xs'>
                            {item.api_key_configured
                              ? '密钥已配置'
                              : '密钥未配置'}
                          </div>
                        </TableCell>
                        <TableCell>{item.model_count}</TableCell>
                        <TableCell>{item.sort_order}</TableCell>
                        <TableCell>
                          <EditAction onEdit={() => setProviderDialog(item)} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!providersQuery.isLoading && providers.length === 0 && (
                      <EmptyRow columns={6} />
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </PageShell>
      {providerDialog !== undefined && (
        <ProviderDialog
          provider={providerDialog}
          onClose={() => setProviderDialog(undefined)}
          onSaved={refresh}
        />
      )}
      {modelDialog !== undefined && (
        <ModelDialog
          model={modelDialog}
          providers={providers}
          resolutions={resolutions}
          onClose={() => setModelDialog(undefined)}
          onSaved={refresh}
        />
      )}
    </>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu
  label: string
  value: number
}) {
  return (
    <div className='flex items-center gap-3 border-b pb-4'>
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
function EditAction({ onEdit }: { onEdit: () => void }) {
  return (
    <div className='flex justify-end'>
      <Button variant='ghost' size='icon' onClick={onEdit} title='编辑'>
        <Pencil />
      </Button>
    </div>
  )
}
function EmptyRow({ columns }: { columns: number }) {
  return (
    <TableRow>
      <TableCell
        colSpan={columns}
        className='text-muted-foreground h-28 text-center'
      >
        暂无配置
      </TableCell>
    </TableRow>
  )
}

type ProviderNumberKey = 'sort_order'

type ProviderFormState = Omit<ProviderInput, ProviderNumberKey> &
  Record<ProviderNumberKey, number | ''>

function numberOrEmpty(value: number | undefined | null): number | '' {
  if (value == null || !Number.isFinite(value)) return 0
  return value
}

function toSubmitNumber(value: number | ''): number {
  if (value === '' || !Number.isFinite(value)) return 0
  return value
}

function ProviderDialog({
  provider,
  onClose,
  onSaved,
}: {
  provider: ModelProvider | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ProviderFormState>({
    code: provider?.code ?? 'seedance',
    name: provider?.name ?? '',
    description: provider?.description ?? '',
    base_url:
      provider?.base_url ?? 'https://operator.las.cn-beijing.volces.com',
    api_key: '',
    system_prompt: provider?.system_prompt ?? '',
    enhancement_enabled: provider?.enhancement_enabled ?? false,
    enhancement_strategies: provider?.enhancement_strategies ?? [],
    enabled: provider?.enabled ?? false,
    sort_order: numberOrEmpty(provider?.sort_order ?? 10),
  })
  const mutation = useMutation({
    mutationFn: (input: ProviderInput) =>
      provider
        ? updateModelProvider(provider.id, input)
        : createModelProvider(input),
    onSuccess: () => {
      toast.success(provider ? '供应商已更新' : '供应商已创建')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
  const setNumberField = (key: ProviderNumberKey, raw: string) => {
    setForm((prev) => ({
      ...prev,
      [key]:
        raw === ''
          ? ''
          : Number.isFinite(Number(raw))
            ? Number(raw)
            : '',
    }))
  }
  const toProviderInput = (): ProviderInput => ({
    code: form.code,
    name: form.name,
    description: form.description,
    base_url: form.base_url,
    api_key: form.api_key,
    system_prompt: form.system_prompt,
    enhancement_enabled: form.enhancement_enabled,
    enhancement_strategies: form.enhancement_strategies,
    enabled: form.enabled,
    sort_order: toSubmitNumber(form.sort_order),
  })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='flex! max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl'>
        <DialogHeader className='shrink-0 space-y-1.5 px-6 pt-6 pb-4'>
          <DialogTitle>{provider ? '编辑供应商' : '新增供应商'}</DialogTitle>
          <DialogDescription>
            供应商编码必须与后端已注册的视频策略名称一致。
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            mutation.mutate(toProviderInput())
          }}
          className='flex min-h-0 flex-1 flex-col'
        >
          <div className='min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4'>
          <Field label='策略编码'>
            <Input
              value={form.code}
              disabled={Boolean(provider)}
              onChange={(event) =>
                setForm({ ...form, code: event.target.value })
              }
              required
            />
          </Field>
          <Field label='供应商名称'>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              required
            />
          </Field>
          <Field label='Base URL'>
            <Input
              type='url'
              value={form.base_url}
              onChange={(event) =>
                setForm({ ...form, base_url: event.target.value })
              }
              required
            />
          </Field>
          <Field label='API Key'>
            <Input
              type='password'
              autoComplete='new-password'
              value={form.api_key}
              onChange={(event) =>
                setForm({ ...form, api_key: event.target.value })
              }
              placeholder={
                provider?.api_key_configured ? '已配置，留空则不修改' : ''
              }
              required={!provider || !provider.api_key_configured}
            />
          </Field>
          <Field label='说明'>
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </Field>

          <Field label='排序'>
            <Input
              type='number'
              className='max-w-40'
              value={form.sort_order}
              onChange={(event) =>
                setNumberField('sort_order', event.target.value)
              }
              onFocus={(event) => event.target.select()}
            />
          </Field>

          <Field label='统一系统提示词'>
            <Textarea
              value={form.system_prompt}
              onChange={(event) =>
                setForm({ ...form, system_prompt: event.target.value })
              }
              className='min-h-40 resize-y font-mono text-sm leading-6'
              maxLength={20000}
              required
            />
          </Field>
          </div>
          <DialogFooter className='bg-surface shrink-0 border-t px-6 py-4'>
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

function ModelDialog({
  model,
  providers,
  resolutions,
  onClose,
  onSaved,
}: {
  model: ModelConfig | null
  providers: ModelProvider[]
  resolutions: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [providerId, setProviderId] = useState(
    model?.provider_id ?? providers[0]?.id ?? ''
  )
  const [code, setCode] = useState(model?.code ?? '')
  const [name, setName] = useState(model?.name ?? '')
  const [edition, setEdition] = useState(model?.edition ?? '')
  const [description, setDescription] = useState(model?.description ?? '')
  const [sortOrder, setSortOrder] = useState(String(model?.sort_order ?? 10))
  useEffect(() => {
    if (!providerId && providers[0]) setProviderId(providers[0].id)
  }, [providerId, providers])
  const mutation = useMutation({
    mutationFn: (input: ModelInput) =>
      model ? updateModel(model.id, input) : createModel(input),
    onSuccess: () => {
      toast.success(model ? '模型已更新' : '模型已创建')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const supported = model?.supported_resolutions ?? resolutions
    const pricing =
      model?.pricing_rules ??
      supported.flatMap((resolution) => [
        { scenario: 'no_input_video' as const, resolution, coefficient: 1 },
        { scenario: 'input_video' as const, resolution, coefficient: 1 },
      ])
    mutation.mutate({
      provider_id: providerId,
      code,
      name,
      edition,
      description,
      sort_order: Number(sortOrder),
      base_credits: model?.base_credits ?? 1,
      pricing_rules: pricing,
      supported_resolutions: supported,
      weight: model?.weight ?? 0,
      enabled: model?.enabled ?? false,
      is_default: model?.is_default ?? false,
    })
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{model ? '编辑模型' : '新增模型'}</DialogTitle>
          <DialogDescription>
            模型的计费、分辨率、路由与状态在全局规则中维护。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field label='供应商'>
              <Select value={providerId} onValueChange={setProviderId}>
                <SelectTrigger>
                  <SelectValue placeholder='选择供应商' />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label='供应商侧模型 ID'>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
            </Field>
            <Field label='模型名称'>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field label='版本细分'>
              <Input
                value={edition}
                onChange={(event) => setEdition(event.target.value)}
                placeholder='基础版'
              />
            </Field>
            <Field label='排序'>
              <Input
                type='number'
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </Field>
          </div>
          <Field label='说明'>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button
              type='submit'
              disabled={
                mutation.isPending ||
                !providerId ||
                (!model && resolutions.length === 0)
              }
            >
              保存
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
