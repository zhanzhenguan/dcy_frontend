import type {
  MarketingEventCatalog,
  MarketingEventField,
} from '@/services/api/marketingCampaignApi'

export type CampaignEventCatalog = MarketingEventCatalog
export type CampaignEventField = MarketingEventField

export const CAMPAIGN_FLOW_SCHEMA_VERSION = 1

export type CampaignNodeType =
  'TRIGGER' | 'CONDITION' | 'DELAY' | 'ACTION' | 'ACTION_GROUP'

export type ConditionLeaf = {
  field: string
  operator: string
  value?: string | number | boolean | Array<string | number | boolean>
}

export type ConditionGroup = {
  logic: 'AND' | 'OR' | 'NOT'
  conditions: Array<ConditionGroup | ConditionLeaf>
}

export type CampaignFlowNode = {
  id: string
  type: CampaignNodeType
  data: Record<string, unknown>
  position: { x: number; y: number }
}

export type CampaignFlowEdge = {
  id: string
  source: string
  target: string
  source_handle?: 'matched' | 'unmatched'
}

export type CampaignFlowConfig = {
  schema_version: number
  nodes: CampaignFlowNode[]
  edges: CampaignFlowEdge[]
}

export function createEmptyFlow(eventType = ''): CampaignFlowConfig {
  return {
    schema_version: CAMPAIGN_FLOW_SCHEMA_VERSION,
    nodes: [
      {
        id: 'trigger-1',
        type: 'TRIGGER',
        data: { event_type: eventType },
        position: { x: 120, y: 160 },
      },
    ],
    edges: [],
  }
}

export function parseFlowConfig(raw?: string): CampaignFlowConfig {
  if (!raw?.trim()) return createEmptyFlow()
  try {
    const parsed = JSON.parse(raw) as Partial<CampaignFlowConfig>
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return createEmptyFlow()
    }
    return {
      schema_version:
        Number(parsed.schema_version) || CAMPAIGN_FLOW_SCHEMA_VERSION,
      nodes: parsed.nodes.flatMap(parseNode),
      edges: parsed.edges.flatMap(parseEdge),
    }
  } catch {
    return createEmptyFlow()
  }
}

export function variablesForTrigger(
  catalog: CampaignEventCatalog | undefined,
  triggerType: string
) {
  const event = catalog?.events.find((item) => item.event_type === triggerType)
  return [...(event?.fields ?? []), ...(catalog?.common_variables ?? [])]
}

export function needsCouponTemplates(node?: CampaignFlowNode) {
  if (node?.type === 'ACTION') {
    return node.data.action_type === 'ISSUE_COUPON'
  }
  return (
    node?.type === 'ACTION_GROUP' &&
    Array.isArray(node.data.actions) &&
    node.data.actions.some(
      (action) =>
        Boolean(action) &&
        typeof action === 'object' &&
        (action as Record<string, unknown>).action_type === 'ISSUE_COUPON'
    )
  )
}

// uncappedCouponTemplateNames 返回流程中引用的、未设置优惠上限的折扣券模板名。
// 这类券无法预估成本，台账记 0，不参与活动预算估算。
export function uncappedCouponTemplateNames(
  flow: CampaignFlowConfig,
  templates: Array<{
    id: string
    name: string
    coupon_type: 'FULL_REDUCTION' | 'DISCOUNT'
    cap_amount: number
  }>
) {
  const ids = new Set<string>()
  for (const node of flow.nodes) {
    const actions =
      node.type === 'ACTION'
        ? [node.data]
        : node.type === 'ACTION_GROUP'
          ? actionGroupItems(node.data)
          : []
    for (const action of actions) {
      if (String(action.action_type ?? '') !== 'ISSUE_COUPON') continue
      const id = String(action.coupon_template_id ?? '')
      if (id) ids.add(id)
    }
  }
  const names = templates
    .filter(
      (template) =>
        ids.has(template.id) &&
        template.coupon_type === 'DISCOUNT' &&
        !(template.cap_amount > 0)
    )
    .map((template) => template.name)
  return Array.from(new Set(names))
}

export function canConnect(
  flow: CampaignFlowConfig,
  source: string,
  target: string,
  sourceHandle?: string | null
) {
  if (!source || !target || source === target) return false
  const sourceNode = flow.nodes.find((node) => node.id === source)
  const targetNode = flow.nodes.find((node) => node.id === target)
  if (!sourceNode || !targetNode || targetNode.type === 'TRIGGER') return false
  if (sourceNode.type === 'ACTION' || sourceNode.type === 'ACTION_GROUP')
    return false
  if (flow.edges.some((edge) => edge.target === target)) return false
  if (sourceNode.type === 'CONDITION') {
    if (sourceHandle !== 'matched' && sourceHandle !== 'unmatched') return false
    if (
      flow.edges.some(
        (edge) => edge.source === source && edge.source_handle === sourceHandle
      )
    ) {
      return false
    }
  } else if (sourceHandle) {
    return false
  } else if (flow.edges.some((edge) => edge.source === source)) {
    return false
  }
  return !hasPath(flow.edges, target, source)
}

