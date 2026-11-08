import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { PageShell } from '@/components/layout/PageShell'
import { getApiErrorMessage } from '@/services/api/apiError'
import { getVideoResolutions } from '@/services/api/systemSettingsApi'
import {
  getGlobalModelRule,
  updateGlobalModelRule,
  type GlobalModelRule,
  type GlobalModelRuleModel,
} from '@/services/api/tenantModelRuleApi'
import { listVideoRatios } from '@/services/api/videoRatioApi'
import { GenerationLimitsEditor } from './GenerationLimitsEditor'
import {
  applyAllowedResolutions,
  sanitizeGlobalRuleForSystemResolutions,
} from './globalModelRuleDraft'

const scenarios = [
  { key: 'no_input_video' as const, label: '无参考视频' },
  { key: 'input_video' as const, label: '有参考视频' },
]

export const GlobalModelRules = ({ tabList }: { tabList?: ReactNode }) => {
  const queryClient = useQueryClient()
  const ruleQuery = useQuery({
    queryKey: ['admin-global-model-rule'],
    queryFn: getGlobalModelRule,
  })
  const resolutionsQuery = useQuery({
    queryKey: ['video-resolutions'],
    queryFn: getVideoResolutions,
  })
  const ratiosQuery = useQuery({
    queryKey: ['video-ratios'],
    queryFn: listVideoRatios,
  })
  const [draft, setDraft] = useState<GlobalModelRule | null>(null)
  const [providerTab, setProviderTab] = useState('')

  useEffect(() => {
    if (!ruleQuery.data) return
    setDraft(
      resolutionsQuery.data
        ? sanitizeGlobalRuleForSystemResolutions(
            ruleQuery.data,
            resolutionsQuery.data.resolutions
          )
        : structuredClone(ruleQuery.data)
    )
  }, [ruleQuery.data, resolutionsQuery.data])

  const providers = draft?.providers ?? []
  const providerTabs = useMemo(
    () =>
      providers.map((provider) => ({
        value: provider.provider_id,
        label: provider.provider_name,
        code: provider.provider_code,
        enabled: provider.enabled,
      })),
    [providers]
  )

  useEffect(() => {
    if (providerTabs.length === 0) {
      setProviderTab('')
      return
    }
    if (!providerTabs.some((item) => item.value === providerTab)) {
      setProviderTab(providerTabs[0].value)
    }
  }, [providerTab, providerTabs])

  const activeProvider =
    providers.find((provider) => provider.provider_id === providerTab) ??
    providers[0]

  const saveMutation = useMutation({
    mutationFn: (rules: GlobalModelRule) => updateGlobalModelRule(rules),
    onSuccess: (rules) => {
      setDraft(structuredClone(rules))
      void queryClient.invalidateQueries({
        queryKey: ['admin-global-model-rule'],
      })
      void queryClient.invalidateQueries({ queryKey: ['model-catalog'] })
      toast.success('全局规则已保存')
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '全局规则保存失败')),
  })

  const updateModel = (
    providerId: string,
    modelId: string,
    update: (model: GlobalModelRuleModel) => GlobalModelRuleModel
  ) => {
    setDraft(
      (current) =>
        current && {
          providers: current.providers.map((provider) =>
            provider.provider_id !== providerId
              ? provider
              : {
                  ...provider,
                  models: provider.models.map((model) =>
                    model.model_id === modelId ? update(model) : model
                  ),
                }
          ),
        }
    )
  }
  const updateProvider = (
    providerId: string,
    update: (
      provider: GlobalModelRule['providers'][number]
    ) => GlobalModelRule['providers'][number]
  ) => {
    setDraft(
      (current) =>
        current && {
          providers: current.providers.map((provider) =>
            provider.provider_id === providerId ? update(provider) : provider
          ),
        }
    )
  }
  const resolutions = resolutionsQuery.data?.resolutions ?? []

  return (
    <PageShell
      title='全局规则'
      description='为未配置租户规则的租户统一设置模型计费、路由与画质提升。'
      actions={
        <>
          <Button
            variant='outline'
            size='icon'
            title='刷新'
            disabled={ruleQuery.isFetching}
            onClick={() => void ruleQuery.refetch()}
          >
            <RefreshCw className={ruleQuery.isFetching ? 'animate-spin' : ''} />
          </Button>
          <Button
            disabled={
              !draft || !resolutionsQuery.data || saveMutation.isPending
            }
            onClick={() => draft && saveMutation.mutate(draft)}
          >
            <Save />
            {saveMutation.isPending ? '保存中' : '保存全局规则'}
          </Button>
        </>
      }
      surfaceClassName='overflow-hidden p-0'
    >
      {tabList}
      {ruleQuery.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive m-5 rounded-md border px-4 py-3 text-sm'>
          全局规则加载失败：{getApiErrorMessage(ruleQuery.error)}
        </div>
      )}
      {!draft && !ruleQuery.isError && (
        <div className='text-muted-foreground py-16 text-center text-sm'>
          正在加载全局规则...
        </div>
      )}
      {draft && providerTabs.length > 0 && activeProvider ? (
        <div className='grid min-h-[28rem] lg:grid-cols-[13.5rem_minmax(0,1fr)]'>
          <aside className='bg-muted/30 border-b p-3 lg:border-e lg:border-b-0'>
            <nav className='flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible'>
              {providerTabs.map((item) => {
                const selected = item.value === activeProvider.provider_id
                return (
                  <button
                    key={item.value}
                    type='button'
                    onClick={() => setProviderTab(item.value)}
                    className={cn(
                      'flex min-w-[8.5rem] flex-col rounded-lg px-3 py-2.5 text-start transition-colors lg:min-w-0',
                      selected
                        ? 'bg-background text-foreground ring-border shadow-xs ring-1'
                        : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                    )}
                  >
                    <span className='truncate text-sm font-medium'>
                      {item.label}
                    </span>
                    <span className='text-muted-foreground mt-0.5 truncate font-mono text-[10px]'>
                      {item.code}
                      {item.enabled ? '' : ' · 已停用'}
                    </span>
                  </button>
                )
              })}
            </nav>
          </aside>
          <div className='min-w-0 space-y-4 p-5'>
            <ProviderRuleSection
              provider={activeProvider}
              resolutions={resolutions}
              ratios={ratiosQuery.data?.map((item) => item.value) ?? []}
              onUpdateProvider={(update) =>
                updateProvider(activeProvider.provider_id, update)
              }
              onUpdateModel={(modelId, update) =>
                updateModel(activeProvider.provider_id, modelId, update)
              }
            />
          </div>
        </div>
      ) : null}
      {draft && providers.length === 0 ? (
        <div className='text-muted-foreground py-16 text-center text-sm'>
          暂无供应商可配置
        </div>
      ) : null}
    </PageShell>
  )
}

