import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProviderGenerationLimits } from '@/services/api/tenantModelRuleApi'
import { normalizeGenerationLimits } from './generationLimits'

const fields: {
  key: Exclude<
    keyof ProviderGenerationLimits,
    'allowed_ratios' | 'allowed_resolutions'
  >
  label: string
}[] = [
  { key: 'generation_duration_min', label: '生成最小时长（秒）' },
  { key: 'generation_duration_max', label: '生成最大时长（秒）' },
  { key: 'reference_image_max_count', label: '参考图最多张数' },
  { key: 'reference_image_max_mb', label: '单张参考图最大 MB' },
  { key: 'reference_video_max_count', label: '参考视频最多个数' },
  { key: 'reference_video_duration_min', label: '单个参考视频最小时长（秒）' },
  { key: 'reference_video_duration_max', label: '单个参考视频最大时长（秒）' },
  {
    key: 'reference_video_total_duration_max',
    label: '参考视频合计最大时长（秒）',
  },
]

export function GenerationLimitsEditor({
  limits,
  ratios,
  resolutions,
  onChange,
}: {
  limits: ProviderGenerationLimits
  ratios: string[]
  resolutions: string[]
  onChange: (next: ProviderGenerationLimits) => void
}) {
  const normalizedLimits = normalizeGenerationLimits(limits)

  return (
    <section className='space-y-3 rounded-md border p-3'>
      <div className='text-sm font-medium'>视频生成限制</div>
      <div className='grid gap-3 sm:grid-cols-2'>
        {fields.map(({ key, label }) => (
          <div key={key} className='space-y-1.5'>
            <Label className='text-xs'>{label}</Label>
            <Input
              type='number'
              min={0}
              value={normalizedLimits[key]}
              onChange={(event) =>
                onChange({
                  ...normalizedLimits,
                  [key]: Math.max(0, Number(event.target.value) || 0),
                })
              }
            />
          </div>
        ))}
      </div>
      <div className='space-y-2'>
        <Label className='text-xs'>允许的视频比例</Label>
        <div className='flex flex-wrap gap-x-4 gap-y-2'>
          {ratios.map((ratio) => (
            <label key={ratio} className='flex items-center gap-2 text-sm'>
              <Checkbox
                checked={normalizedLimits.allowed_ratios.includes(ratio)}
                onCheckedChange={(checked) =>
                  onChange({
                    ...normalizedLimits,
                    allowed_ratios: checked
                      ? [...normalizedLimits.allowed_ratios, ratio]
                      : normalizedLimits.allowed_ratios.filter(
                          (item) => item !== ratio
                        ),
                  })
                }
              />
              {ratio}
            </label>
          ))}
        </div>
      </div>
      <div className='space-y-2'>
        <Label className='text-xs'>支持的分辨率</Label>
        <div className='flex flex-wrap gap-x-4 gap-y-2'>
          {resolutions.map((resolution) => (
            <label key={resolution} className='flex items-center gap-2 text-sm'>
              <Checkbox
                checked={normalizedLimits.allowed_resolutions.includes(
                  resolution
                )}
                onCheckedChange={(checked) =>
                  onChange({
                    ...normalizedLimits,
                    allowed_resolutions: checked
                      ? [...normalizedLimits.allowed_resolutions, resolution]
                      : normalizedLimits.allowed_resolutions.filter(
                          (item) => item !== resolution
                        ),
                  })
                }
              />
              {resolution}
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}
