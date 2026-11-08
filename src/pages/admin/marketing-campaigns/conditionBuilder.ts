export type ConditionRule = {
  OpLogic: '&&' | '||' | '!'
  Conditions?: Condition[]
  ConditionGroups?: ConditionRule[]
}

export type Condition = {
  Operator: string
  Lhs: { VarExpr: string }
  Rhs: {
    Const?: Constant
    ConstList?: Constant[]
  }
}

type Constant = { StrConst?: string; NumConst?: number; BoolConst?: boolean }

export const emptyConditionRule = (): ConditionRule => ({
  OpLogic: '&&',
  Conditions: [],
  ConditionGroups: [],
})

export function parseConditionRule(value: string): ConditionRule | null {
  if (!value.trim()) return emptyConditionRule()
  try {
    const parsed = JSON.parse(value) as unknown
    return isConditionRule(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function stringifyConditionRule(rule: ConditionRule) {
  if (!rule.Conditions?.length && !rule.ConditionGroups?.length) return ''
  return JSON.stringify(rule)
}

export function combineConditionRules(...values: string[]) {
  const rules = values.map((value) => value.trim()).filter(Boolean)
  if (rules.length < 2) return rules[0] ?? ''
  const lastRule = rules[rules.length - 1] ?? ''
  try {
    const groups = rules.map((rule) => JSON.parse(rule) as unknown)
    if (groups.some((group) => !isJsonObjectValue(group))) return lastRule
    return JSON.stringify({ OpLogic: '&&', ConditionGroups: groups })
  } catch {
    return lastRule
  }
}

export function isJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown
    return isJsonObjectValue(parsed)
  } catch {
    return false
  }
}

function isJsonObjectValue(value: unknown) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function isConditionRule(value: unknown): value is ConditionRule {
  if (!value || typeof value !== 'object') return false
  const rule = value as Record<string, unknown>
  if (!['&&', '||', '!'].includes(String(rule.OpLogic))) return false
  if (
    rule.Conditions !== undefined &&
    (!Array.isArray(rule.Conditions) || !rule.Conditions.every(isCondition))
  ) {
    return false
  }
  if (
    rule.ConditionGroups !== undefined &&
    (!Array.isArray(rule.ConditionGroups) ||
      !rule.ConditionGroups.every(isConditionRule))
  ) {
    return false
  }
  return Array.isArray(rule.Conditions) || Array.isArray(rule.ConditionGroups)
}

function isCondition(value: unknown): value is Condition {
  if (!value || typeof value !== 'object') return false
  const condition = value as Record<string, unknown>
  const lhs = condition.Lhs as Record<string, unknown> | undefined
  const rhs = condition.Rhs as Record<string, unknown> | undefined
  const constant = rhs?.Const as Record<string, unknown> | undefined
  const constantList = rhs?.ConstList
  if (
    typeof condition.Operator !== 'string' ||
    typeof lhs?.VarExpr !== 'string' ||
    (!constant && !Array.isArray(constantList))
  ) {
    return false
  }
  if (constant) return isConstant(constant)
  return Array.isArray(constantList) && constantList.every(isConstant)
}

function isConstant(value: unknown): value is Constant {
  if (!value || typeof value !== 'object') return false
  const constant = value as Record<string, unknown>
  const values = [constant.StrConst, constant.NumConst, constant.BoolConst]
  return values.filter((item) => item !== undefined).length === 1
}

export function createCondition(): Condition {
  return {
    Operator: '==',
    Lhs: { VarExpr: 'event.data.channel' },
    Rhs: { Const: { StrConst: '' } },
  }
}

export function conditionValue(condition: Condition) {
  if (condition.Rhs.ConstList) {
    return condition.Rhs.ConstList.map(constantValue).join(', ')
  }
  return constantValue(condition.Rhs.Const ?? {})
}

function constantValue(constant: Constant) {
  if (constant.NumConst !== undefined) return String(constant.NumConst)
  if (constant.BoolConst !== undefined) return String(constant.BoolConst)
  return constant.StrConst ?? ''
}

export function updateConditionValue(condition: Condition, value: string) {
  const operator = condition.Operator
  if (listOperators.has(operator)) {
    return {
      ...condition,
      Rhs: {
        ConstList: value
          .split(',')
          .filter(Boolean)
          .map((item) => ({
            StrConst: item.trim(),
          })),
      },
    }
  }
  if (['>', '>=', '<', '<='].includes(operator)) {
    return {
      ...condition,
      Rhs: { Const: { NumConst: Number(value) || 0 } },
    }
  }
  return { ...condition, Rhs: { Const: { StrConst: value } } }
}

const listOperators = new Set([
  'LIST_IN',
  'LIST_CONTAINS',
  'LIST_RETAIN',
  'SUB_LIST_IN',
  'SUB_LIST_CONTAINS',
  'CONTAINS_KEYWORDS',
  'BETWEEN_ALL_CLOSE',
  'BETWEEN_ALL_OPEN',
  'BETWEEN_LEFT_OPEN_RIGHT_CLOSE',
  'BETWEEN_LEFT_CLOSE_RIGHT_OPEN',
])
