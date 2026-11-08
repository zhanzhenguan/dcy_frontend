import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeGlobalRuleForSystemResolutions } from './globalModelRuleDraft.ts'

test('removes historical resolutions and their associated rules', () => {
  const rules = {
    providers: [
      {
        provider_id: '1',
        provider_code: 'seedance',
        provider_name: 'Seedance',
        enabled: true,
        enhancement_enabled: true,
        enhancement_strategies: [
          { target_resolution: '2k', source_resolution: '1080p' },
          { target_resolution: '1080p', source_resolution: '720p' },
        ],
        generation_limits: {
          generation_duration_min: 0,
          generation_duration_max: 0,
          reference_image_max_count: 0,
          reference_image_max_mb: 0,
          reference_video_max_count: 0,
          reference_video_duration_min: 0,
          reference_video_duration_max: 0,
          reference_video_total_duration_max: 0,
          allowed_ratios: [],
          allowed_resolutions: ['720p', '1080p', '2k'],
        },
        models: [
          {
            model_id: '1',
            model_code: 'seedance-2',
            model_name: 'Seedance 2',
            base_credits: 100,
            supported_resolutions: ['720p', '2k'],
            pricing_rules: [
              {
                scenario: 'no_input_video' as const,
                resolution: '720p',
                coefficient: 1,
              },
              {
                scenario: 'input_video' as const,
                resolution: '720p',
                coefficient: 1,
              },
              {
                scenario: 'no_input_video' as const,
                resolution: '2k',
                coefficient: 1,
              },
              {
                scenario: 'input_video' as const,
                resolution: '2k',
                coefficient: 1,
              },
            ],
            weight: 1,
            enabled: true,
            is_default: true,
          },
        ],
      },
    ],
  }

  assert.deepEqual(
    sanitizeGlobalRuleForSystemResolutions(rules, ['720p', '1080p']),
    {
      providers: [
        {
          ...rules.providers[0],
          generation_limits: {
            ...rules.providers[0].generation_limits,
            allowed_resolutions: ['720p', '1080p'],
          },
          enhancement_strategies: [
            { target_resolution: '1080p', source_resolution: '720p' },
          ],
          models: [
            {
              ...rules.providers[0].models[0],
              supported_resolutions: ['720p'],
              pricing_rules: [
                {
                  scenario: 'no_input_video',
                  resolution: '720p',
                  coefficient: 1,
                },
                { scenario: 'input_video', resolution: '720p', coefficient: 1 },
              ],
            },
          ],
        },
      ],
    }
  )
})
