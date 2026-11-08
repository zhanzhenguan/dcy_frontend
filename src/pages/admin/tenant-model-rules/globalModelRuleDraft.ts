import type { GlobalModelRule } from '@/services/api/tenantModelRuleApi'

export function applyAllowedResolutions(
  provider: GlobalModelRule['providers'][number],
  allowedResolutions: string[]
): GlobalModelRule['providers'][number] {
  return {
    ...provider,
    generation_limits: {
      ...provider.generation_limits,
      allowed_resolutions: allowedResolutions,
    },
  }
}

export function sanitizeGlobalRuleForSystemResolutions(
  rules: GlobalModelRule,
  resolutions: string[]
): GlobalModelRule {
  const normalize = (value: string) => value.trim().toLowerCase()
  const systemResolutions = resolutions.map(normalize).filter(Boolean)
  const allowed = new Set(systemResolutions)

  return {
    providers: rules.providers
      .map((provider) => ({
        ...provider,
        generation_limits: {
          ...provider.generation_limits,
          allowed_resolutions: systemResolutions.filter((resolution) =>
            (provider.generation_limits.allowed_resolutions?.length
              ? provider.generation_limits.allowed_resolutions
              : provider.models.flatMap((model) => model.supported_resolutions)
            )
              .map(normalize)
              .includes(resolution)
          ),
        },
        enhancement_strategies: provider.enhancement_strategies
          .map((strategy) => ({
            target_resolution: normalize(strategy.target_resolution),
            source_resolution: normalize(strategy.source_resolution),
          }))
          .filter(
            (strategy) =>
              allowed.has(strategy.target_resolution) &&
              allowed.has(strategy.source_resolution) &&
              systemResolutions.indexOf(strategy.source_resolution) <
                systemResolutions.indexOf(strategy.target_resolution)
          ),
        models: provider.models.map((model) => {
          const supportedResolutions = model.supported_resolutions
            .map(normalize)
            .filter(
              (resolution, index, values) =>
                allowed.has(resolution) && values.indexOf(resolution) === index
            )
          const supported = new Set(supportedResolutions)

          return {
            ...model,
            supported_resolutions: supportedResolutions,
            pricing_rules: model.pricing_rules
              .map((rule) => ({
                ...rule,
                resolution: normalize(rule.resolution),
              }))
              .filter((rule) => supported.has(rule.resolution)),
          }
        }),
      }))
      .map((provider) =>
        applyAllowedResolutions(
          provider,
          provider.generation_limits.allowed_resolutions
        )
      ),
  }
}
