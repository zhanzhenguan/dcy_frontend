import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils/utils'
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
import { ConfirmDialog, Pagination, AnimatedTabs } from '@/components/common'
import { PageShell } from '@/components/layout/PageShell'
import { getApiErrorMessage } from '@/services/api/apiError'
import { listModelProviders, listModels } from '@/services/api/modelApi'
import { getVideoResolutions } from '@/services/api/systemSettingsApi'
import {
  searchAdminTenants,
  type AdminTenantPreview,
} from '@/services/api/tenantApi'
import {
  deleteTenantModelRule,
  getGlobalModelRule,
  getTenantEffectiveRule,
  listTenantModelRules,
  upsertTenantModelRule,
  type TenantEffectiveRule,
  type TenantEffectiveRuleProvider,
  type TenantModelRule,
  type TenantRuleDoc,
  type TenantRuleEnhancementStrategy,
  type TenantRuleModel,
  type TenantRuleProvider,
  type ProviderGenerationLimits,
} from '@/services/api/tenantModelRuleApi'
import { listVideoRatios } from '@/services/api/videoRatioApi'
import { GenerationLimitsEditor } from './GenerationLimitsEditor'
import { GlobalModelRules } from './GlobalModelRules'
import { normalizeGenerationLimits } from './generationLimits'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const TENANT_SEARCH_PAGE_SIZE_OPTIONS = [10, 20, 50]
const SCHEMA_VERSION = 1
const MAX_WEIGHT = 1_000_000

type DraftStrategy = { source: string; target: string }
type DraftProvider = {
  provider_code: string
  included: boolean
  enhancement_enabled: boolean
  enhancement_strategies: DraftStrategy[]
  generation_limits: ProviderGenerationLimits
  models: {
    model_id: string
    included: boolean
    weight: string
    is_default: boolean
  }[]
}
type DraftDoc = {
  providers: DraftProvider[]
}

export const TenantModelRulesAdmin = () => {
  const [tab, setTab] = useState('global')
  const tabList = (
    <AnimatedTabs
      value={tab}
      onValueChange={setTab}
      items={[
        { value: 'global', label: '全局规则' },
        { value: 'tenant', label: '租户模型规则' },
      ]}
    />
  )
  return (
    <>
      <div hidden={tab !== 'global'}>
        <GlobalModelRules tabList={tab === 'global' ? tabList : null} />
      </div>
      <div hidden={tab !== 'tenant'}>
        <TenantModelRulesTab tabList={tab === 'tenant' ? tabList : null} />
      </div>
    </>
  )
}

