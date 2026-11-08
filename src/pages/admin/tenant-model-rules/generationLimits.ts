import type { ProviderGenerationLimits } from '@/services/api/tenantModelRuleApi'

export function normalizeGenerationLimits(
  limits: Partial<ProviderGenerationLimits> | null | undefined
): ProviderGenerationLimits {
  return {
    generation_duration_min: limits?.generation_duration_min ?? 0,
    generation_duration_max: limits?.generation_duration_max ?? 0,
    reference_image_max_count: limits?.reference_image_max_count ?? 0,
    reference_image_max_mb: limits?.reference_image_max_mb ?? 0,
    reference_video_max_count: limits?.reference_video_max_count ?? 0,
    reference_video_duration_min: limits?.reference_video_duration_min ?? 0,
    reference_video_duration_max: limits?.reference_video_duration_max ?? 0,
    reference_video_total_duration_max:
      limits?.reference_video_total_duration_max ?? 0,
    allowed_ratios: Array.isArray(limits?.allowed_ratios)
      ? limits.allowed_ratios
      : [],
    allowed_resolutions: Array.isArray(limits?.allowed_resolutions)
      ? limits.allowed_resolutions
      : [],
  }
}
