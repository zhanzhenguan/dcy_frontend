import assert from 'node:assert/strict'
import test from 'node:test'
import { allowedRatiosForProvider } from './modelRuleRatios.ts'

test('returns only the selected provider rule ratios', () => {
  const providers = [
    {
      provider: { code: 'seedance' },
      generation_limits: { allowed_ratios: ['16:9', '4:3'] },
    },
    {
      provider: { code: 'other' },
      generation_limits: { allowed_ratios: ['9:16'] },
    },
  ]

  assert.deepEqual(allowedRatiosForProvider(providers, 'SEEDANCE'), [
    '16:9',
    '4:3',
  ])
})
