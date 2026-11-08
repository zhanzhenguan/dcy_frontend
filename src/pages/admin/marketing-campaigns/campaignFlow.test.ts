import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canConnect,
  changeTrigger,
  createEmptyFlow,
  flowValidationMessages,
  needsCouponTemplates,
  parseFlowConfig,
  variablesForTrigger,
  type CampaignEventCatalog,
  type CampaignEventField,
  type CampaignFlowConfig,
} from './campaignFlow'

const catalog: CampaignEventCatalog = {
  events: [
    {
      event_type: 'ORDER_PAID',
      schema_version: 1,
      name: '订单支付成功',
      description: '订单完成支付时触发。',
      fields: [
        field('order_no', '订单号', 'STRING'),
        field('amount_cents', '支付金额', 'INTEGER'),
      ],
    },
    {
      event_type: 'VIDEO_GENERATED',
      schema_version: 1,
      name: '视频生成完成',
      description: '视频生成完成时触发。',
      fields: [field('video_id', '视频 ID', 'STRING')],
    },
  ],
  common_variables: [field('tenant_type', '租户类型', 'ENUM')],
}

test('新建流程以订单支付 Trigger 作为可编辑草稿', () => {
  const flow = createEmptyFlow('ORDER_PAID')

  assert.deepEqual(flow, {
    schema_version: 1,
    nodes: [
      {
        id: 'trigger-1',
        type: 'TRIGGER',
        data: { event_type: 'ORDER_PAID' },
        position: { x: 120, y: 160 },
      },
    ],
    edges: [],
  })
})

test('仅当前 Trigger 字段和通用变量可作为条件变量', () => {
  assert.deepEqual(
    variablesForTrigger(catalog, 'ORDER_PAID').map((field) => field.path),
    ['event.data.order_no', 'event.data.amount_cents', 'tenant.tenant_type']
  )
})

test('连线禁止终点节点出线、汇合、循环和错误的条件端口', () => {
  const flow: CampaignFlowConfig = {
    schema_version: 1,
    nodes: [
      triggerNode(),
      conditionNode('condition-1'),
      actionNode('action-1'),
      actionNode('action-2'),
      actionGroupNode('actions-1'),
    ],
    edges: [
      edge('trigger-1', 'condition-1'),
      edge('condition-1', 'action-1', 'matched'),
    ],
  }

  assert.equal(canConnect(flow, 'condition-1', 'action-2', 'unmatched'), true)
  assert.equal(canConnect(flow, 'condition-1', 'action-2', 'wrong'), false)
  assert.equal(canConnect(flow, 'action-1', 'action-2'), false)
  assert.equal(canConnect(flow, 'actions-1', 'action-2'), false)
  assert.equal(canConnect(flow, 'trigger-1', 'action-1'), false)
  assert.equal(canConnect(flow, 'action-2', 'trigger-1'), false)
})

test('终点动作组必须包含完整动作', () => {
  const flow: CampaignFlowConfig = {
    schema_version: 1,
    nodes: [triggerNode(), actionGroupNode('actions-1')],
    edges: [edge('trigger-1', 'actions-1')],
  }

  assert.ok(
    flowValidationMessages(flow).includes('终点动作组至少需要一个完整动作')
  )

  flow.nodes[1]!.data = {
    actions: [
      { action_type: 'ISSUE_COUPON', coupon_template_id: 7 },
      {
        action_type: 'SEND_MESSAGE',
        title: '优惠券已到账',
        content: '请查看账户',
      },
    ],
  }
  assert.deepEqual(flowValidationMessages(flow), [])
})

test('发券终点动作或动作组都会加载优惠券模板', () => {
  assert.equal(
    needsCouponTemplates({
      ...actionNode('action-1'),
      data: { action_type: 'ISSUE_COUPON', coupon_template_id: 7 },
    }),
    true
  )
  assert.equal(
    needsCouponTemplates({
      ...actionGroupNode('actions-1'),
      data: {
        actions: [
          { action_type: 'SEND_MESSAGE', title: '通知', content: '内容' },
          { action_type: 'ISSUE_COUPON', coupon_template_id: 7 },
        ],
      },
    }),
    true
  )
  assert.equal(needsCouponTemplates(actionGroupNode('actions-1')), false)
})

