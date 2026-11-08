import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeGenerationLimits } from './generationLimits.ts'

test('normalizes nullable historical resolution and ratio rules', () => {
  assert.deepEqual(
    normalizeGenerationLimits({
      generation_duration_min: 4,
      allowed_ratios: null as unknown as string[],
      allowed_resolutions: null as unknown as string[],
    }),
    {
      generation_duration_min: 4,
      generation_duration_max: 0,
      reference_image_max_count: 0,
      reference_image_max_mb: 0,
      reference_video_max_count: 0,
      reference_video_duration_min: 0,
      reference_video_duration_max: 0,
      reference_video_total_duration_max: 0,
      allowed_ratios: [],
      allowed_resolutions: [],
    }
  )
})