function TenantModelRulesTab({ tabList }: { tabList?: ReactNode }) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [editor, setEditor] = useState<
    { mode: 'create' } | { mode: 'edit'; rule: TenantModelRule } | undefined
  >()
  const [previewing, setPreviewing] = useState<TenantModelRule | null>(null)
  const [deleting, setDeleting] = useState<TenantModelRule | null>(null)

  const query = useQuery({
    queryKey: ['admin-tenant-model-rules', { page, pageSize, appliedKeyword }],
    queryFn: () =>
      listTenantModelRules({
        page,
        page_size: pageSize,
        keyword: appliedKeyword || undefined,
      }),
  })
  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ['admin-tenant-model-rules'],
    })
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
    mutationFn: deleteTenantModelRule,
    onSuccess: () => {
      toast.success('租户模型规则已删除，将回退全局规则')
      setDeleting(null)
      if (items.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        refresh()
      }
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '租户模型规则删除失败')),
  })

  return (
    <>
      <PageShell
        title='租户模型规则'
        description='为单个租户配置专属的视频生成模型与画质增强规则；存在租户规则时整体替代全局规则，删除后回退全局。'
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
            <Button onClick={() => setEditor({ mode: 'create' })}>
              <Plus />
              配置租户规则
            </Button>
          </>
        }
        surfaceClassName='space-y-4 overflow-hidden p-0'
      >
        {tabList}
        <div className='space-y-4 p-5'>
          <div className='flex flex-wrap items-center gap-2'>
            <Input
              value={keyword}
              placeholder='搜索租户名称、个人昵称或 UUID'
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
              租户模型规则列表加载失败：
              {getApiErrorMessage(query.error)}
            </div>
          )}

          <div className='overflow-x-auto rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>租户</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>供应商数</TableHead>
                  <TableHead>模型数</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className='w-40 text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const providerCount = item.rules.providers.length
                  const modelCount = item.rules.providers.reduce(
                    (sum, provider) => sum + provider.models.length,
                    0
                  )
                  return (
                    <TableRow key={item.tenant_public_id}>
                      <TableCell>
                        <div className='font-medium'>{item.display_name}</div>
                        <div className='text-muted-foreground max-w-72 truncate font-mono text-xs'>
                          {item.tenant_public_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>
                          {item.tenant_type === 'ENTERPRISE'
                            ? '企业租户'
                            : '个人租户'}
                        </Badge>
                      </TableCell>
                      <TableCell>{providerCount}</TableCell>
                      <TableCell>{modelCount}</TableCell>
                      <TableCell className='text-muted-foreground text-sm'>
                        {formatDateTime(item.updated_at)}
                      </TableCell>
                      <TableCell>
                        <div className='flex justify-end gap-1'>
                          <Button
                            variant='ghost'
                            size='icon'
                            title='预览生效规则'
                            onClick={() => setPreviewing(item)}
                          >
                            <Eye />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            title='编辑'
                            onClick={() =>
                              setEditor({ mode: 'edit', rule: item })
                            }
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
                  )
                })}
                {!query.isLoading && items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className='text-muted-foreground h-28 text-center'
                    >
                      {appliedKeyword
                        ? '未找到匹配的租户模型规则。'
                        : '暂无租户模型规则，请先为租户配置规则。'}
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
        </div>
      </PageShell>

      {editor !== undefined && (
        <RuleEditorDialog
          mode={editor.mode}
          existing={editor.mode === 'edit' ? editor.rule : undefined}
          onClose={() => setEditor(undefined)}
          onSaved={refresh}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title='删除租户模型规则'
        desc={
          deleting
            ? `确认删除租户「${deleting.display_name}」的模型规则？删除后将回退到全局规则，相关业务行为可能改变，请谨慎操作。`
            : ''
        }
        destructive
        confirmText='删除'
        isLoading={deleteMutation.isPending}
        handleConfirm={() =>
          deleting && deleteMutation.mutate(deleting.tenant_public_id)
        }
      />
      {previewing && (
        <EffectiveRuleDialog
          tenant={previewing}
          onClose={() => setPreviewing(null)}
        />
      )}
    </>
  )
}

function RuleEditorDialog({
  mode,
  existing,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  existing?: TenantModelRule
  onClose: () => void
  onSaved: () => void
}) {
  // 编辑时目标租户固定为规则所属租户；新建时由用户选择。
  const [tenant, setTenant] = useState<AdminTenantPreview | null>(() =>
    existing
      ? {
          id: '',
          public_id: existing.tenant_public_id,
          display_name: existing.display_name,
          tenant_type: existing.tenant_type,
          email: '',
          phone: '',
          industry: '',
          status: 'active',
          plan_level_code: '',
          plan_level_name: '',
          plan_expires_at: '',
          credit_balance: 0,
          available_credit: 0,
          created_at: '',
          updated_at: '',
        }
      : null
  )
  const [draft, setDraft] = useState<DraftDoc | null>(null)

  // 拉取供应商与模型列表，用于构建草稿与展示。
  const providersQuery = useQuery({
    queryKey: ['model-providers'],
    queryFn: listModelProviders,
  })
  const modelsQuery = useQuery({ queryKey: ['models'], queryFn: listModels })
  const resolutionsQuery = useQuery({
    queryKey: ['video-resolutions'],
    queryFn: getVideoResolutions,
  })
  const globalRuleQuery = useQuery({
    queryKey: ['admin-global-model-rule'],
    queryFn: getGlobalModelRule,
  })
  const ratiosQuery = useQuery({
    queryKey: ['video-ratios'],
    queryFn: listVideoRatios,
  })
  const providers = useMemo(
    () => providersQuery.data?.items ?? [],
    [providersQuery.data]
  )
  const models = useMemo(
    () => modelsQuery.data?.items ?? [],
    [modelsQuery.data]
  )
  const resolutions = useMemo(
    () => resolutionsQuery.data?.resolutions ?? [],
    [resolutionsQuery.data]
  )
  const providersLoading =
    providersQuery.isLoading ||
    modelsQuery.isLoading ||
    resolutionsQuery.isLoading

  // 初始化草稿：编辑时基于既有规则；新建时选定租户后按全局目录生成初始草稿。
  // 切换租户会重置草稿，由 onSelect 调用 selectDraftTenant 完成。
  const selectDraftTenant = (nextTenant: AdminTenantPreview | null) => {
    setTenant(nextTenant)
    setDraft(null)
  }
  // 初始草稿按当前条件渲染期一次性推导（尚未初始化时），编辑操作直接写回 state。
  const draftReady =
    mode === 'edit'
      ? Boolean(existing)
      : Boolean(tenant) &&
        providers.length > 0 &&
        models.length > 0 &&
        Boolean(globalRuleQuery.data)
  const effectiveDraft =
    draft ??
    (draftReady
      ? mode === 'edit' && existing
        ? draftFromExisting(existing.rules, providers, models)
        : buildDraftFromGlobalCatalog(providers, models, globalRuleQuery.data)
      : null)
  const updateDraft = (next: DraftDoc) => setDraft(next)

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!tenant) throw new Error('请选择目标租户')
      if (!effectiveDraft) throw new Error('规则尚未初始化')
      const normalizedDraft = sanitizeDraftForSystemResolutions(
        effectiveDraft,
        resolutions
      )
      validateDraftDoc(normalizedDraft, providers, models)
      const rules = buildTenantRuleDoc(normalizedDraft)
      return upsertTenantModelRule(tenant.public_id, rules)
    },
    onSuccess: () => {
      toast.success(
        mode === 'edit' ? '租户模型规则已更新' : '租户模型规则已创建'
      )
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '保存失败')),
  })

  const submitDisabled =
    !tenant ||
    !effectiveDraft ||
    upsertMutation.isPending ||
    providersLoading ||
    resolutions.length === 0

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='flex max-h-[92vh] flex-col overflow-hidden sm:max-w-4xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>
            {mode === 'edit' ? '编辑租户模型规则' : '新增租户模型规则'}
          </DialogTitle>
          <DialogDescription>
            选择供应商并为其启用至少一个权重大于 0 的模型；启用画质增强时，
            目标分辨率必须高于源分辨率。
          </DialogDescription>
        </DialogHeader>

        {mode === 'create' && (
          <div className='shrink-0'>
            <DraftTenantSelector tenant={tenant} onSelect={selectDraftTenant} />
          </div>
        )}
        {mode === 'edit' && existing && (
          <div className='bg-muted/30 shrink-0 rounded-md border px-4 py-3 text-sm'>
            <div className='font-medium'>{existing.display_name}</div>
            <div className='text-muted-foreground font-mono text-xs'>
              {existing.tenant_public_id}
            </div>
          </div>
        )}

        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pe-1'>
          {providersLoading && (
            <div className='text-muted-foreground py-12 text-center text-sm'>
              正在加载供应商与模型…
            </div>
          )}
          {!providersLoading && effectiveDraft && (
            <DraftEditor
              draft={effectiveDraft}
              setDraft={updateDraft}
              providers={providers}
              models={models}
              resolutions={resolutions}
              ratios={ratiosQuery.data?.map((item) => item.value) ?? []}
            />
          )}
          {!providersLoading && !effectiveDraft && (
            <div className='text-muted-foreground py-12 text-center text-sm'>
              {mode === 'create'
                ? '请先选择目标租户'
                : '规则加载失败，请关闭后重试'}
            </div>
          )}
        </div>

        <DialogFooter className='mt-4 shrink-0'>
          <Button type='button' variant='outline' onClick={onClose}>
            取消
          </Button>
          <Button
            type='button'
            disabled={submitDisabled}
            onClick={() => upsertMutation.mutate()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DraftTenantSelector({
  tenant,
  onSelect,
}: {
  tenant: AdminTenantPreview | null
  onSelect: (tenant: AdminTenantPreview | null) => void
}) {
  const searchRef = useRef<{ open: () => void } | null>(null)
  return (
    <div className='space-y-2'>
      <Label>目标租户</Label>
      <div className='flex gap-2'>
        <Button
          type='button'
          variant='outline'
          className='h-auto min-h-9 min-w-0 flex-1 justify-between gap-3 py-2 text-left font-normal'
          onClick={() => searchRef.current?.open()}
        >
          {tenant ? (
            <span className='min-w-0'>
              <span className='flex items-center gap-2'>
                <span className='truncate'>{tenant.display_name}</span>
                <TenantTypeBadge tenantType={tenant.tenant_type} />
              </span>
              <span className='text-muted-foreground block truncate font-mono text-xs'>
                {tenant.public_id}
              </span>
            </span>
          ) : (
            <span className='text-muted-foreground'>选择租户</span>
          )}
          <Search className='text-muted-foreground size-4 shrink-0' />
        </Button>
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
      <TenantSearchDialog
        ref={searchRef}
        selected={tenant}
        onSelect={onSelect}
      />
    </div>
  )
}

/** 租户类型徽标：企业/个人明显区分 */
function TenantTypeBadge({
  tenantType,
  className,
}: {
  tenantType: string
  className?: string
}) {
  const isEnterprise = tenantType === 'ENTERPRISE'
  return (
    <Badge
      variant='outline'
      className={cn(
        'shrink-0 px-1.5 py-0 text-[11px]',
        isEnterprise
          ? 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400'
          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        className
      )}
    >
      {isEnterprise ? '企业' : '个人'}
    </Badge>
  )
}

type TenantSearchDialogProps = {
  selected: AdminTenantPreview | null
  onSelect: (tenant: AdminTenantPreview | null) => void
}

/** 租户搜索弹窗：租户量大时替代下拉，支持关键字 + 租户类型筛选。 */
const TenantSearchDialog = forwardRef<
  { open: () => void },
  TenantSearchDialogProps
>(function TenantSearchDialog({ selected, onSelect }, ref) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [tenantType, setTenantType] = useState<'' | 'PERSONAL' | 'ENTERPRISE'>(
    ''
  )

  useImperativeHandle(ref, () => ({ open: () => setOpen(true) }), [])

  const tenantsQuery = useQuery({
    queryKey: [
      'admin-tenant-search',
      { appliedKeyword, tenantType, page, pageSize },
    ],
    queryFn: () =>
      searchAdminTenants({
        keyword: appliedKeyword,
        page,
        page_size: pageSize,
        tenant_type: tenantType || undefined,
      }),
    enabled: open,
  })
  const items = tenantsQuery.data?.items ?? []
  const total = tenantsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const search = () => {
    setAppliedKeyword(keyword.trim())
    setPage(1)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='flex max-h-[80vh] flex-col overflow-hidden sm:max-w-xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>选择租户</DialogTitle>
          <DialogDescription>
            支持按租户名称、Owner 昵称或租户公开 ID 搜索。
          </DialogDescription>
        </DialogHeader>

        <div className='shrink-0 space-y-3'>
          <div className='flex gap-2'>
            <div className='relative min-w-0 flex-1'>
              <Search className='text-muted-foreground absolute top-2.5 left-3 size-4' />
              <Input
                autoFocus
                value={keyword}
                placeholder='输入关键字搜索'
                className='pl-9'
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') search()
                }}
              />
            </div>
            <Button variant='outline' onClick={search}>
              搜索
            </Button>
          </div>
          <AnimatedTabs
            fullWidth
            value={tenantType}
            onValueChange={(value) => {
              setTenantType(value as '' | 'PERSONAL' | 'ENTERPRISE')
              setPage(1)
            }}
            items={[
              { value: '', label: '全部' },
              { value: 'ENTERPRISE', label: '企业租户' },
              { value: 'PERSONAL', label: '个人租户' },
            ]}
          />
        </div>

        <div className='min-h-0 flex-1 space-y-2 overflow-y-auto pe-1'>
          {tenantsQuery.isFetching && (
            <div className='text-muted-foreground py-10 text-center text-sm'>
              正在搜索…
            </div>
          )}
          {tenantsQuery.isError && !tenantsQuery.isFetching && (
            <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-4 py-3 text-sm'>
              租户搜索失败：{getApiErrorMessage(tenantsQuery.error)}
            </div>
          )}
          {!tenantsQuery.isFetching && !tenantsQuery.isError && (
            <>
              {items.length === 0 && (
                <div className='text-muted-foreground py-10 text-center text-sm'>
                  {appliedKeyword || tenantType
                    ? '未找到匹配的租户'
                    : '暂无租户'}
                </div>
              )}
              {items.map((item) => (
                <button
                  key={item.public_id}
                  type='button'
                  onClick={() => {
                    onSelect(item)
                    setOpen(false)
                  }}
                  className={cn(
                    'hover:bg-accent flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors',
                    item.public_id === selected?.public_id &&
                      'border-primary/50 bg-primary/5'
                  )}
                >
                  <span className='min-w-0 flex-1'>
                    <span className='flex items-center gap-2'>
                      <span className='truncate text-sm font-medium'>
                        {item.display_name}
                      </span>
                      <TenantTypeBadge tenantType={item.tenant_type} />
                      {item.status !== 'active' && (
                        <Badge
                          variant='secondary'
                          className='px-1.5 py-0 text-[11px]'
                        >
                          已停用
                        </Badge>
                      )}
                    </span>
                    <span className='text-muted-foreground mt-0.5 block truncate font-mono text-xs'>
                      {item.public_id}
                    </span>
                    {(item.industry || item.plan_level_name) && (
                      <span className='text-muted-foreground mt-0.5 block truncate text-xs'>
                        {[item.industry, item.plan_level_name]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </span>
                  {item.public_id === selected?.public_id && (
                    <Check className='text-primary size-4 shrink-0' />
                  )}
                </button>
              ))}
            </>
          )}
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          pageSizeOptions={TENANT_SEARCH_PAGE_SIZE_OPTIONS}
          className='shrink-0 pt-2'
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </DialogContent>
    </Dialog>
  )
})

function DraftEditor({
  draft,
  setDraft,
  providers,
  models,
  resolutions,
  ratios,
}: {
  draft: DraftDoc
  setDraft: (next: DraftDoc) => void
  providers: { id: string; code: string; name: string }[]
  models: {
    id: string
    provider_id: string
    code: string
    name: string
    weight: number
    enabled: boolean
    is_default: boolean
  }[]
  resolutions: string[]
  ratios: string[]
}) {
  const updateProvider = (
    code: string,
    updater: (provider: DraftProvider) => DraftProvider
  ) => {
    setDraft({
      providers: draft.providers.map((provider) =>
        provider.provider_code === code ? updater(provider) : provider
      ),
    })
  }

  return (
    <div className='space-y-4'>
      {draft.providers.length === 0 && (
        <div className='text-muted-foreground rounded-md border py-10 text-center text-sm'>
          没有可选的供应商，请先在「模型配置」中启用供应商与模型。
        </div>
      )}
      {draft.providers.map((provider) => {
        const providerMeta = providers.find(
          (item) => item.code === provider.provider_code
        )
        const providerModels = models.filter(
          (model) => model.provider_id === providerMeta?.id
        )
        return (
          <ProviderDraftCard
            key={provider.provider_code}
            provider={provider}
            providerName={providerMeta?.name ?? provider.provider_code}
            models={providerModels}
            resolutions={resolutions}
            ratios={ratios}
            onIncludedChange={(included) =>
              updateProvider(provider.provider_code, (item) => ({
                ...item,
                included,
              }))
            }
            onToggleEnhancement={(enhancement_enabled) =>
              updateProvider(provider.provider_code, (item) => ({
                ...item,
                enhancement_enabled,
                enhancement_strategies: enhancement_enabled
                  ? item.enhancement_strategies
                  : [],
              }))
            }
            onAddStrategy={() =>
              updateProvider(provider.provider_code, (item) => ({
                ...item,
                enhancement_strategies: [
                  ...item.enhancement_strategies,
                  { source: '', target: '' },
                ],
              }))
            }
            onUpdateStrategy={(index, next) =>
              updateProvider(provider.provider_code, (item) => ({
                ...item,
                enhancement_strategies: item.enhancement_strategies.map(
                  (strategy, strategyIndex) =>
                    strategyIndex === index ? next : strategy
                ),
              }))
            }
            onRemoveStrategy={(index) =>
              updateProvider(provider.provider_code, (item) => ({
                ...item,
                enhancement_strategies: item.enhancement_strategies.filter(
                  (_, strategyIndex) => strategyIndex !== index
                ),
              }))
            }
            onUpdateLimits={(generation_limits) =>
              updateProvider(provider.provider_code, (item) => ({
                ...item,
                generation_limits,
              }))
            }
            onUpdateModel={(modelId, updater) =>
              updateProvider(provider.provider_code, (item) => ({
                ...item,
                models: item.models.map((model) =>
                  model.model_id === modelId ? updater(model) : model
                ),
              }))
            }
          />
        )
      })}
    </div>
  )
}

function ProviderDraftCard({
  provider,
  providerName,
  models,
  resolutions,
  ratios,
  onIncludedChange,
  onToggleEnhancement,
  onAddStrategy,
  onUpdateStrategy,
  onRemoveStrategy,
  onUpdateLimits,
  onUpdateModel,
}: {
  provider: DraftProvider
  providerName: string
  models: {
    id: string
    code: string
    name: string
    weight: number
    enabled: boolean
    is_default: boolean
  }[]
  resolutions: string[]
  ratios: string[]
  onIncludedChange: (included: boolean) => void
  onToggleEnhancement: (enabled: boolean) => void
  onAddStrategy: () => void
  onUpdateStrategy: (
    index: number,
    next: { source: string; target: string }
  ) => void
  onRemoveStrategy: (index: number) => void
  onUpdateLimits: (limits: ProviderGenerationLimits) => void
  onUpdateModel: (
    modelId: string,
    updater: (
      model: DraftProvider['models'][number]
    ) => DraftProvider['models'][number]
  ) => void
}) {
  const included = provider.included
  const includedModels = provider.models.filter((model) => model.included)
  const totalWeight = includedModels.reduce(
    (sum, model) => sum + safeParseInt(model.weight, 0),
    0
  )
  const defaultModel = includedModels.find((model) => model.is_default)

  return (
    <div
      className={cn(
        'rounded-md border p-4 transition-colors',
        included ? 'border-primary/40 bg-primary/5' : 'bg-muted/20'
      )}
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='truncate text-base font-semibold'>
              {providerName}
            </span>
            <Badge variant='outline' className='font-mono text-xs'>
              {provider.provider_code}
            </Badge>
            {included && (
              <Badge variant='default'>{includedModels.length} 个模型</Badge>
            )}
          </div>
          {!included && (
            <p className='text-muted-foreground mt-1 text-xs'>
              该供应商未启用，租户将不会使用其模型。
            </p>
          )}
          {included && (
            <p className='text-muted-foreground mt-1 text-xs'>
              总权重 {totalWeight}
              {defaultModel
                ? ` · 默认模型 ${defaultModel.model_id}`
                : ' · 未设置默认模型'}
            </p>
          )}
        </div>
        <div className='flex items-center gap-3'>
          <label className='flex cursor-pointer items-center gap-2 text-sm'>
            <Switch
              checked={included}
              onCheckedChange={(checked) => onIncludedChange(checked === true)}
            />
            <span>启用供应商</span>
          </label>
        </div>
      </div>

      {included && (
        <div className='mt-4 space-y-4'>
          <GenerationLimitsEditor
            limits={provider.generation_limits}
            ratios={ratios}
            resolutions={resolutions}
            onChange={onUpdateLimits}
          />
          <div>
            <div className='overflow-x-auto rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-10'></TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead className='w-32'>权重</TableHead>
                    <TableHead className='w-28'>默认</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provider.models.map((model) => {
                    const meta = models.find(
                      (item) => item.id === model.model_id
                    )
                    return (
                      <TableRow key={model.model_id}>
                        <TableCell>
                          <Checkbox
                            checked={model.included}
                            onCheckedChange={(checked) =>
                              onUpdateModel(model.model_id, (current) => ({
                                ...current,
                                included: checked === true,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className='font-medium'>
                            {meta?.name ?? model.model_id}
                          </div>
                          <div className='text-muted-foreground truncate font-mono text-xs'>
                            {meta?.code ?? ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type='number'
                            min={0}
                            max={MAX_WEIGHT}
                            disabled={!model.included}
                            value={model.weight}
                            onChange={(event) =>
                              onUpdateModel(model.model_id, (current) => ({
                                ...current,
                                weight: event.target.value,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <label className='flex cursor-pointer items-center gap-2 text-xs'>
                            <Checkbox
                              checked={model.is_default}
                              disabled={!model.included}
                              onCheckedChange={(checked) =>
                                onUpdateModel(model.model_id, (current) => ({
                                  ...current,
                                  is_default: checked === true,
                                }))
                              }
                            />
                            <span>默认</span>
                          </label>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {provider.models.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className='text-muted-foreground h-20 text-center'
                      >
                        该供应商下暂无可用模型
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className='space-y-3 rounded-md border p-3'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='flex items-center gap-2'>
                <Wand2 className='text-muted-foreground size-4' />
                <span className='text-sm font-medium'>画质增强</span>
              </div>
              <Switch
                checked={provider.enhancement_enabled}
                onCheckedChange={(checked) =>
                  onToggleEnhancement(checked === true)
                }
              />
            </div>
            {provider.enhancement_enabled && (
              <div className='space-y-3'>
                <div className='overflow-x-auto rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-32'>目标分辨率</TableHead>
                        <TableHead className='w-32'>源分辨率</TableHead>
                        <TableHead className='w-14' />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {provider.enhancement_strategies.map(
                        (strategy, index) => {
                          const providerResolutions =
                            provider.generation_limits.allowed_resolutions
                          const targetOptions = providerResolutions.filter(
                            (_, resolutionIndex) => resolutionIndex > 0
                          )
                          const targetIndex = providerResolutions.indexOf(
                            strategy.target
                          )
                          const sourceOptions =
                            targetIndex > 0
                              ? providerResolutions.slice(0, targetIndex)
                              : []
                          return (
                            <TableRow key={`strategy-${index}`}>
                              <TableCell>
                                <Select
                                  value={strategy.target}
                                  onValueChange={(value) =>
                                    onUpdateStrategy(index, {
                                      source: pickDefaultSource(
                                        providerResolutions,
                                        value,
                                        strategy.source
                                      ),
                                      target: value,
                                    })
                                  }
                                >
                                  <SelectTrigger className='min-w-28 uppercase'>
                                    <SelectValue placeholder='选择目标分辨率' />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {targetOptions.map((resolution) => (
                                      <SelectItem
                                        key={resolution}
                                        value={resolution}
                                      >
                                        {resolution.toUpperCase()}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={strategy.source}
                                  disabled={!strategy.target}
                                  onValueChange={(value) =>
                                    onUpdateStrategy(index, {
                                      ...strategy,
                                      source: value,
                                    })
                                  }
                                >
                                  <SelectTrigger className='min-w-28 uppercase'>
                                    <SelectValue
                                      placeholder={
                                        strategy.target
                                          ? '选择源分辨率'
                                          : '请先选择目标分辨率'
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sourceOptions.map((resolution) => (
                                      <SelectItem
                                        key={resolution}
                                        value={resolution}
                                      >
                                        {resolution.toUpperCase()}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  title='删除策略'
                                  onClick={() => onRemoveStrategy(index)}
                                >
                                  <Trash2 />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        }
                      )}
                      {provider.enhancement_strategies.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className='text-muted-foreground h-20 text-center'
                          >
                            暂无画质增强策略
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className='flex justify-end'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={onAddStrategy}
                  >
                    <Plus />
                    添加策略
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EffectiveRuleDialog({
  tenant,
  onClose,
}: {
  tenant: TenantModelRule
  onClose: () => void
}) {
  const query = useQuery({
    queryKey: ['admin-tenant-effective-rule', tenant.tenant_public_id],
    queryFn: () => getTenantEffectiveRule(tenant.tenant_public_id),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='flex max-h-[85vh] flex-col overflow-hidden sm:max-w-3xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle className='flex items-center gap-2'>
            生效规则预览 · {tenant.display_name}
          </DialogTitle>
          <DialogDescription>
            展示该租户当前请求视频生成时实际使用的供应商与模型集合，
            包含已配置租户规则与回退全局规则两种来源。
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pe-1'>
          {query.isLoading && (
            <div className='text-muted-foreground py-12 text-center text-sm'>
              正在加载生效规则…
            </div>
          )}
          {query.isError && (
            <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-4 py-3 text-sm'>
              加载失败：{getApiErrorMessage(query.error)}
            </div>
          )}
          {query.data && <EffectiveRuleContent rule={query.data} />}
        </div>
        <DialogFooter className='mt-4 shrink-0'>
          <Button type='button' variant='outline' onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EffectiveRuleContent({ rule }: { rule: TenantEffectiveRule }) {
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <Badge
          variant={rule.rule_source === 'tenant' ? 'default' : 'secondary'}
        >
          {rule.rule_source === 'tenant' ? '使用租户规则' : '回退全局规则'}
        </Badge>
        <span className='text-muted-foreground text-xs'>
          共 {rule.providers.length} 个供应商
        </span>
      </div>
      {rule.providers.map((provider) => (
        <EffectiveProviderCard
          key={provider.provider_code}
          provider={provider}
        />
      ))}
      {rule.providers.length === 0 && (
        <div className='text-muted-foreground rounded-md border py-10 text-center text-sm'>
          当前没有可用的供应商与模型
        </div>
      )}
    </div>
  )
}

function EffectiveProviderCard({
  provider,
}: {
  provider: TenantEffectiveRuleProvider
}) {
  return (
    <div className='rounded-md border p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <div className='text-sm font-semibold'>{provider.provider_name}</div>
          <div className='text-muted-foreground font-mono text-xs'>
            {provider.provider_code}
          </div>
        </div>
        <Badge variant={provider.enhancement_enabled ? 'default' : 'secondary'}>
          画质增强 {provider.enhancement_enabled ? '已启用' : '未启用'}
        </Badge>
      </div>

      {provider.enhancement_enabled &&
        provider.enhancement_strategies.length > 0 && (
          <div className='mt-3 flex flex-wrap gap-2'>
            {provider.enhancement_strategies.map((strategy, index) => (
              <Badge
                key={`${strategy.target_resolution}-${index}`}
                variant='outline'
                className='uppercase'
              >
                {strategy.source_resolution} → {strategy.target_resolution}
              </Badge>
            ))}
          </div>
        )}

      <div className='mt-3 overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>模型</TableHead>
              <TableHead className='w-28'>权重</TableHead>
              <TableHead className='w-24'>默认</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {provider.models.map((model) => (
              <TableRow key={model.model_id}>
                <TableCell>
                  <div className='font-medium'>{model.name}</div>
                  <div className='text-muted-foreground truncate font-mono text-xs'>
                    {model.model_code}
                  </div>
                </TableCell>
                <TableCell className='font-medium'>{model.weight}</TableCell>
                <TableCell>
                  {model.is_default ? (
                    <Badge variant='default'>默认</Badge>
                  ) : (
                    <span className='text-muted-foreground text-xs'>-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {provider.models.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className='text-muted-foreground h-20 text-center'
                >
                  当前供应商下没有可用模型
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function draftFromExisting(
  rules: TenantRuleDoc,
  providers: {
    id: string
    code: string
  }[],
  models: {
    id: string
    provider_id: string
    weight: number
  }[]
): DraftDoc {
  const existingProviders = new Map(
    rules.providers.map((provider) => [provider.provider_code, provider])
  )

  return {
    providers: providers.map((provider) => {
      const existingProvider = existingProviders.get(provider.code)
      const existingModels = new Map(
        existingProvider?.models.map((model) => [model.model_id, model])
      )

      return {
        provider_code: provider.code,
        included: Boolean(existingProvider),
        enhancement_enabled: existingProvider?.enhancement_enabled ?? false,
        enhancement_strategies:
          existingProvider?.enhancement_strategies.map((strategy) => ({
            source: strategy.source_resolution,
            target: strategy.target_resolution,
          })) ?? [],
        generation_limits: normalizeGenerationLimits(
          existingProvider?.generation_limits
        ),
        models: models
          .filter((model) => model.provider_id === provider.id)
          .map((model) => {
            const existingModel = existingModels.get(model.id)
            return {
              model_id: model.id,
              included: Boolean(existingModel),
              weight: String(existingModel?.weight ?? model.weight),
              is_default: existingModel?.is_default ?? false,
            }
          }),
      }
    }),
  }
}

function buildDraftFromGlobalCatalog(
  providers: {
    id: string
    code: string
    name: string
    enabled: boolean
  }[],
  models: {
    id: string
    provider_id: string
    weight: number
    enabled: boolean
    is_default: boolean
  }[],
  globalRule?: {
    providers: {
      provider_code: string
      generation_limits: ProviderGenerationLimits
    }[]
  }
): DraftDoc {
  // 新建租户规则时，以「全局目录中启用且有权重的模型」为初始草稿；
  // 用户可在此基础上裁剪。
  const draftProviders: DraftProvider[] = providers
    .filter((provider) => provider.enabled)
    .map((provider) => {
      const providerModels = models.filter(
        (model) => model.provider_id === provider.id && model.enabled
      )
      return {
        provider_code: provider.code,
        included: providerModels.length > 0,
        enhancement_enabled: false,
        enhancement_strategies: [],
        generation_limits: normalizeGenerationLimits(
          globalRule?.providers.find(
            (item) => item.provider_code === provider.code
          )?.generation_limits
        ),
        models: providerModels.map((model) => ({
          model_id: model.id,
          included: true,
          weight: String(model.weight),
          is_default: model.is_default,
        })),
      }
    })
  return { providers: draftProviders }
}

function buildTenantRuleDoc(draft: DraftDoc): TenantRuleDoc {
  const providers: TenantRuleProvider[] = draft.providers
    .filter((provider) => provider.included)
    .map((provider) => ({
      provider_code: provider.provider_code,
      enhancement_enabled: provider.enhancement_enabled,
      enhancement_strategies: provider.enhancement_strategies
        .filter((strategy) => strategy.source.trim() && strategy.target.trim())
        .map<TenantRuleEnhancementStrategy>((strategy) => ({
          source_resolution: strategy.source,
          target_resolution: strategy.target,
        })),
      generation_limits: provider.generation_limits,
      models: provider.models
        .filter((model) => model.included)
        .map<TenantRuleModel>((model) => ({
          model_id: model.model_id,
          weight: clampWeight(model.weight),
          is_default: model.is_default,
        })),
    }))
  return {
    schema_version: SCHEMA_VERSION,
    providers,
  }
}

function sanitizeDraftForSystemResolutions(
  draft: DraftDoc,
  resolutions: string[]
): DraftDoc {
  const normalizedResolutions = resolutions
    .map((resolution) => resolution.trim().toLowerCase())
    .filter(Boolean)
  const allowedSystemResolutions = new Set(normalizedResolutions)

  return {
    providers: draft.providers.map((provider) => {
      const generationLimits = normalizeGenerationLimits(
        provider.generation_limits
      )
      const allowedResolutions = generationLimits.allowed_resolutions
        .map((resolution) => resolution.trim().toLowerCase())
        .filter(
          (resolution, index, values) =>
            allowedSystemResolutions.has(resolution) &&
            values.indexOf(resolution) === index
        )
      const allowedProviderResolutions = new Set(allowedResolutions)
      return {
        ...provider,
        generation_limits: {
          ...generationLimits,
          allowed_resolutions: allowedResolutions,
        },
        enhancement_strategies: provider.enhancement_strategies.filter(
          (strategy) => {
            const sourceIndex = normalizedResolutions.indexOf(strategy.source)
            const targetIndex = normalizedResolutions.indexOf(strategy.target)
            return (
              allowedProviderResolutions.has(strategy.source) &&
              allowedProviderResolutions.has(strategy.target) &&
              sourceIndex >= 0 &&
              sourceIndex < targetIndex
            )
          }
        ),
      }
    }),
  }
}

function validateDraftDoc(
  draft: DraftDoc,
  providers: { code: string }[],
  models: { id: string }[]
) {
  const providerCodes = new Set(providers.map((provider) => provider.code))
  const modelIds = new Set(models.map((model) => model.id))
  const includedProviders = draft.providers.filter(
    (provider) => provider.included
  )
  if (includedProviders.length === 0) {
    throw new Error('至少需要启用一个供应商')
  }
  for (const provider of includedProviders) {
    if (!providerCodes.has(provider.provider_code)) {
      throw new Error(`供应商不存在：${provider.provider_code}`)
    }
    const includedModels = provider.models.filter((model) => model.included)
    if (includedModels.length === 0) {
      throw new Error(`供应商 ${provider.provider_code} 至少需要一个模型`)
    }
    let totalWeight = 0
    for (const model of includedModels) {
      if (!modelIds.has(model.model_id)) {
        throw new Error(`模型不存在：${model.model_id}`)
      }
      const weight = safeParseInt(model.weight, NaN)
      if (!Number.isFinite(weight) || weight < 0 || weight > MAX_WEIGHT) {
        throw new Error(
          `模型 ${model.model_id} 的权重需在 0 到 ${MAX_WEIGHT} 之间`
        )
      }
      totalWeight += weight
    }
    if (totalWeight === 0) {
      throw new Error(
        `供应商 ${provider.provider_code} 至少需要一个权重大于 0 的模型`
      )
    }
  }
}

function pickDefaultSource(
  resolutions: string[],
  target: string,
  currentSource: string
) {
  const targetIndex = resolutions.indexOf(target)
  if (targetIndex <= 0) return ''
  const sources = resolutions.slice(0, targetIndex)
  if (currentSource && sources.includes(currentSource)) return currentSource
  return sources[sources.length - 1] ?? ''
}

function safeParseInt(value: string, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.trunc(parsed)
}

function clampWeight(value: string) {
  const parsed = safeParseInt(value, 0)
  if (parsed < 0) return 0
  if (parsed > MAX_WEIGHT) return MAX_WEIGHT
  return parsed
}

function formatDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
