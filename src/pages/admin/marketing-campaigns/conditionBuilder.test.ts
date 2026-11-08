import assert from 'node:assert/strict'
import test from 'node:test'
import {
  combineConditionRules,
  createCondition,
  emptyConditionRule,
  parseConditionRule,
  stringifyConditionRule,
  updateConditionValue,
} from './conditionBuilder'

test('condition builder combines legacy rules with AND', () => {
  assert.equal(
    combineConditionRules(
      '{"OpLogic":"&&","Conditions":[]}',
      '{"OpLogic":"||","Conditions":[]}'
    ),
    '{"OpLogic":"&&","ConditionGroups":[{"OpLogic":"&&","Conditions":[]},{"OpLogic":"||","Conditions":[]}]}'
  )
})

test('condition builder serializes nested arishem groups', () => {
  const rule = emptyConditionRule()
  rule.Conditions = [updateConditionValue(createCondition(), 'web')]
  rule.ConditionGroups = [
    {
      OpLogic: '||',
      Conditions: [
        {
          Operator: '>',
          Lhs: { VarExpr: 'registration.ageDays' },
          Rhs: { Const: { NumConst: 0 } },
        },
      ],
    },
  ]

  assert.deepEqual(parseConditionRule(stringifyConditionRule(rule)), rule)
})

test('condition builder rejects JSON outside the editable arishem shape', () => {
  assert.equal(parseConditionRule('{"unknown":true}'), null)
  assert.equal(
    parseConditionRule(
      '{"OpLogic":"&&","Conditions":[{"Operator":"==","Lhs":{"VarExpr":"event.data.amount"},"Rhs":{"MathExpr":{"OpMath":"+","ParamList":[{"Const":{"NumConst":1}},{"Const":{"NumConst":2}}]}}}]}'
    ),
    null
  )
})
