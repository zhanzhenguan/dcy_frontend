import assert from 'node:assert/strict'
import test from 'node:test'
import { allowedResolutionsForProvider } from './modelRuleResolutions.ts'

test('returns only the selected provider rule resolutions', () => {
  const providers = [
    {
      provider: { code: 'seedance' },
      generation_limits: { allowed_resolutions: ['480p', '720P', '720p'] },
    },
    {
      provider: { code: 'other' },
      generation_limits: { allowed_resolutions: ['1080p'] },
    },
  ]

  assert.deepEqual(allowedResolutionsForProvider(providers, 'SEEDANCE'), [
    '480p',
    '720p',
  ])
})
