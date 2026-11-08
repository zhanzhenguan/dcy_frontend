import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addEdge,
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Braces,
  CheckCircle2,
  CirclePlus,
  ClipboardCheck,
  FilePenLine,
  GitBranch,
  Eye,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Send,
  Timer,
  Trash2,
  Workflow,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alertDialog'
import {
  Dialog,
  DialogContent,
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
import { getApiErrorMessage } from '@/services/api/apiError'
import { listCouponTemplates } from '@/services/api/couponApi'
import {
  archiveMarketingCampaign,
  createMarketingCampaign,
  dryRunMarketingCampaigns,
  getMarketingCampaign,
  getMarketingDryRunOptions,
  getMarketingExecution,
  getMarketingEventCatalog,
  listMarketingCampaigns,
  listMarketingExecutions,
  listMarketingRewards,
  publishMarketingCampaign,
  retryMarketingExecution,
  updateMarketingCampaign,
  updateMarketingCampaignStatus,
  type MarketingCampaign,
  type MarketingCampaignInput,
  type MarketingDryRunInput,
  type MarketingDryRunMatch,
  type MarketingEventCatalog,
  type MarketingEventField,
  type MarketingExecution,
  type MarketingNodeTrace,
  type MarketingParticipationRule,
} from '@/services/api/marketingCampaignApi'
import {
  addFlowNode,
  canConnect,
  changeTrigger,
  createEmptyFlow,
  emptyConditionGroup,
  flowValidationMessages,
  needsCouponTemplates,
  parseFlowConfig,
  removeFlowNode,
  uncappedCouponTemplateNames,
  updateFlowNode,
  variablesForTrigger,
  type CampaignFlowConfig,
  type CampaignFlowNode,
  type ConditionGroup,
  type ConditionLeaf,
} from '../campaignFlow'

const PAGE_SIZE = 100
type FlowCanvasNode = Node<{ node: CampaignFlowNode }, 'campaign'>
const nodeTypes = { campaign: CampaignNodeCard } satisfies NodeTypes

export const MarketingCampaignWorkspace = () => {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<
    'campaigns' | 'archived' | 'executions' | 'rewards'
  >('campaigns')
  const [editor, setEditor] = useState<MarketingCampaign | 'create' | null>(
    null
  )
  const campaigns = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: () => listMarketingCampaigns({ page: 1, page_size: PAGE_SIZE }),
  })
  const catalog = useQuery({
    queryKey: ['marketing-event-catalog'],
    queryFn: getMarketingEventCatalog,
  })
  const detail = useMutation({
    mutationFn: getMarketingCampaign,
    onSuccess: setEditor,
    onError: (error) => toast.error(getApiErrorMessage(error, '读取活动失败')),
  })
  const status = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'RUNNING' | 'PAUSED' }) =>
      updateMarketingCampaignStatus(id, next),
    onSuccess: () => {
      toast.success('活动状态已更新')
      void queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] })
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '更新活动状态失败')),
  })
  const visibleCampaigns = (campaigns.data?.items ?? []).filter((campaign) =>
    tab === 'archived'
      ? campaign.status === 'ARCHIVED' || Boolean(campaign.archived_at)
      : !campaign.archived_at && campaign.status !== 'ARCHIVED'
  )

  return (
    <PageShell
      title='营销活动'
      actions={
        tab === 'campaigns' ? (
          <Button onClick={() => setEditor('create')}>
            <CirclePlus /> 新建活动
          </Button>
        ) : undefined
      }
      surfaceClassName='space-y-5'
    >
      <div className='flex flex-wrap gap-2 border-b pb-3' role='tablist'>
        <TabButton
          active={tab === 'campaigns'}
          onClick={() => setTab('campaigns')}
        >
          活动配置
        </TabButton>
        <TabButton
          active={tab === 'archived'}
          onClick={() => setTab('archived')}
        >
          已归档
        </TabButton>
        <TabButton
          active={tab === 'executions'}
          onClick={() => setTab('executions')}
        >
          执行记录
        </TabButton>
        <TabButton active={tab === 'rewards'} onClick={() => setTab('rewards')}>
          奖励记录
        </TabButton>
      </div>
      {(tab === 'campaigns' || tab === 'archived') && (
        <>
          {catalog.error && (
            <ErrorNotice error={catalog.error} message='事件目录加载失败' />
          )}
          {campaigns.error && (
            <ErrorNotice error={campaigns.error} message='活动加载失败' />
          )}
          <div className='overflow-x-auto rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>活动</TableHead>
                  <TableHead>触发事件</TableHead>
                  <TableHead>流程版本</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>预算</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCampaigns.map((campaign) => {
                  const running = campaign.status === 'RUNNING'
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div className='font-medium'>{campaign.name}</div>
                        <div className='text-muted-foreground font-mono text-xs'>
                          {campaign.campaign_code}
                        </div>
                      </TableCell>
                      <TableCell>
                        {eventName(catalog.data, campaign.trigger_type)}
                      </TableCell>
                      <TableCell>{campaign.flow_version || '0'}</TableCell>
                      <TableCell>
                        <StatusBadge status={campaign.status} />
                      </TableCell>
                      <TableCell className='tabular-nums'>
                        {campaign.budget_amount
                          ? `${campaign.used_amount} / ${campaign.budget_amount}`
                          : '不限'}
                      </TableCell>
                      <TableCell className='text-muted-foreground text-sm'>
                        {formatDate(campaign.updated_at)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {tab === 'campaigns' && (
                          <>
                            <Button
                              variant='ghost'
                              size='icon'
                              title='编辑活动'
                              onClick={() => detail.mutate(campaign.id)}
                            >
                              <FilePenLine />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              title={running ? '暂停活动' : '恢复活动'}
                              disabled={
                                campaign.status === 'ENDED' || status.isPending
                              }
                              onClick={() =>
                                status.mutate({
                                  id: campaign.id,
                                  next: running ? 'PAUSED' : 'RUNNING',
                                })
                              }
                            >
                              {running ? <Pause /> : <Play />}
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!campaigns.isLoading && !visibleCampaigns.length && (
                  <EmptyRow
                    colSpan={7}
                    text={tab === 'archived' ? '暂无已归档活动。' : '暂无营销活动。'}
                  />
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      {tab === 'executions' && (
        <ExecutionsPanel
          campaigns={campaigns.data?.items ?? []}
          catalog={catalog.data}
        />
      )}
      {tab === 'rewards' && (
        <RewardsPanel campaigns={campaigns.data?.items ?? []} />
      )}
      {tab === 'campaigns' && editor && catalog.data && (
        <CampaignEditor
          campaign={editor === 'create' ? undefined : editor}
          catalog={catalog.data}
          onClose={() => setEditor(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({
              queryKey: ['marketing-campaigns'],
            })
          }}
        />
      )}
    </PageShell>
  )
}

const ExecutionsPanel = ({
  campaigns,
  catalog,
}: {
  campaigns: MarketingCampaign[]
  catalog?: MarketingEventCatalog
}) => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('ALL')
  const [campaignID, setCampaignID] = useState('ALL')
  const [selectedExecutionID, setSelectedExecutionID] = useState<string | null>(
    null
  )
  const query = useQuery({
    queryKey: ['marketing-executions', status, campaignID],
    queryFn: () =>
      listMarketingExecutions({
        page: 1,
        page_size: PAGE_SIZE,
        status: status === 'ALL' ? undefined : status,
        campaign_id: campaignID === 'ALL' ? undefined : campaignID,
      }),
  })
  const retry = useMutation({
    mutationFn: retryMarketingExecution,
    onSuccess: () => {
      toast.success('执行记录已重试')
      void queryClient.invalidateQueries({ queryKey: ['marketing-executions'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '重试失败')),
  })

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap gap-3'>
        <CampaignSelect
          campaigns={campaigns}
          value={campaignID}
          onChange={setCampaignID}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className='w-36'>
            <SelectValue placeholder='执行状态' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>全部状态</SelectItem>
            <SelectItem value='PENDING'>待执行</SelectItem>
            <SelectItem value='RUNNING'>执行中</SelectItem>
            <SelectItem value='COMPLETED'>已完成</SelectItem>
            <SelectItem value='COMPLETED_NO_ACTION'>未发奖完成</SelectItem>
            <SelectItem value='FAILED'>失败</SelectItem>
            <SelectItem value='TERMINATED'>已终止</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {query.error && (
        <ErrorNotice error={query.error} message='执行记录加载失败' />
      )}
      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>活动</TableHead>
              <TableHead>租户</TableHead>
              <TableHead>事件</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>当前节点</TableHead>
              <TableHead>结束原因</TableHead>
              <TableHead>下次执行</TableHead>
              <TableHead className='text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data?.items.map((item) => (
              <ExecutionRow
                key={item.id}
                item={item}
                catalog={catalog}
                retry={retry}
                onView={() => setSelectedExecutionID(item.id)}
              />
            ))}
            {!query.isLoading && !query.data?.items.length && (
              <EmptyRow colSpan={8} text='暂无执行记录。' />
            )}
          </TableBody>
        </Table>
      </div>
      {selectedExecutionID && (
        <ExecutionDetailDialog
          executionID={selectedExecutionID}
          onClose={() => setSelectedExecutionID(null)}
        />
      )}
    </div>
  )
}

const executionStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING_TRIGGER: '待触发',
    PENDING: '待执行',
    PENDING_ACTION: '执行动作中',
    RUNNING: '执行中',
    COMPLETED: '已完成',
    COMPLETED_NO_ACTION: '未发奖完成',
    FAILED: '失败',
    TERMINATED: '已终止',
  }
  return labels[status] ?? status
}

// 执行与试跑共用的终止 / 未发奖原因编码中文映射。
const terminationReasonLabels: Record<string, string> = {
  EMPTY_BRANCH: '条件分支无后续动作，正常结束',
  EXECUTE_DEADLINE: '超过执行截止时间，已终止',
  PARTICIPATION_LIMIT: '参与次数已达活动上限，未发奖',
  EXCLUSIVE_CONFLICT: '互斥组内已有其他活动发放，本次跳过',
  BUDGET_EXHAUSTED: '活动预算已耗尽，未发奖',
  PERMANENT_ERROR: '执行异常，已终止',
  RETRY_EXHAUSTED: '重试次数耗尽，已终止',
  FLOW_NOT_RUNNABLE: '流程配置无法试跑',
}
const terminationReasonLabel = (reason: string) =>
  reason ? (terminationReasonLabels[reason] ?? reason) : '-'

// 流程节点类型中文映射。
const nodeTypeLabels: Record<string, string> = {
  TRIGGER: '触发',
  CONDITION: '条件分支',
  DELAY: '延时等待',
  ACTION: '发放动作',
  ACTION_GROUP: '动作组',
}
const nodeTypeLabel = (type: string) => nodeTypeLabels[type] ?? type

// 条件节点求值结果中文映射。
const conditionResultLabels: Record<string, string> = {
  MATCHED: '命中',
  UNMATCHED: '未命中',
  ERROR: '求值失败',
}
const conditionResultLabel = (result: string) =>
  conditionResultLabels[result] ?? result

// 条件分支出口中文映射。
const selectedEdgeLabels: Record<string, string> = {
  matched: '命中分支',
  unmatched: '未命中分支',
  default: '默认分支',
}
const selectedEdgeLabel = (edge: string) => selectedEdgeLabels[edge] ?? edge

// 营销动作类型中文映射。
const actionTypeLabels: Record<string, string> = {
  GRANT_POINTS: '发放积分',
  ISSUE_COUPON: '发放优惠券',
  GRANT_BENEFIT: '发放权益',
  SEND_MESSAGE: '发送站内信',
}
const actionTypeLabel = (type: string) => actionTypeLabels[type] ?? type
// 动作组奖励类型形如 "GRANT_POINTS+ISSUE_COUPON"，逐段转中文。
const rewardTypeLabel = (value: string) =>
  value ? value.split('+').map(actionTypeLabel).join(' + ') : ''

// 奖励来源类型中文映射。
const rewardSourceLabels: Record<string, string> = {
  MARKETING: '营销活动',
  REDEEM: '兑换码',
}
const rewardSourceLabel = (source: string) =>
  rewardSourceLabels[source] ?? source

// 将 action_result JSON 翻译为可读中文；无法解析时原样返回。
function formatActionResult(raw: string) {
  if (!raw) return ''
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return raw
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return raw
  const result = parsed as Record<string, unknown>
  if (result.scheduled === 'true' || result.scheduled === true)
    return '已排期延时等待'
  const lines: string[] = []
  if (typeof result.status === 'string') {
    if (result.status === 'COMPLETED') lines.push('动作已完成发放')
    else if (result.status === 'COMPLETED_NO_ACTION') lines.push('未满足发奖条件')
    else lines.push(result.status)
  }
  if (typeof result.reason === 'string' && result.reason)
    lines.push(`原因：${terminationReasonLabel(result.reason)}`)
  const actions = Array.isArray(result.actions) ? result.actions : []
  for (const item of actions) {
    if (!item || typeof item !== 'object') continue
    const action = item as Record<string, unknown>
    const type =
      typeof action.action_type === 'string'
        ? actionTypeLabel(action.action_type)
        : ''
    const rewardID = action.reward_id != null ? `（奖励 #${action.reward_id}）` : ''
    lines.push(`${type}${rewardID}`)
  }
  if (!actions.length && typeof result.action_type === 'string') {
    const rewardID =
      result.reward_id != null ? `（奖励 #${result.reward_id}）` : ''
    lines.push(`${actionTypeLabel(result.action_type)}${rewardID}`)
  }
  return lines.length ? lines.join('\n') : raw
}

const ExecutionRow = ({
  item,
  catalog,
  retry,
  onView,
}: {
  item: MarketingExecution
  catalog?: MarketingEventCatalog
  retry: { isPending: boolean; mutate: (id: string) => void }
  onView: () => void
}) => (
  <TableRow>
    <TableCell>{item.campaign_name}</TableCell>
    <TableCell className='font-mono text-xs'>{item.tenant_id}</TableCell>
    <TableCell className='font-mono text-xs' title={item.event_type}>
      {eventTypeLabel(item.event_type, catalog)}
    </TableCell>
    <TableCell>
      <Badge variant={item.status === 'FAILED' ? 'destructive' : 'secondary'}>
        {executionStatusLabel(item.status)}
      </Badge>
    </TableCell>
    <TableCell className='font-mono text-xs'>
      {item.current_node_id || '-'}
      {item.flow_version && (
        <div className='text-muted-foreground'>v{item.flow_version}</div>
      )}
    </TableCell>
    <TableCell className='max-w-72 truncate' title={item.error_message}>
      {item.error_message || terminationReasonLabel(item.termination_reason)}
    </TableCell>    <TableCell>{formatDate(item.next_execute_at)}</TableCell>
    <TableCell className='text-right'>
      <Button
        variant='ghost'
        size='icon'
        title='查看节点执行详情'
        onClick={onView}
      >
        <Eye />
      </Button>
      {item.status === 'FAILED' && (
        <Button
          variant='ghost'
          size='icon'
          title='重试执行'
          disabled={retry.isPending}
          onClick={() => retry.mutate(item.id)}
        >
          <RotateCcw />
        </Button>
      )}
    </TableCell>
  </TableRow>
)

const ExecutionDetailDialog = ({
  executionID,
  onClose,
}: {
  executionID: string
  onClose: () => void
}) => {
  const query = useQuery({
    queryKey: ['marketing-execution', executionID],
    queryFn: () => getMarketingExecution(executionID),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[86vh] max-w-4xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>执行节点详情</DialogTitle>
        </DialogHeader>
        {query.isLoading && (
          <div className='text-muted-foreground text-sm'>加载中...</div>
        )}
        {query.error && (
          <ErrorNotice error={query.error} message='执行详情加载失败' />
        )}
        {query.data && (
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-sm'>
              <span className='font-medium'>
                {query.data.execution.campaign_name}
              </span>
              <span className='text-muted-foreground'>
                执行记录 #{query.data.execution.id}
              </span>
              <Badge
                variant={
                  query.data.execution.status === 'FAILED'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {executionStatusLabel(query.data.execution.status)}
              </Badge>
            </div>
            {query.data.trace.length ? (
              <div className='space-y-3'>
                {query.data.trace.map((trace) => (
                  <ExecutionTraceItem
                    key={`${trace.node_id}-${trace.attempt}-${trace.created_at}`}
                    trace={trace}
                  />
                ))}
              </div>
            ) : (
              <div className='text-muted-foreground text-sm'>
                暂无节点执行轨迹。
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

const ExecutionTraceItem = ({ trace }: { trace: MarketingNodeTrace }) => {
  const output = [
    trace.condition_result &&
      `条件结果：${conditionResultLabel(trace.condition_result)}`,
    trace.selected_edge && `选择出口：${selectedEdgeLabel(trace.selected_edge)}`,
    trace.resume_at && `恢复时间：${trace.resume_at}`,
    trace.action_type && `动作类型：${actionTypeLabel(trace.action_type)}`,
    formatActionResult(trace.action_result),
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className='space-y-2 rounded-md border p-3'>
      <div className='flex flex-wrap items-center gap-2 text-sm'>
        <span className='font-medium'>{trace.node_id}</span>
        <Badge variant='outline'>{nodeTypeLabel(trace.node_type)}</Badge>
        <span className='text-muted-foreground'>第 {trace.attempt} 次</span>
      </div>
      <TraceValue label='执行输入' value={trace.input_summary} />
      <TraceValue label='执行输出' value={output} />
      {trace.redaction_summary && (
        <TraceValue label='脱敏说明' value={trace.redaction_summary} />
      )}
    </div>
  )
}

const TraceValue = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className='text-muted-foreground mb-1 text-xs font-medium'>
      {label}
    </div>
    <pre className='bg-muted/50 max-h-40 overflow-auto rounded p-2 font-mono text-xs break-all whitespace-pre-wrap'>
      {value || '-'}
    </pre>
  </div>
)

const RewardsPanel = ({ campaigns }: { campaigns: MarketingCampaign[] }) => {
  const [campaignID, setCampaignID] = useState('ALL')
  const [sourceType, setSourceType] = useState('')
  const query = useQuery({
    queryKey: ['marketing-rewards', campaignID, sourceType],
    queryFn: () =>
      listMarketingRewards({
        page: 1,
        page_size: PAGE_SIZE,
        campaign_id: campaignID === 'ALL' ? undefined : campaignID,
        source_type: sourceType.trim() || undefined,
      }),
  })

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap gap-3'>
        <CampaignSelect
          campaigns={campaigns}
          value={campaignID}
          onChange={setCampaignID}
        />
        <Input
          className='w-44'
          value={sourceType}
          onChange={(event) => setSourceType(event.target.value)}
          placeholder='奖励来源类型'
        />
      </div>
      <div className='text-muted-foreground text-xs'>
        来源类型可选：MARKETING（营销活动）、REDEEM（兑换码），留空查全部
      </div>
      {query.error && (
        <ErrorNotice error={query.error} message='奖励记录加载失败' />
      )}
      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>被奖励人</TableHead>
              <TableHead>租户名称</TableHead>
              <TableHead>奖励内容</TableHead>
              <TableHead>来源</TableHead>
              <TableHead>原始事件</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>{item.recipient_nickname || '-'}</div>
                  <div className='text-muted-foreground font-mono text-xs'>
                    ID: {item.user_id}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{item.tenant_name || '-'}</div>
                  <div className='text-muted-foreground font-mono text-xs'>
                    ID: {item.tenant_id}
                  </div>
                </TableCell>
                <TableCell>{item.reward_content || item.reward_type}</TableCell>
                <TableCell>
                  {rewardSourceLabel(item.source_type)}
                  <div className='text-muted-foreground font-mono text-xs'>
                    {item.source_id}
                  </div>
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {item.source_event_id || '-'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.status === 'SETTLED' ? 'default' : 'secondary'
                    }
                  >
                    {item.status_label || item.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(item.created_at)}</TableCell>
              </TableRow>
            ))}
            {!query.isLoading && !query.data?.items.length && (
              <EmptyRow colSpan={7} text='暂无奖励记录。' />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const CampaignSelect = ({
  campaigns,
  value,
  onChange,
}: {
  campaigns: MarketingCampaign[]
  value: string
  onChange: (value: string) => void
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className='w-52'>
      <SelectValue placeholder='选择活动' />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value='ALL'>全部活动</SelectItem>
      {campaigns.map((campaign) => (
        <SelectItem key={campaign.id} value={campaign.id}>
          {campaign.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

const TabButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) => (
  <Button
    type='button'
    variant={active ? 'secondary' : 'ghost'}
    size='sm'
    role='tab'
    aria-selected={active}
    onClick={onClick}
  >
    {children}
  </Button>
)

const CampaignEditor = ({
  campaign,
  catalog,
  onClose,
  onSaved,
}: {
  campaign?: MarketingCampaign
  catalog: MarketingEventCatalog
  onClose: () => void
  onSaved: () => void
}) => {
  const [saved, setSaved] = useState(campaign)
  const [name, setName] = useState(campaign?.name ?? '')
  const [code, setCode] = useState(campaign?.campaign_code ?? '')
  const [flow, setFlow] = useState(() =>
    campaign
      ? parseFlowConfig(campaign.flow_config)
      : createEmptyFlow(catalog.events[0]?.event_type)
  )
  const [selectedNodeID, setSelectedNodeID] = useState<string | null>(null)
  const [participationRule, setParticipationRule] =
    useState<MarketingParticipationRule>(
      campaign?.participation_rule ?? 'UNLIMITED'
    )
  const [budget, setBudget] = useState(String(campaign?.budget_amount ?? 0))
  const [exclusiveGroup, setExclusiveGroup] = useState(
    campaign?.exclusive_group ?? ''
  )
  const [priority, setPriority] = useState(String(campaign?.priority ?? 0))
  const [triggerEndAt, setTriggerEndAt] = useState(
    toLocalDateTime(campaign?.trigger_end_at)
  )
  const [executeEndAt, setExecuteEndAt] = useState(
    toLocalDateTime(campaign?.execute_end_at)
  )
  const [validation, setValidation] = useState<string[]>([])
  const [uncappedWarning, setUncappedWarning] = useState<string[] | null>(null)
  const [dryRunOpen, setDryRunOpen] = useState(false)
  const selectedNode = flow.nodes.find((node) => node.id === selectedNodeID)
  const triggerType = String(
    flow.nodes.find((node) => node.type === 'TRIGGER')?.data.event_type ?? ''
  )
  const variables = useMemo(
    () => variablesForTrigger(catalog, triggerType),
    [catalog, triggerType]
  )
  const numericVariables = useMemo(
    () => variables.filter((item) => item.value_type === 'INTEGER'),
    [variables]
  )
  const messageVariables = useMemo(
    () => [...variables, ...(catalog.message_variables ?? [])],
    [catalog.message_variables, variables]
  )
  const couponTemplates = useQuery({
    queryKey: ['coupon-templates', 'marketing-action'],
    queryFn: () => listCouponTemplates({ page: 1, page_size: PAGE_SIZE }),
    // 发布前的无上限折扣券预算警告需要全量模板，不能只在选中发券节点时加载。
    enabled:
      needsCouponTemplates(selectedNode) ||
      flow.nodes.some((node) => needsCouponTemplates(node)),
  })
  const save = useMutation<MarketingCampaign, unknown, boolean>({
    mutationFn: async () => {
      const input = campaignInput({
        name,
        code,
        flow,
        participationRule,
        budget,
        exclusiveGroup,
        priority,
        triggerEndAt,
        executeEndAt,
      })
      if (saved) {
        return updateMarketingCampaign(saved.id, omitCampaignCode(input))
      }
      return createMarketingCampaign(input)
    },
    onSuccess: (item, showSuccessToast) => {
      setSaved(item)
      onSaved()
      if (showSuccessToast) toast.success('草稿已保存')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '保存草稿失败')),
  })
  const publish = useMutation({
    mutationFn: async (confirmed?: boolean) => {
      const messages = flowValidationMessages(
        flow,
        {
          triggerEndAt: toISODateTime(triggerEndAt),
          executeEndAt: toISODateTime(executeEndAt),
        },
        numericVariables
      )
      if (messages.length > 0) {
        setValidation(messages)
        throw new Error(messages.join('；'))
      }
      const budgetAmount = Number(budget) || 0
      const uncappedNames = uncappedCouponTemplateNames(
        flow,
        couponTemplates.data?.items ?? []
      )
      if (!confirmed && budgetAmount > 0 && uncappedNames.length > 0) {
        setUncappedWarning(uncappedNames)
        return null
      }
      setUncappedWarning(null)
      const item = await save.mutateAsync(false)
      return publishMarketingCampaign(item.id)
    },
    onSuccess: (item) => {
      if (!item) return
      setSaved(item)
      onSaved()
      toast.success('流程已发布')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '发布失败')),
  })
  const archive = useMutation({
    mutationFn: () => archiveMarketingCampaign(saved!.id),
    onSuccess: () => {
      onSaved()
      toast.success('活动已归档')
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '归档失败')),
  })
  const lifecycle = useMutation({
    mutationFn: (status: 'RUNNING' | 'PAUSED') =>
      updateMarketingCampaignStatus(saved!.id, status),
    onSuccess: (item) => {
      setSaved(item)
      onSaved()
      toast.success('活动状态已更新')
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, '更新活动状态失败')),
  })
  const validate = () => {
    const messages = flowValidationMessages(
      flow,
      {
        triggerEndAt: toISODateTime(triggerEndAt),
        executeEndAt: toISODateTime(executeEndAt),
      },
      numericVariables
    )
    setValidation(messages)
    if (messages.length === 0) toast.success('校验通过')
  }
  const addNode = (type: 'CONDITION' | 'DELAY' | 'ACTION' | 'ACTION_GROUP') => {
    const next = addFlowNode(flow, type)
    setFlow(next)
    setSelectedNodeID(next.nodes[next.nodes.length - 1]?.id ?? '')
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='flex h-[96dvh] w-[98vw] max-w-[98vw] flex-col gap-3 overflow-hidden p-3 sm:max-w-[98vw] sm:p-4'>
        <AlertDialog
          open={uncappedWarning !== null}
          onOpenChange={(open) => !open && setUncappedWarning(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>预算可能被超出</AlertDialogTitle>
              <AlertDialogDescription>
                活动设置了预算，但流程引用了未设置优惠上限的折扣券：
                {uncappedWarning?.map((name) => `「${name}」`).join(
                  '、'
                )}
                。该类券不参与预算估算（成本记为
                0），实际核销可能导致成本超出预算。是否继续发布？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => publish.mutate(true)}
                disabled={publish.isPending}
              >
                继续发布
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <DialogHeader className='flex-row items-center justify-between space-y-0 border-b pr-8 pb-3'>
          <DialogTitle>
            {saved ? `编辑活动：${saved.name}` : '新建营销活动'}
          </DialogTitle>
          <div className='flex flex-wrap items-center gap-2'>
            <Button variant='outline' size='sm' onClick={validate}>
              <CheckCircle2 /> 校验
            </Button>
            <Button
              variant='outline'
              size='sm'
              disabled={save.isPending}
              onClick={() => save.mutate(true)}
            >
              <Save /> 保存草稿
            </Button>
            <Button
              variant='outline'
              size='sm'
              disabled={save.isPending}
              onClick={() => setDryRunOpen(true)}
            >
              <ClipboardCheck /> 试跑
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setFlow(arrangeFlow(flow))}
            >
              <Workflow /> 整理
            </Button>
            <Button
              size='sm'
              disabled={publish.isPending || save.isPending}
              onClick={() => publish.mutate(false)}
            >
              <Send /> 发布
            </Button>
            {saved && (
              <Button
                variant='outline'
                size='sm'
                disabled={lifecycle.isPending || saved.status === 'ENDED'}
                onClick={() =>
                  lifecycle.mutate(
                    saved.status === 'RUNNING' ? 'PAUSED' : 'RUNNING'
                  )
                }
              >
                {saved.status === 'RUNNING' ? <Pause /> : <Play />}
                {saved.status === 'RUNNING' ? '暂停' : '恢复'}
              </Button>
            )}
            {saved && (
              <Button
                variant='ghost'
                size='icon'
                title='归档活动'
                disabled={archive.isPending}
                onClick={() => archive.mutate()}
              >
                <Archive />
              </Button>
            )}
          </div>
        </DialogHeader>
        {validation.length > 0 && (
          <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm'>
            {validation.map((message) => (
              <div key={message}>{message}</div>
            ))}
          </div>
        )}
        <div className='grid min-h-0 min-w-[960px] flex-1 grid-cols-[184px_minmax(460px,1fr)_304px] gap-3 overflow-x-auto'>
          <NodeLibrary onAdd={addNode} />
          <ReactFlowProvider>
            <FlowCanvas
              flow={flow}
              setFlow={setFlow}
              onSelect={setSelectedNodeID}
            />
          </ReactFlowProvider>
          <aside className='min-h-0 overflow-y-auto border-l pl-3'>
            {selectedNode ? (
              <NodeInspector
                node={selectedNode}
                catalog={catalog}
                variables={variables}
                numericVariables={numericVariables}
                messageVariables={messageVariables}
                couponTemplates={couponTemplates.data?.items ?? []}
                couponTemplatesLoading={couponTemplates.isLoading}
                onChange={(data) =>
                  setFlow(updateFlowNode(flow, selectedNode.id, data))
                }
                onTriggerChange={(eventType) =>
                  setFlow(changeTrigger(flow, eventType))
                }
                onRemove={() => {
                  setFlow(removeFlowNode(flow, selectedNode.id))
                  setSelectedNodeID(null)
                }}
              />
            ) : (
              <CampaignFields
                name={name}
                code={code}
                triggerEndAt={triggerEndAt}
                executeEndAt={executeEndAt}
                participationRule={participationRule}
                budget={budget}
                exclusiveGroup={exclusiveGroup}
                priority={priority}
                saved={Boolean(saved)}
                onName={setName}
                onCode={setCode}
                onTriggerEndAt={setTriggerEndAt}
                onExecuteEndAt={setExecuteEndAt}
                onParticipationRule={setParticipationRule}
                onBudget={setBudget}
                onExclusiveGroup={setExclusiveGroup}
                onPriority={setPriority}
              />
            )}
          </aside>
        </div>
        {dryRunOpen && (
          <DryRunDialog
            triggerType={triggerType}
            catalog={catalog}
            onClose={() => setDryRunOpen(false)}
            onNeedSave={() => save.mutateAsync(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

const NodeLibrary = ({
  onAdd,
}: {
  onAdd: (type: 'CONDITION' | 'DELAY' | 'ACTION' | 'ACTION_GROUP') => void
}) => (
  <aside className='space-y-3 border-r pr-3'>
    <div className='text-sm font-semibold'>节点</div>
    <div className='text-muted-foreground text-xs'>
      Trigger 由活动画布固定保留一个。
    </div>
    <Button
      className='w-full justify-start'
      variant='outline'
      onClick={() => onAdd('CONDITION')}
    >
      <GitBranch /> 条件
    </Button>
    <Button
      className='w-full justify-start'
      variant='outline'
      onClick={() => onAdd('DELAY')}
    >
      <Timer /> 延时
    </Button>
    <Button
      className='w-full justify-start'
      variant='outline'
      onClick={() => onAdd('ACTION')}
    >
      <Zap /> 终点动作
    </Button>
    <Button
      className='w-full justify-start'
      variant='outline'
      onClick={() => onAdd('ACTION_GROUP')}
    >
      <Zap /> 终点动作组
    </Button>
  </aside>
)

const FlowCanvas = ({
  flow,
  setFlow,
  onSelect,
}: {
  flow: CampaignFlowConfig
  setFlow: (flow: CampaignFlowConfig) => void
  onSelect: (id: string | null) => void
}) => {
  const [nodes, setNodes] = useState<FlowCanvasNode[]>(() =>
    toCanvasNodes(flow)
  )
  useEffect(() => setNodes(toCanvasNodes(flow)), [flow.nodes])
  const edges = flow.edges.map((edge): Edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.source_handle ?? null,
    animated: edge.source_handle === 'matched',
    label:
      edge.source_handle === 'matched'
        ? '满足'
        : edge.source_handle === 'unmatched'
          ? '不满足'
          : undefined,
  }))
  return (
    <div className='min-h-0 overflow-hidden rounded-md border'>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        onNodesChange={(changes) =>
          setNodes((current) => applyNodeChanges(changes, current))
        }
        onNodeDragStop={(_, draggedNode) => {
          setFlow({
            ...flow,
            nodes: flow.nodes.map((flowNode) =>
              flowNode.id === draggedNode.id
                ? { ...flowNode, position: draggedNode.position }
                : flowNode
            ),
          })
        }}
        onEdgesChange={(changes) => {
          const removed = new Set(
            changes
              .filter((change) => change.type === 'remove')
              .map((change) => change.id)
          )
          if (removed.size)
            setFlow({
              ...flow,
              edges: flow.edges.filter((edge) => !removed.has(edge.id)),
            })
        }}
        isValidConnection={(connection) =>
          canConnect(
            flow,
            connection.source ?? '',
            connection.target ?? '',
            connection.sourceHandle
          )
        }
        onConnect={(connection: Connection) => {
          if (
            !canConnect(
              flow,
              connection.source ?? '',
              connection.target ?? '',
              connection.sourceHandle
            )
          )
            return
          const next = addEdge(connection, edges)
          const edge = next[next.length - 1]
          setFlow({
            ...flow,
            edges: [
              ...flow.edges,
              {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                ...(edge.sourceHandle
                  ? {
                      source_handle: edge.sourceHandle as
                        'matched' | 'unmatched',
                    }
                  : {}),
              },
            ],
          })
        }}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background gap={18} size={1} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}

function toCanvasNodes(flow: CampaignFlowConfig): FlowCanvasNode[] {
  return flow.nodes.map((node) => ({
    id: node.id,
    type: 'campaign',
    position: node.position,
    data: { node },
  }))
}

function CampaignNodeCard({ data, selected }: NodeProps<FlowCanvasNode>) {
  const { node } = data
  const meta = {
    TRIGGER: {
      label: '触发事件',
      icon: <Workflow />,
      tone: 'border-sky-500 bg-sky-50',
    },
    CONDITION: {
      label: '条件判断',
      icon: <GitBranch />,
      tone: 'border-amber-500 bg-amber-50',
    },
    DELAY: {
      label: '相对延时',
      icon: <Timer />,
      tone: 'border-teal-500 bg-teal-50',
    },
    ACTION: {
      label: '终点动作',
      icon: <Zap />,
      tone: 'border-emerald-500 bg-emerald-50',
    },
    ACTION_GROUP: {
      label: '终点动作组',
      icon: <Zap />,
      tone: 'border-fuchsia-500 bg-fuchsia-50',
    },
  }[node.type]
  return (
    <div
      className={`relative ${node.type === 'ACTION_GROUP' ? 'w-72' : 'w-44'} rounded-md border-2 p-3 shadow-sm ${meta.tone} ${selected ? 'ring-primary/40 ring-2' : ''}`}
    >
      {node.type !== 'TRIGGER' && (
        <Handle type='target' position={Position.Left} />
      )}
      <div className='flex items-center gap-2 text-sm font-semibold'>
        {meta.icon}
        {meta.label}
      </div>
      <div className='mt-2 truncate text-xs'>{nodeSummary(node)}</div>
      {node.type === 'ACTION_GROUP' && (
        <div className='mt-3 space-y-1.5 border-t pt-2'>
          {actionGroupActions(node.data).map((action, index) => (
            <div
              key={index}
              className='bg-background/70 truncate rounded border px-2 py-1 text-xs'
            >
              {actionLabel(action)}
            </div>
          ))}
        </div>
      )}
      {node.type === 'CONDITION' && (
        <>
          <Handle
            id='matched'
            type='source'
            position={Position.Right}
            style={{ top: '35%' }}
          />
          <Handle
            id='unmatched'
            type='source'
            position={Position.Right}
            style={{ top: '72%' }}
          />
          <span className='absolute top-[30%] right-4 text-[10px]'>满足</span>
          <span className='absolute top-[67%] right-4 text-[10px]'>不满足</span>
        </>
      )}
      {node.type !== 'CONDITION' &&
        node.type !== 'ACTION' &&
        node.type !== 'ACTION_GROUP' && (
          <Handle type='source' position={Position.Right} />
        )}
    </div>
  )
}

const CampaignFields = (props: {
  name: string
  code: string
  triggerEndAt: string
  executeEndAt: string
  participationRule: MarketingParticipationRule
  budget: string
  exclusiveGroup: string
  priority: string
  saved: boolean
  onName: (value: string) => void
  onCode: (value: string) => void
  onTriggerEndAt: (value: string) => void
  onExecuteEndAt: (value: string) => void
  onParticipationRule: (value: MarketingParticipationRule) => void
  onBudget: (value: string) => void
  onExclusiveGroup: (value: string) => void
  onPriority: (value: string) => void
}) => (
  <section className='space-y-3 border-b pb-4'>
    <div className='text-sm font-semibold'>活动设置</div>
    <Field label='活动名称'>
      <Input
        value={props.name}
        onChange={(event) => props.onName(event.target.value)}
      />
    </Field>
    <Field label='活动编码'>
      <Input
        disabled={props.saved}
        value={props.code}
        onChange={(event) => props.onCode(event.target.value.toUpperCase())}
      />
    </Field>
    <Field label='参与限制'>
      <Select
        value={props.participationRule}
        onValueChange={(value) =>
          props.onParticipationRule(value as MarketingParticipationRule)
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='UNLIMITED'>不限</SelectItem>
          <SelectItem value='ONCE'>仅一次</SelectItem>
          <SelectItem value='DAILY'>每日一次</SelectItem>
        </SelectContent>
      </Select>
    </Field>
    <Field label='总预算'>
      <Input
        type='number'
        min='0'
        value={props.budget}
        onChange={(event) => props.onBudget(event.target.value)}
      />
    </Field>
    <Field label='互斥组'>
      <Input
        value={props.exclusiveGroup}
        onChange={(event) => props.onExclusiveGroup(event.target.value)}
      />
    </Field>
    <Field label='优先级'>
      <Input
        type='number'
        min='0'
        value={props.priority}
        onChange={(event) => props.onPriority(event.target.value)}
      />
    </Field>
    <Field label='触发截止'>
      <Input
        type='datetime-local'
        value={props.triggerEndAt}
        onChange={(event) => props.onTriggerEndAt(event.target.value)}
      />
    </Field>
    <Field label='执行截止'>
      <Input
        type='datetime-local'
        value={props.executeEndAt}
        onChange={(event) => props.onExecuteEndAt(event.target.value)}
      />
    </Field>
  </section>
)

const NodeInspector = ({
  node,
  catalog,
  variables,
  numericVariables,
  messageVariables,
  couponTemplates,
  couponTemplatesLoading,
  onChange,
  onTriggerChange,
  onRemove,
}: {
  node: CampaignFlowNode
  catalog: MarketingEventCatalog
  variables: MarketingEventField[]
  numericVariables: MarketingEventField[]
  messageVariables: MarketingEventField[]
  couponTemplates: Awaited<ReturnType<typeof listCouponTemplates>>['items']
  couponTemplatesLoading: boolean
  onChange: (data: Record<string, unknown>) => void
  onTriggerChange: (eventType: string) => void
  onRemove: () => void
}) => {
  const triggerEvents = catalog.events
  return (
    <section className='space-y-3 pt-4'>
      <div className='flex items-center justify-between'>
        <div className='text-sm font-semibold'>节点配置</div>
        {node.type !== 'TRIGGER' && (
          <Button
            variant='ghost'
            size='icon'
            title='删除节点'
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {node.type === 'TRIGGER' && (
        <Field label='触发事件'>
          <Select
            value={String(node.data.event_type ?? '')}
            onValueChange={onTriggerChange}
          >
            <SelectTrigger>
              <SelectValue placeholder='选择事件' />
            </SelectTrigger>
            <SelectContent>
              {triggerEvents.map((event) => (
                <SelectItem key={event.event_type} value={event.event_type}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      {node.type === 'CONDITION' && (
        <ConditionEditor
          group={conditionGroup(node.data.condition)}
          variables={variables}
          onChange={(condition) => onChange({ condition })}
        />
      )}
      {node.type === 'DELAY' && (
        <DelayEditor data={node.data} onChange={onChange} />
      )}
      {node.type === 'ACTION' && (
        <ActionEditor
          data={node.data}
          variables={numericVariables}
          messageVariables={messageVariables}
          couponTemplates={couponTemplates}
          couponTemplatesLoading={couponTemplatesLoading}
          onChange={onChange}
        />
      )}
      {node.type === 'ACTION_GROUP' && (
        <ActionGroupEditor
          couponTemplates={couponTemplates}
          couponTemplatesLoading={couponTemplatesLoading}
          data={node.data}
          variables={numericVariables}
          messageVariables={messageVariables}
          onChange={onChange}
        />
      )}
    </section>
  )
}

const ConditionEditor = ({
  group,
  variables,
  onChange,
  depth = 1,
}: {
  group: ConditionGroup
  variables: MarketingEventField[]
  onChange: (group: ConditionGroup) => void
  depth?: number
}) => {
  const updateAt = (index: number, value: ConditionGroup | ConditionLeaf) =>
    onChange({
      ...group,
      conditions: group.conditions.map((item, itemIndex) =>
        itemIndex === index ? value : item
      ),
    })
  return (
    <div className='space-y-3'>
      <Field label={depth === 1 ? '条件组' : `嵌套条件 ${depth}`}>
        <Select
          value={group.logic}
          onValueChange={(logic) =>
            onChange({ ...group, logic: logic as ConditionGroup['logic'] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='AND'>全部满足</SelectItem>
            <SelectItem value='OR'>任一满足</SelectItem>
            <SelectItem value='NOT'>不满足</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {group.conditions.map((item, index) => (
        <div key={index} className='border-muted space-y-2 border-l pl-2'>
          {'logic' in item ? (
            <ConditionEditor
              group={item}
              variables={variables}
              onChange={(next) => updateAt(index, next)}
              depth={depth + 1}
            />
          ) : (
            <ConditionLeafEditor
              leaf={item}
              variables={variables}
              onChange={(next) => updateAt(index, next)}
            />
          )}
          <Button
            variant='ghost'
            size='sm'
            onClick={() =>
              onChange({
                ...group,
                conditions: group.conditions.filter(
                  (_, itemIndex) => itemIndex !== index
                ),
              })
            }
          >
            移除
          </Button>
        </div>
      ))}
      <div className='flex gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() =>
            onChange({
              ...group,
              conditions: [...group.conditions, newLeaf(variables)],
            })
          }
        >
          <Plus /> 条件
        </Button>
        {depth < 5 && (
          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              onChange({
                ...group,
                conditions: [...group.conditions, emptyConditionGroup()],
              })
            }
          >
            <Plus /> 条件组
          </Button>
        )}
      </div>
    </div>
  )
}

const ConditionLeafEditor = ({
  leaf,
  variables,
  onChange,
}: {
  leaf: ConditionLeaf
  variables: MarketingEventField[]
  onChange: (leaf: ConditionLeaf) => void
}) => {
  const field =
    variables.find((item) => item.path === leaf.field) ?? variables[0]
  const operators = field?.operators ?? []
  const isPresence = ['EXISTS', 'NOT_EXISTS'].includes(leaf.operator)
  return (
    <div className='space-y-2'>
      <Select
        value={leaf.field}
        onValueChange={(path) => {
          const next = variables.find((item) => item.path === path)
          onChange({
            field: path,
            operator: next?.operators[0]?.code ?? '',
            value: initialValue(next),
          })
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder='选择变量' />
        </SelectTrigger>
        <SelectContent>
          {variables.map((item) => (
            <SelectItem key={item.path} value={item.path}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={leaf.operator}
        onValueChange={(operator) =>
          onChange({
            ...leaf,
            operator,
            ...(['EXISTS', 'NOT_EXISTS'].includes(operator)
              ? {}
              : { value: leaf.value ?? initialValue(field) }),
          })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder='操作符' />
        </SelectTrigger>
        <SelectContent>
          {operators.map((operator) => (
            <SelectItem key={operator.code} value={operator.code}>
              {operator.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isPresence && (
        <TypedValueInput
          field={field}
          value={leaf.value}
          onChange={(value) => onChange({ ...leaf, value })}
        />
      )}
    </div>
  )
}

const TypedValueInput = ({
  field,
  value,
  onChange,
}: {
  field?: MarketingEventField
  value: ConditionLeaf['value']
  onChange: (value: ConditionLeaf['value']) => void
}) => {
  if (field?.value_type === 'BOOLEAN')
    return (
      <Select
        value={String(value)}
        onValueChange={(next) => onChange(next === 'true')}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='true'>是</SelectItem>
          <SelectItem value='false'>否</SelectItem>
        </SelectContent>
      </Select>
    )
  if (field?.value_type === 'ENUM')
    return (
      <Select value={String(value)} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {field.enum_values.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  return (
    <Input
      type={field?.value_type === 'INTEGER' ? 'number' : 'text'}
      value={value === undefined ? '' : String(value)}
      placeholder={field?.example || '比较值'}
      onChange={(event) =>
        onChange(
          field?.value_type === 'INTEGER'
            ? Number(event.target.value)
            : event.target.value
        )
      }
    />
  )
}

const DelayEditor = ({
  data,
  onChange,
}: {
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
}) => (
  <Field label='等待时长（秒）'>
    <Input
      type='number'
      min='1'
      max={365 * 24 * 60 * 60}
      value={String(data.delay_seconds ?? 86400)}
      onChange={(event) =>
        onChange({ delay_seconds: Number(event.target.value) })
      }
    />
  </Field>
)

const ActionEditor = ({
  data,
  variables,
  messageVariables,
  couponTemplates,
  couponTemplatesLoading,
  onChange,
}: {
  data: Record<string, unknown>
  variables: MarketingEventField[]
  messageVariables: MarketingEventField[]
  couponTemplates: Awaited<ReturnType<typeof listCouponTemplates>>['items']
  couponTemplatesLoading: boolean
  onChange: (data: Record<string, unknown>) => void
}) => {
  const actionType = String(data.action_type ?? 'GRANT_POINTS')
  const [variableOpen, setVariableOpen] = useState(false)
  const update = (next: Record<string, unknown>) =>
    onChange({ ...data, ...next })
  return (
    <div className='space-y-3'>
      <Field label='终点动作'>
        <Select
          value={actionType}
          onValueChange={(next) => onChange({ action_type: next })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='GRANT_POINTS'>发放积分</SelectItem>
            <SelectItem value='ISSUE_COUPON'>发放优惠券</SelectItem>
            <SelectItem value='GRANT_BENEFIT'>发放权益</SelectItem>
            <SelectItem value='SEND_MESSAGE'>发送站内信</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {actionType === 'GRANT_POINTS' && (
        <Field label='积分数量'>
          <div className='flex gap-2'>
            <Input
              value={String(data.points ?? '')}
              placeholder='例如 {{event.data.amount_cents}} / 100'
              onKeyDown={(event) => {
                if (event.key === '/' && !String(data.points ?? '').trim()) {
                  event.preventDefault()
                  setVariableOpen(true)
                }
              }}
              onChange={(event) => update({ points: event.target.value })}
            />
            <Popover open={variableOpen} onOpenChange={setVariableOpen}>
              <PopoverTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  title='插入数值变量'
                >
                  <Braces />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-72 p-2'>
                <div className='mb-2 text-xs font-medium'>可计算变量</div>
                <div className='space-y-1'>
                  {variables.map((item) => (
                    <Button
                      key={item.path}
                      type='button'
                      variant='ghost'
                      className='h-auto w-full justify-start px-2 py-1.5 text-left'
                      onClick={() => {
                        const current = String(data.points ?? '').trim()
                        update({
                          points: `${current}${current ? ' + ' : ''}{{${item.path}}}`,
                        })
                        setVariableOpen(false)
                      }}
                    >
                      <span>{item.name}</span>
                      <span className='text-muted-foreground ml-auto text-xs'>
                        {item.path}
                      </span>
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className='text-muted-foreground text-xs'>
            支持 +、-、*、/ 和括号，仅可使用数值变量。
          </div>
        </Field>
      )}
      {actionType === 'ISSUE_COUPON' && (
        <Field label='优惠券模板'>
          <Select
            value={String(data.coupon_template_id ?? '')}
            disabled={couponTemplatesLoading}
            onValueChange={(value) =>
              update({ coupon_template_id: Number(value) })
            }
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  couponTemplatesLoading
                    ? '正在加载优惠券模板'
                    : '选择优惠券模板'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {couponTemplates.map((template) => (
                <SelectItem
                  key={template.id}
                  value={template.id}
                  disabled={template.status !== 'ACTIVE'}
                >
                  {template.name}
                  {template.status !== 'ACTIVE' ? '（已停用）' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      {actionType === 'GRANT_BENEFIT' && (
        <Field label='权益定义 ID'>
          <Input
            type='number'
            min='1'
            value={String(data.benefit_definition_id ?? '')}
            onChange={(event) =>
              update({ benefit_definition_id: Number(event.target.value) })
            }
          />
        </Field>
      )}
      {actionType === 'SEND_MESSAGE' && (
        <MessageActionEditor
          data={data}
          variables={messageVariables}
          onChange={onChange}
        />
      )}
    </div>
  )
}

const ActionGroupEditor = ({
  data,
  variables,
  messageVariables,
  couponTemplates,
  couponTemplatesLoading,
  onChange,
}: {
  data: Record<string, unknown>
  variables: MarketingEventField[]
  messageVariables: MarketingEventField[]
  couponTemplates: Awaited<ReturnType<typeof listCouponTemplates>>['items']
  couponTemplatesLoading: boolean
  onChange: (data: Record<string, unknown>) => void
}) => {
  const actions = actionGroupActions(data)
  const update = (next: Record<string, unknown>[]) =>
    onChange({ ...data, actions: next })
  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= actions.length) return
    const next = [...actions]
    ;[next[index], next[target]] = [next[target], next[index]]
    update(next)
  }
  return (
    <div className='space-y-3'>
      {actions.map((action, index) => (
        <section key={index} className='space-y-3 rounded-md border p-3'>
          <div className='flex items-center justify-between'>
            <div className='text-sm font-medium'>动作 {index + 1}</div>
            <div className='flex items-center gap-1'>
              <Button
                disabled={index === 0}
                size='icon'
                title='上移动作'
                variant='ghost'
                onClick={() => move(index, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                disabled={index === actions.length - 1}
                size='icon'
                title='下移动作'
                variant='ghost'
                onClick={() => move(index, 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                disabled={actions.length === 1}
                size='icon'
                title='删除动作'
                variant='ghost'
                onClick={() =>
                  update(actions.filter((_, item) => item !== index))
                }
              >
                <Trash2 />
              </Button>
            </div>
          </div>
          <ActionEditor
            couponTemplates={couponTemplates}
            couponTemplatesLoading={couponTemplatesLoading}
            data={action}
            variables={variables}
            messageVariables={messageVariables}
            onChange={(next) =>
              update(
                actions.map((item, itemIndex) =>
                  itemIndex === index ? next : item
                )
              )
            }
          />
        </section>
      ))}
      <Button
        className='w-full'
        variant='outline'
        onClick={() =>
          update([...actions, { action_type: 'GRANT_POINTS', points: 100 }])
        }
      >
        <Plus /> 添加动作
      </Button>
    </div>
  )
}

const MessageActionEditor = ({
  data,
  variables,
  onChange,
}: {
  data: Record<string, unknown>
  variables: MarketingEventField[]
  onChange: (data: Record<string, unknown>) => void
}) => {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<'title' | 'content'>('content')
  const insert = (path: string) => {
    const value = String(data[target] ?? '')
    onChange({
      ...data,
      [target]: `${value}${value ? ' ' : ''}{{${path}}}`,
    })
    setOpen(false)
  }
  return (
    <div className='space-y-3'>
      <Field label='消息标题'>
        <Input
          value={String(data.title ?? '')}
          onKeyDown={(event) => {
            if (event.key === '/') {
              setTarget('title')
              setOpen(true)
            }
          }}
          onChange={(event) => onChange({ ...data, title: event.target.value })}
        />
      </Field>
      <Field label='消息内容'>
        <Textarea
          value={String(data.content ?? '')}
          onKeyDown={(event) => {
            if (event.key === '/') setOpen(true)
            setTarget('content')
          }}
          onChange={(event) =>
            onChange({ ...data, content: event.target.value })
          }
        />
      </Field>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant='outline' size='sm'>
            插入变量
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-72 p-2'>
          {variables
            .filter((item) => item.sensitivity === 'PUBLIC')
            .map((item) => (
              <Button
                className='w-full justify-start'
                key={item.path}
                variant='ghost'
                size='sm'
                onClick={() => insert(item.path)}
              >
                {item.name}
              </Button>
            ))}
        </PopoverContent>
      </Popover>
      {variables
        .filter(
          (item) =>
            item.optional &&
            `${data.title ?? ''}\n${data.content ?? ''}`.includes(
              `{{${item.path}}}`
            )
        )
        .map((item) => (
          <Field key={item.path} label={`${item.name}为空时的中文默认值`}>
            <Input
              value={String(
                (
                  data.variable_defaults as Record<string, string> | undefined
                )?.[item.path] ?? ''
              )}
              onChange={(event) =>
                onChange({
                  ...data,
                  variable_defaults: {
                    ...((data.variable_defaults as Record<string, string>) ??
                      {}),
                    [item.path]: event.target.value,
                  },
                })
              }
            />
          </Field>
        ))}
    </div>
  )
}

const DryRunDialog = ({
  triggerType,
  catalog,
  onClose,
  onNeedSave,
}: {
  triggerType: string
  catalog: MarketingEventCatalog
  onClose: () => void
  onNeedSave: () => Promise<MarketingCampaign>
}) => {
  const [mode, setMode] = useState<'SIMULATED' | 'REAL'>('SIMULATED')
  const [eventID, setEventID] = useState('')
  const [tenantID, setTenantID] = useState('')
  const [operatorUserID, setOperatorUserID] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [factValues, setFactValues] = useState<Record<string, string>>({})
  const [matches, setMatches] = useState<MarketingDryRunMatch[]>()
  const event = catalog.events.find((item) => item.event_type === triggerType)
  const options = useQuery({
    queryKey: ['marketing-dry-run-options'],
    queryFn: getMarketingDryRunOptions,
  })
  const realEvents = (options.data?.events ?? []).filter(
    (item) => item.event_type === triggerType
  )
  const run = useMutation({
    mutationFn: async () => {
      const saved = await onNeedSave()
      const input: MarketingDryRunInput =
        mode === 'REAL'
          ? { mode, event_id: eventID }
          : {
              mode,
              event_id: `simulation-${Date.now()}`,
              event_type: triggerType,
              tenant_id: tenantID || undefined,
              operator_user_id: operatorUserID || undefined,
              event_data: JSON.stringify(
                buildEventData(event?.fields ?? [], values)
              ),
              fact_overrides: buildFactOverrides(factValues),
            }
      const result = await dryRunMarketingCampaigns(input)
      return { saved, result }
    },
    onSuccess: ({ saved, result }) => {
      setMatches(result.filter((item) => item.campaign_id === saved.id))
      toast.success('试跑成功')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '试跑失败')),
  })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[86vh] max-w-3xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>流程试跑</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <Field label='事件来源'>
            <Select
              value={mode}
              onValueChange={(next) => setMode(next as 'SIMULATED' | 'REAL')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='SIMULATED'>模拟事件</SelectItem>
                <SelectItem value='REAL'>真实事件</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {mode === 'REAL' ? (
            <>
              <Field label='真实事件'>
                <Select value={eventID} onValueChange={setEventID}>
                  <SelectTrigger>
                    <SelectValue placeholder='选择已落库的真实事件' />
                  </SelectTrigger>
                  <SelectContent>
                    {realEvents.map((item) => (
                      <SelectItem key={item.event_id} value={item.event_id}>
                        {item.event_type} · {item.tenant_name || item.tenant_id}{' '}
                        · {item.operator_user_nickname || item.operator_user_id}{' '}
                        · {formatDate(item.occurred_at)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {!options.isLoading && !realEvents.length && (
                <div className='text-muted-foreground text-sm'>
                  暂无当前触发事件的已落库记录。
                </div>
              )}
            </>
          ) : (
            <>
              <Field label='租户'>
                <OptionSelect
                  placeholder='选择租户'
                  options={options.data?.tenants ?? []}
                  value={tenantID}
                  onChange={setTenantID}
                />
              </Field>
              <Field label='操作者用户'>
                <OptionSelect
                  placeholder='选择操作者用户'
                  options={options.data?.users ?? []}
                  value={operatorUserID}
                  onChange={setOperatorUserID}
                />
              </Field>
              {event?.fields.map((field) => (
                <Field key={field.path} label={field.name}>
                  <DryRunEventValueInput
                    field={field}
                    value={values[field.code] ?? ''}
                    onChange={(value) =>
                      setValues({ ...values, [field.code]: value })
                    }
                  />
                </Field>
              ))}
              <DryRunFactOverrides
                catalog={catalog}
                values={factValues}
                onChange={setFactValues}
              />
            </>
          )}
          {options.error && (
            <ErrorNotice error={options.error} message='试跑候选项加载失败' />
          )}
          <Button
            disabled={
              run.isPending ||
              options.isLoading ||
              (mode === 'REAL' && !eventID)
            }
            onClick={() => run.mutate()}
          >
            <ClipboardCheck /> 执行试跑
          </Button>
          {matches?.map((match) => (
            <div
              key={match.campaign_id}
              className='space-y-3 rounded-md border p-3'
            >
              <div className='flex items-center gap-2'>
                <Badge variant={match.matched ? 'default' : 'secondary'}>
                  {match.matched ? '预计发奖' : '不发奖'}
                </Badge>
                <span>
                  {terminationReasonLabel(match.reason) ||
                    rewardTypeLabel(match.reward_type)}
                </span>
              </div>
              {match.trace.map((trace) => (
                <div
                  className='border-l-2 pl-3 text-sm'
                  key={`${trace.node_id}-${trace.attempt}`}
                >
                  <div className='font-medium'>
                    {nodeTypeLabel(trace.node_type)} · {trace.node_id}
                  </div>
                  <div className='text-muted-foreground'>
                    {trace.condition_result
                      ? `条件结果：${conditionResultLabel(trace.condition_result)}`
                      : trace.selected_edge
                        ? `选择出口：${selectedEdgeLabel(trace.selected_edge)}`
                        : trace.resume_at
                          ? `恢复时间：${trace.resume_at}`
                          : trace.action_type
                            ? `动作类型：${actionTypeLabel(trace.action_type)}`
                            : '已执行'}
                  </div>
                  {trace.input_summary && (
                    <div className='mt-1 font-mono text-xs'>
                      {trace.input_summary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const OptionSelect = ({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder: string
  options: Array<{ id: string; name: string }>
  value: string
  onChange: (value: string) => void
}) => (
  <Select
    value={value || 'NONE'}
    onValueChange={(next) => onChange(next === 'NONE' ? '' : next)}
  >
    <SelectTrigger>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value='NONE'>不指定</SelectItem>
      {options.map((item) => (
        <SelectItem key={item.id} value={item.id}>
          {item.name}（{item.id}）
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

const DryRunEventValueInput = ({
  field,
  value,
  onChange,
}: {
  field: MarketingEventField
  value: string
  onChange: (value: string) => void
}) => {
  if (field.value_type === 'ENUM' || field.value_type === 'BOOLEAN') {
    const values =
      field.value_type === 'BOOLEAN'
        ? [
            { code: 'true', name: '是' },
            { code: 'false', name: '否' },
          ]
        : field.enum_values
    return (
      <Select
        value={value || 'NONE'}
        onValueChange={(next) => onChange(next === 'NONE' ? '' : next)}
      >
        <SelectTrigger>
          <SelectValue placeholder={`选择${field.name}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='NONE'>不指定</SelectItem>
          {values.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  return (
    <Input
      type={field.value_type === 'INTEGER' ? 'number' : 'text'}
      placeholder={field.example}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

const DryRunFactOverrides = ({
  catalog,
  values,
  onChange,
}: {
  catalog: MarketingEventCatalog
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}) => {
  const field = (path: string) =>
    catalog.common_variables.find((item) => item.path === path)
  const update = (path: string, value: string) =>
    onChange({ ...values, [path]: value })
  return (
    <div className='space-y-3'>
      <div className='text-sm font-medium'>受控指标覆盖</div>
      <Field label='注册天数'>
        <Input
          type='number'
          min='0'
          value={values.registration_days ?? ''}
          onChange={(event) => update('registration_days', event.target.value)}
        />
      </Field>
      <Field label='累计支付订单数'>
        <Input
          type='number'
          min='0'
          value={values.paid_order_count ?? ''}
          onChange={(event) => update('paid_order_count', event.target.value)}
        />
      </Field>
      <Field label='累计支付订单金额（分）'>
        <Input
          type='number'
          min='0'
          value={values.paid_order_amount_cents ?? ''}
          onChange={(event) =>
            update('paid_order_amount_cents', event.target.value)
          }
        />
      </Field>
      <Field label='是否有过支付订单'>
        <DryRunEventValueInput
          field={field('purchase.has_paid_order') ?? booleanField}
          value={values.has_paid_order ?? ''}
          onChange={(value) => update('has_paid_order', value)}
        />
      </Field>
      <Field label='租户类型'>
        <DryRunEventValueInput
          field={field('tenant.type') ?? enumField}
          value={values.tenant_type ?? ''}
          onChange={(value) => update('tenant_type', value)}
        />
      </Field>
      <Field label='租户状态'>
        <DryRunEventValueInput
          field={field('tenant.status') ?? enumField}
          value={values.tenant_status ?? ''}
          onChange={(value) => update('tenant_status', value)}
        />
      </Field>
    </div>
  )
}

const booleanField: MarketingEventField = {
  code: 'has_paid_order',
  path: 'purchase.has_paid_order',
  name: '是否有过支付订单',
  description: '',
  value_type: 'BOOLEAN',
  optional: true,
  example: '',
  sensitivity: 'PUBLIC',
  operators: [],
  enum_values: [],
}

const enumField: MarketingEventField = {
  ...booleanField,
  code: 'enum',
  value_type: 'ENUM',
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className='space-y-1.5'>
    <Label>{label}</Label>
    {children}
  </div>
)
const EmptyRow = ({ colSpan, text }: { colSpan: number; text: string }) => (
  <TableRow>
    <TableCell
      colSpan={colSpan}
      className='text-muted-foreground h-28 text-center'
    >
      {text}
    </TableCell>
  </TableRow>
)
const ErrorNotice = ({
  error,
  message,
}: {
  error: unknown
  message: string
}) => (
  <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm'>
    {message}：{getApiErrorMessage(error)}
  </div>
)
const StatusBadge = ({ status }: { status: MarketingCampaign['status'] }) => (
  <Badge variant={status === 'RUNNING' ? 'default' : 'secondary'}>
    {
      {
        DRAFT: '草稿',
        RUNNING: '运行中',
        PAUSED: '已暂停',
        ENDED: '已结束',
        ARCHIVED: '已归档',
      }[status]
    }
  </Badge>
)

function campaignInput(values: {
  name: string
  code: string
  flow: CampaignFlowConfig
  participationRule: MarketingParticipationRule
  budget: string
  exclusiveGroup: string
  priority: string
  triggerEndAt: string
  executeEndAt: string
}): MarketingCampaignInput {
  return {
    campaign_code: values.code.trim(),
    name: values.name.trim(),
    schema_version: values.flow.schema_version,
    flow_config: JSON.stringify(values.flow),
    trigger_end_at: toISODateTime(values.triggerEndAt),
    execute_end_at: toISODateTime(values.executeEndAt),
    participation_rule: values.participationRule,
    budget_amount: nonNegativeNumber(values.budget),
    exclusive_group: values.exclusiveGroup.trim(),
    priority: nonNegativeInteger(values.priority),
  }
}
function omitCampaignCode(input: MarketingCampaignInput) {
  const { campaign_code: _, ...result } = input
  return result
}
function conditionGroup(value: unknown) {
  return value &&
    typeof value === 'object' &&
    Array.isArray((value as ConditionGroup).conditions)
    ? (value as ConditionGroup)
    : emptyConditionGroup()
}
function newLeaf(variables: MarketingEventField[]): ConditionLeaf {
  const field = variables[0]
  return {
    field: field?.path ?? '',
    operator: field?.operators[0]?.code ?? '',
    value: initialValue(field),
  }
}
function initialValue(field?: MarketingEventField) {
  if (field?.value_type === 'BOOLEAN') return false
  if (field?.value_type === 'INTEGER') return 0
  return field?.enum_values[0]?.code ?? ''
}
function nodeSummary(node: CampaignFlowNode) {
  if (node.type === 'TRIGGER')
    return String(node.data.event_type ?? '未选择事件')
  if (node.type === 'DELAY') return `${node.data.delay_seconds ?? 0} 秒`
  if (node.type === 'ACTION')
    return String(node.data.action_type ?? '未配置动作')
  if (node.type === 'ACTION_GROUP')
    return `${actionGroupActions(node.data).length} 项动作`
  return `${conditionGroup(node.data.condition).conditions.length} 条条件`
}

function actionGroupActions(data: Record<string, unknown>) {
  return Array.isArray(data.actions)
    ? data.actions.filter(
        (action): action is Record<string, unknown> =>
          Boolean(action) && typeof action === 'object'
      )
    : []
}

function actionLabel(action: Record<string, unknown>) {
  return actionTypeLabel(String(action.action_type ?? '')) || '未配置动作'
}
function buildEventData(
  fields: MarketingEventField[],
  values: Record<string, string>
) {
  const result: Record<string, string | number | boolean> = {}
  for (const field of fields) {
    const value = values[field.code]
    if (value === undefined || value === '') continue
    result[field.code] =
      field.value_type === 'INTEGER'
        ? Number(value)
        : field.value_type === 'BOOLEAN'
          ? value === 'true'
          : value
  }
  return result
}

function buildFactOverrides(values: Record<string, string>) {
  const result: Record<string, string | number | boolean> = {}
  for (const key of [
    'registration_days',
    'paid_order_count',
    'paid_order_amount_cents',
  ]) {
    const value = values[key]
    if (value !== undefined && value !== '') result[key] = Number(value)
  }
  if (values.has_paid_order)
    result.has_paid_order = values.has_paid_order === 'true'
  if (values.tenant_type) result.tenant_type = values.tenant_type
  if (values.tenant_status) result.tenant_status = values.tenant_status
  return JSON.stringify(result)
}

function eventName(catalog: MarketingEventCatalog | undefined, type: string) {
  return (
    catalog?.events.find((event) => event.event_type === type)?.name ??
    (type || '-')
  )
}
// 事件类型优先取事件目录中文名，无目录时退回原始编码。
function eventTypeLabel(type: string, catalog?: MarketingEventCatalog) {
  return eventName(catalog, type)
}
function formatDate(value: string) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
}
function toLocalDateTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}
function toISODateTime(value: string) {
  return value ? new Date(value).toISOString() : undefined
}
function nonNegativeNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}
function nonNegativeInteger(value: string) {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : 0
}

function arrangeFlow(flow: CampaignFlowConfig) {
  const incoming = new Map(flow.nodes.map((node) => [node.id, 0]))
  const depth = new Map(flow.nodes.map((node) => [node.id, 0]))
  for (const edge of flow.edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)
  }
  const queue = flow.nodes
    .filter((node) => incoming.get(node.id) === 0)
    .map((node) => node.id)
  while (queue.length) {
    const source = queue.shift()!
    for (const edge of flow.edges.filter((item) => item.source === source)) {
      depth.set(
        edge.target,
        Math.max(depth.get(edge.target) ?? 0, (depth.get(source) ?? 0) + 1)
      )
      const remaining = (incoming.get(edge.target) ?? 1) - 1
      incoming.set(edge.target, remaining)
      if (remaining === 0) queue.push(edge.target)
    }
  }
  const lanes = new Map<number, number>()
  return {
    ...flow,
    nodes: flow.nodes.map((node) => {
      const column = depth.get(node.id) ?? 0
      const lane = lanes.get(column) ?? 0
      lanes.set(column, lane + 1)
      return { ...node, position: { x: 80 + column * 260, y: 80 + lane * 170 } }
    }),
  }
}