export function addFlowNode(
  flow: CampaignFlowConfig,
  type: Exclude<CampaignNodeType, 'TRIGGER'>
): CampaignFlowConfig {
  const ordinal = flow.nodes.filter((node) => node.type === type).length + 1
  const id = `${type.toLowerCase()}-${ordinal}`
  const data =
    type === 'CONDITION'
      ? { condition: emptyConditionGroup() }
      : type === 'DELAY'
        ? { delay_seconds: 86400 }
        : type === 'ACTION_GROUP'
          ? { actions: [{ action_type: 'GRANT_POINTS', points: 100 }] }
          : { action_type: 'GRANT_POINTS', points: 100 }
  return {
    ...flow,
    nodes: [
      ...flow.nodes,
      {
        id,
        type,
        data,
        position: { x: 320 + ordinal * 44, y: 120 + ordinal * 48 },
      },
    ],
  }
}

export function updateFlowNode(
  flow: CampaignFlowConfig,
  nodeID: string,
  data: Record<string, unknown>
) {
  return {
    ...flow,
    nodes: flow.nodes.map((node) =>
      node.id === nodeID ? { ...node, data } : node
    ),
  }
}

export function changeTrigger(flow: CampaignFlowConfig, eventType: string) {
  return {
    ...flow,
    nodes: flow.nodes.map((node) => {
      if (node.type === 'TRIGGER')
        return { ...node, data: { event_type: eventType } }
      if (node.type === 'CONDITION')
        return { ...node, data: { condition: emptyConditionGroup() } }
      if (node.type === 'ACTION')
        return { ...node, data: removeActionEventTokens(node.data) }
      if (node.type === 'ACTION_GROUP') {
        const actions = Array.isArray(node.data.actions)
          ? node.data.actions.map((action) =>
              action && typeof action === 'object'
                ? removeActionEventTokens(action as Record<string, unknown>)
                : action
            )
          : []
        return { ...node, data: { ...node.data, actions } }
      }
      return node
    }),
  }
}

export function removeFlowNode(flow: CampaignFlowConfig, nodeID: string) {
  const node = flow.nodes.find((item) => item.id === nodeID)
  if (!node || node.type === 'TRIGGER') return flow
  return {
    ...flow,
    nodes: flow.nodes.filter((item) => item.id !== nodeID),
    edges: flow.edges.filter(
      (edge) => edge.source !== nodeID && edge.target !== nodeID
    ),
  }
}

export function emptyConditionGroup(): ConditionGroup {
  return { logic: 'AND', conditions: [] }
}

export function flowValidationMessages(
  flow: CampaignFlowConfig,
  deadlines?: { triggerEndAt?: string; executeEndAt?: string },
  numericVariables: CampaignEventField[] = []
) {
  const messages: string[] = []
  const triggers = flow.nodes.filter((node) => node.type === 'TRIGGER')
  if (triggers.length !== 1)
    messages.push('流程必须且只能包含一个 Trigger 节点')
  if (flow.nodes.length > 50) messages.push('流程节点不能超过 50 个')
  for (const node of flow.nodes) {
    const incoming = flow.edges.filter((edge) => edge.target === node.id)
    const outgoing = flow.edges.filter((edge) => edge.source === node.id)
    if (node.type === 'TRIGGER') {
      if (!String(node.data.event_type ?? '').trim()) {
        messages.push('请选择 Trigger 事件')
      }
      if (outgoing.length !== 1)
        messages.push('Trigger 节点必须连接一个后续节点')
    }
    if (node.type !== 'TRIGGER' && incoming.length !== 1) {
      messages.push(`${nodeLabel(node.type)} 节点必须有一条入线`)
    }
    if (node.type === 'CONDITION') {
      const condition = node.data.condition
      if (!isConditionGroup(condition)) {
        messages.push('Condition 节点必须至少配置一个条件')
      } else if (conditionDepth(condition) > 5) {
        messages.push('Condition 条件组嵌套不能超过 5 层')
      } else if (conditionLeafCount(condition) > 20) {
        messages.push('Condition 节点最多配置 20 条条件')
      }
    }
    if (node.type === 'DELAY') {
      if (!isPositiveInteger(node.data.delay_seconds)) {
        messages.push('Delay 节点必须设置正整数秒数')
      }
      if (outgoing.length !== 1) messages.push('Delay 节点必须连接一个后续节点')
    }
    if (node.type === 'ACTION' || node.type === 'ACTION_GROUP') {
      if (outgoing.length) messages.push('Action 节点不能有出线')
      if (
        (node.type === 'ACTION' && !isActionConfigured(node.data)) ||
        (node.type === 'ACTION_GROUP' && !isActionGroupConfigured(node.data))
      )
        messages.push(
          node.type === 'ACTION'
            ? 'Action 节点尚未配置动作'
            : '终点动作组至少需要一个完整动作'
        )
      const actions =
        node.type === 'ACTION' ? [node.data] : actionGroupItems(node.data)
      actions.forEach((action) => {
        if (String(action.action_type ?? '') !== 'GRANT_POINTS') return
        const error = validateNumericExpression(
          String(action.points ?? ''),
          numericVariables
        )
        if (error) messages.push(error)
      })
    }
  }
  const cyclic = hasCycle(flow)
  if (cyclic) messages.push('流程不支持循环')
  const longestDelay = cyclic ? 0 : longestPathDelay(flow)
  if (!cyclic && longestPathNodes(flow) > 20)
    messages.push('流程单条路径节点不能超过 20 个')
  if (!cyclic && longestDelay > 365 * 24 * 60 * 60)
    messages.push('流程单条路径累计延时不能超过 365 天')
  if (deadlines?.triggerEndAt && deadlines.executeEndAt) {
    const triggerEnd = new Date(deadlines.triggerEndAt).getTime()
    const executeEnd = new Date(deadlines.executeEndAt).getTime()
    if (
      Number.isFinite(triggerEnd) &&
      Number.isFinite(executeEnd) &&
      executeEnd < triggerEnd + longestDelay * 1000
    ) {
      messages.push('执行截止不得早于触发截止加最长路径延时')
    }
  }
  return unique(messages)
}