function ProviderRuleSection({
  provider,
  resolutions,
  ratios,
  onUpdateProvider,
  onUpdateModel,
}: {
  provider: GlobalModelRule['providers'][number]
  resolutions: string[]
  ratios: string[]
  onUpdateProvider: (
    update: (
      provider: GlobalModelRule['providers'][number]
    ) => GlobalModelRule['providers'][number]
  ) => void
  onUpdateModel: (
    modelId: string,
    update: (model: GlobalModelRuleModel) => GlobalModelRuleModel
  ) => void
}) {
  return (
    <section className='space-y-4'>
      <div className='flex flex-wrap items-center gap-x-6 gap-y-3 border-b pb-4'>
        <SwitchRow
          label='启用供应商'
          checked={provider.enabled}
          onCheckedChange={(enabled) =>
            onUpdateProvider((item) => ({
              ...item,
              enabled,
            }))
          }
        />
        <SwitchRow
          label='画质提升'
          checked={provider.enhancement_enabled}
          onCheckedChange={(enhancement_enabled) =>
            onUpdateProvider((item) => ({
              ...item,
              enhancement_enabled,
            }))
          }
        />
      </div>
      {provider.enhancement_enabled && (
        <EnhancementStrategies
          provider={provider}
          resolutions={provider.generation_limits.allowed_resolutions}
          onChange={(enhancement_strategies) =>
            onUpdateProvider((item) => ({
              ...item,
              enhancement_strategies,
            }))
          }
        />
      )}
      <GenerationLimitsEditor
        limits={provider.generation_limits}
        ratios={ratios}
        resolutions={resolutions}
        onChange={(generation_limits) =>
          onUpdateProvider((item) =>
            applyAllowedResolutions(
              { ...item, generation_limits },
              generation_limits.allowed_resolutions
            )
          )
        }
      />
      <div className='overflow-x-auto rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>模型</TableHead>
              <TableHead>基础积分/秒</TableHead>
              <TableHead>支持分辨率</TableHead>
              <TableHead>分辨率系数</TableHead>
              <TableHead>调用权重</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {provider.models.map((model) => (
              <GlobalModelRow
                key={model.model_id}
                model={model}
                resolutions={provider.generation_limits.allowed_resolutions}
                onChange={(update) => onUpdateModel(model.model_id, update)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function GlobalModelRow({
  model,
  resolutions,
  onChange,
}: {
  model: GlobalModelRuleModel
  resolutions: string[]
  onChange: (
    update: (model: GlobalModelRuleModel) => GlobalModelRuleModel
  ) => void
}) {
  const visibleResolutions = model.supported_resolutions.filter((resolution) =>
    resolutions.includes(resolution)
  )
  const coefficient = (
    resolution: string,
    scenario: 'no_input_video' | 'input_video'
  ) =>
    model.pricing_rules.find(
      (item) => item.resolution === resolution && item.scenario === scenario
    )?.coefficient ?? 1
  const setCoefficient = (
    resolution: string,
    scenario: 'no_input_video' | 'input_video',
    value: string
  ) =>
    onChange((current) => ({
      ...current,
      pricing_rules: current.pricing_rules.map((item) =>
        item.resolution === resolution && item.scenario === scenario
          ? { ...item, coefficient: Number(value) }
          : item
      ),
    }))
  const toggleResolution = (resolution: string, checked: boolean) =>
    onChange((current) => ({
      ...current,
      supported_resolutions: checked
        ? [...current.supported_resolutions, resolution]
        : current.supported_resolutions.filter((item) => item !== resolution),
      pricing_rules: checked
        ? [
            ...current.pricing_rules,
            ...scenarios.map(({ key }) => ({
              resolution,
              scenario: key,
              coefficient: 1,
            })),
          ]
        : current.pricing_rules.filter(
            (item) => item.resolution !== resolution
          ),
    }))
  return (
    <TableRow>
      <TableCell>
        <div className='font-medium'>{model.model_name}</div>
        <div className='text-muted-foreground font-mono text-xs'>
          {model.model_code}
        </div>
      </TableCell>
      <TableCell>
        <Input
          className='w-24'
          min={1}
          type='number'
          value={model.base_credits}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              base_credits: Number(event.target.value),
            }))
          }
        />
      </TableCell>
      <TableCell>
        <div className='grid min-w-36 gap-2'>
          {resolutions.map((resolution) => (
            <Label key={resolution} className='flex items-center gap-2 text-xs'>
              <Checkbox
                checked={model.supported_resolutions.includes(resolution)}
                onCheckedChange={(value) =>
                  toggleResolution(resolution, value === true)
                }
              />
              {resolution}
            </Label>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <div className='grid min-w-56 gap-2'>
          {visibleResolutions.map((resolution) => (
            <div
              key={resolution}
              className='grid grid-cols-[42px_1fr_1fr] items-center gap-2'
            >
              <span className='text-muted-foreground text-xs'>
                {resolution}
              </span>
              {scenarios.map(({ key, label }) => (
                <Input
                  key={key}
                  aria-label={`${resolution}${label}系数`}
                  min='0.000001'
                  step='0.000001'
                  type='number'
                  value={coefficient(resolution, key)}
                  onChange={(event) =>
                    setCoefficient(resolution, key, event.target.value)
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Input
          className='w-24'
          min={0}
          max={1000000}
          type='number'
          value={model.weight}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              weight: Number(event.target.value),
            }))
          }
        />
      </TableCell>
      <TableCell>
        <div className='grid gap-3'>
          <SwitchRow
            label='启用'
            checked={model.enabled}
            onCheckedChange={(enabled) =>
              onChange((current) => ({ ...current, enabled }))
            }
          />
          <SwitchRow
            label='默认'
            checked={model.is_default}
            onCheckedChange={(is_default) =>
              onChange((current) => ({ ...current, is_default }))
            }
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

function EnhancementStrategies({
  provider,
  resolutions,
  onChange,
}: {
  provider: GlobalModelRule['providers'][number]
  resolutions: string[]
  onChange: (
    items: GlobalModelRule['providers'][number]['enhancement_strategies']
  ) => void
}) {
  const add = () => {
    const target = resolutions.find(
      (item, index) =>
        index > 0 &&
        !provider.enhancement_strategies.some(
          (strategy) => strategy.target_resolution === item
        )
    )
    if (target)
      onChange([
        ...provider.enhancement_strategies,
        {
          target_resolution: target,
          source_resolution: resolutions[resolutions.indexOf(target) - 1],
        },
      ])
  }
  return (
    <div className='flex flex-wrap items-end gap-3'>
      {provider.enhancement_strategies.map((strategy, index) => (
        <div
          key={strategy.target_resolution}
          className='flex items-center gap-2'
        >
          <Select
            value={strategy.source_resolution}
            onValueChange={(source_resolution) =>
              onChange(
                provider.enhancement_strategies.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, source_resolution } : item
                )
              )
            }
          >
            <SelectTrigger className='w-28'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {resolutions
                .slice(0, resolutions.indexOf(strategy.target_resolution))
                .map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <span className='text-muted-foreground text-sm'>
            → {strategy.target_resolution}
          </span>
          <Button
            variant='ghost'
            size='icon'
            title='移除画质提升策略'
            onClick={() =>
              onChange(
                provider.enhancement_strategies.filter(
                  (_, itemIndex) => itemIndex !== index
                )
              )
            }
          >
            <X />
          </Button>
        </div>
      ))}
      <Button
        variant='outline'
        size='sm'
        disabled={
          provider.enhancement_strategies.length >=
          Math.max(0, resolutions.length - 1)
        }
        onClick={add}
      >
        <Plus />
        添加策略
      </Button>
    </div>
  )
}

function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Label className='flex items-center gap-2 text-sm'>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      {label}
    </Label>
  )
}