test('发布校验报告缺失 Trigger 出线和未配置终点动作', () => {
  const draft = parseFlowConfig(
    JSON.stringify({
      schema_version: 1,
      nodes: [triggerNode(), actionNode('action-1')],
      edges: [],
    })
  )

  assert.deepEqual(flowValidationMessages(draft), [
    'Trigger 节点必须连接一个后续节点',
    'Action 节点必须有一条入线',
    'Action 节点尚未配置动作',
  ])
})

test('切换 Trigger 会移除旧事件条件和消息变量', () => {
  const flow = changeTrigger(
    {
      schema_version: 1,
      nodes: [
        triggerNode(),
        conditionNode('condition-1'),
        {
          ...actionNode('action-1'),
          data: {
            action_type: 'SEND_MESSAGE',
            title: '订单 {{event.data.order_no}}',
            content: '租户 {{tenant.tenant_type}}',
            variable_defaults: {
              'event.data.order_no': '订单',
              'tenant.tenant_type': '企业',
            },
          },
        },
      ],
      edges: [],
    },
    'VIDEO_GENERATED'
  )

  assert.deepEqual(flow.nodes[1]?.data, {
    condition: { logic: 'AND', conditions: [] },
  })
  assert.equal(flow.nodes[2]?.data.title, '订单 ')
  assert.deepEqual(flow.nodes[2]?.data.variable_defaults, {
    'tenant.tenant_type': '企业',
  })
})

test('发布校验阻止执行截止早于最长路径延时', () => {
  const flow: CampaignFlowConfig = {
    schema_version: 1,
    nodes: [
      triggerNode(),
      {
        id: 'delay-1',
        type: 'DELAY',
        data: { delay_seconds: 86400 },
        position: { x: 360, y: 160 },
      },
      {
        ...actionNode('action-1'),
        data: { action_type: 'GRANT_POINTS', points: 10 },
      },
    ],
    edges: [edge('trigger-1', 'delay-1'), edge('delay-1', 'action-1')],
  }

  assert.ok(
    flowValidationMessages(flow, {
      triggerEndAt: '2026-09-01T00:00:00Z',
      executeEndAt: '2026-09-01T12:00:00Z',
    }).includes('执行截止不得早于触发截止加最长路径延时')
  )
})

function field(
  code: string,
  name: string,
  valueType: CampaignEventField['value_type']
): CampaignEventField {
  return {
    code,
    path: code === 'tenant_type' ? 'tenant.tenant_type' : `event.data.${code}`,
    name,
    description: '',
    value_type: valueType,
    optional: false,
    example: '',
    sensitivity: 'PUBLIC',
    operators: [],
    enum_values: [],
  }
}

function triggerNode() {
  return {
    id: 'trigger-1',
    type: 'TRIGGER' as const,
    data: { event_type: 'ORDER_PAID' },
    position: { x: 120, y: 160 },
  }
}

function conditionNode(id: string) {
  return {
    id,
    type: 'CONDITION' as const,
    data: {
      condition: {
        logic: 'AND' as const,
        conditions: [
          { field: 'event.data.order_no', operator: 'EQUAL', value: 'A-1' },
        ],
      },
    },
    position: { x: 360, y: 160 },
  }
}

function actionNode(id: string) {
  return {
    id,
    type: 'ACTION' as const,
    data: {},
    position: { x: 620, y: 160 },
  }
}

function actionGroupNode(id: string) {
  return {
    id,
    type: 'ACTION_GROUP' as const,
    data: { actions: [] },
    position: { x: 620, y: 160 },
  }
}

function edge(
  source: string,
  target: string,
  sourceHandle: 'matched' | 'unmatched' | undefined = undefined
) {
  return {
    id: `${source}-${target}`,
    source,
    target,
    source_handle: sourceHandle,
  }
}