export function validateNumericExpression(
  expression: string,
  variables: CampaignEventField[]
) {
  const input = expression.trim()
  if (!input) return '发放积分的数量不能为空'
  const paths = new Set(
    variables
      .filter((item) => item.value_type === 'INTEGER')
      .map((item) => item.path)
  )
  let pos = 0
  const skip = () => {
    while (/\s/.test(input[pos] ?? '')) pos++
  }
  const additive = (): boolean => {
    if (!multiplicative()) return false
    while (true) {
      skip()
      if (!['+', '-'].includes(input[pos] ?? '')) return true
      pos++
      if (!multiplicative()) return false
    }
  }
  const multiplicative = (): boolean => {
    if (!unary()) return false
    while (true) {
      skip()
      if (!['*', '/'].includes(input[pos] ?? '')) return true
      pos++
      if (!unary()) return false
    }
  }
  const unary = (): boolean => {
    skip()
    if (['+', '-'].includes(input[pos] ?? '')) {
      pos++
      return unary()
    }
    if (input[pos] === '(') {
      pos++
      if (!additive()) return false
      skip()
      if (input[pos] !== ')') return false
      pos++
      return true
    }
    if (input.startsWith('{{', pos)) {
      const end = input.indexOf('}}', pos + 2)
      if (end < 0) return false
      const path = input.slice(pos + 2, end).trim()
      if (!paths.has(path)) return false
      pos = end + 2
      return true
    }
    const start = pos
    while (/[0-9.]/.test(input[pos] ?? '')) pos++
    return pos > start && Number.isFinite(Number(input.slice(start, pos)))
  }
  if (!additive()) return '发放积分的数量表达式不合法或包含不可计算变量'
  skip()
  if (pos !== input.length)
    return '发放积分的数量表达式不合法或包含不可计算变量'
  if (!input.includes('{{') && /^\d+(?:\.\d+)?$/.test(input)) {
    const value = Number(input)
    if (!Number.isInteger(value) || value <= 0)
      return '发放积分的数量必须计算为正整数'
  }
  return undefined
}

function actionGroupItems(data: Record<string, unknown>) {
  return Array.isArray(data.actions)
    ? data.actions.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object'
      )
    : []
}

function parseNode(value: unknown): CampaignFlowNode[] {
  if (!value || typeof value !== 'object') return []
  const node = value as Partial<CampaignFlowNode>
  if (
    !node.id ||
    !isNodeType(node.type) ||
    !node.data ||
    typeof node.data !== 'object'
  ) {
    return []
  }
  const position = node.position
  return [
    {
      id: node.id,
      type: node.type,
      data: node.data,
      position:
        position && Number.isFinite(position.x) && Number.isFinite(position.y)
          ? position
          : { x: 120, y: 120 },
    },
  ]
}

function parseEdge(value: unknown): CampaignFlowEdge[] {
  if (!value || typeof value !== 'object') return []
  const edge = value as Partial<CampaignFlowEdge>
  if (!edge.id || !edge.source || !edge.target) return []
  if (
    edge.source_handle &&
    !['matched', 'unmatched'].includes(edge.source_handle)
  ) {
    return []
  }
  return [
    {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(edge.source_handle ? { source_handle: edge.source_handle } : {}),
    },
  ]
}

function isNodeType(value: unknown): value is CampaignNodeType {
  return ['TRIGGER', 'CONDITION', 'DELAY', 'ACTION', 'ACTION_GROUP'].includes(
    String(value)
  )
}

function isConditionGroup(value: unknown): value is ConditionGroup {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    Array.isArray((value as ConditionGroup).conditions) &&
    (value as ConditionGroup).conditions.length > 0
  )
}

function isActionConfigured(data: Record<string, unknown>) {
  const actionType = String(data.action_type ?? '')
  if (actionType === 'GRANT_POINTS')
    return String(data.points ?? '').trim().length > 0
  if (actionType === 'ISSUE_COUPON')
    return isPositiveInteger(data.coupon_template_id)
  if (actionType === 'GRANT_BENEFIT')
    return isPositiveInteger(data.benefit_definition_id)
  return (
    actionType === 'SEND_MESSAGE' &&
    Boolean(String(data.title ?? '').trim()) &&
    Boolean(String(data.content ?? '').trim())
  )
}

function isActionGroupConfigured(data: Record<string, unknown>) {
  return (
    Array.isArray(data.actions) &&
    data.actions.length > 0 &&
    data.actions.every(
      (action) =>
        Boolean(action) &&
        typeof action === 'object' &&
        isActionConfigured(action as Record<string, unknown>)
    )
  )
}

function isPositiveInteger(value: unknown) {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

function conditionDepth(group: ConditionGroup): number {
  return (
    1 +
    Math.max(
      0,
      ...group.conditions
        .filter((item): item is ConditionGroup => 'logic' in item)
        .map(conditionDepth)
    )
  )
}
function conditionLeafCount(group: ConditionGroup): number {
  return group.conditions.reduce(
    (count, item) => count + ('logic' in item ? conditionLeafCount(item) : 1),
    0
  )
}
function longestPathNodes(flow: CampaignFlowConfig) {
  const walk = (id: string): number => {
    const next = flow.edges.filter((edge) => edge.source === id)
    return 1 + Math.max(0, ...next.map((edge) => walk(edge.target)))
  }
  const trigger = flow.nodes.find((node) => node.type === 'TRIGGER')
  return trigger ? walk(trigger.id) : 0
}
function longestPathDelay(flow: CampaignFlowConfig) {
  const nodes = new Map(flow.nodes.map((node) => [node.id, node]))
  const walk = (id: string): number => {
    const node = nodes.get(id)
    const own =
      node?.type === 'DELAY' ? Number(node.data.delay_seconds) || 0 : 0
    return (
      own +
      Math.max(
        0,
        ...flow.edges
          .filter((edge) => edge.source === id)
          .map((edge) => walk(edge.target))
      )
    )
  }
  const trigger = flow.nodes.find((node) => node.type === 'TRIGGER')
  return trigger ? walk(trigger.id) : 0
}
function removeEventTokens(value: string) {
  return value.replace(/\{\{\s*event\.data\.[^{}\s]+\s*\}\}/g, '')
}

function removeActionEventTokens(data: Record<string, unknown>) {
  if (data.action_type !== 'SEND_MESSAGE') return data
  const defaults = data.variable_defaults as Record<string, string> | undefined
  return {
    ...data,
    title: removeEventTokens(String(data.title ?? '')),
    content: removeEventTokens(String(data.content ?? '')),
    variable_defaults: Object.fromEntries(
      Object.entries(defaults ?? {}).filter(
        ([path]) => !path.startsWith('event.data.')
      )
    ),
  }
}

function hasPath(edges: CampaignFlowEdge[], start: string, target: string) {
  const pending = [start]
  const visited = new Set<string>()
  while (pending.length) {
    const current = pending.pop()
    if (!current || visited.has(current)) continue
    if (current === target) return true
    visited.add(current)
    for (const edge of edges) {
      if (edge.source === current) pending.push(edge.target)
    }
  }
  return false
}

function hasCycle(flow: CampaignFlowConfig) {
  return flow.nodes.some((node) =>
    flow.edges
      .filter((edge) => edge.source === node.id)
      .some((edge) => hasPath(flow.edges, edge.target, node.id))
  )
}

function nodeLabel(type: CampaignNodeType) {
  return {
    TRIGGER: 'Trigger',
    CONDITION: 'Condition',
    DELAY: 'Delay',
    ACTION: 'Action',
    ACTION_GROUP: '终点动作组',
  }[type]
}

function unique(values: string[]) {
  return [...new Set(values)]
}
