type ProviderResolutionRules = {
  provider: { code: string }
  generation_limits: { allowed_resolutions: string[] }
}

export function allowedResolutionsForProvider(
  providers: ProviderResolutionRules[],
  providerCode: string
): string[] {
  const normalizedProviderCode = providerCode.trim().toLowerCase()
  const provider = providers.find(
    (item) => item.provider.code.trim().toLowerCase() === normalizedProviderCode
  )
  if (!provider) return []

  return provider.generation_limits.allowed_resolutions.reduce<string[]>(
    (result, resolution) => {
      const normalizedResolution = resolution.trim().toLowerCase()
      if (normalizedResolution && !result.includes(normalizedResolution)) {
        result.push(normalizedResolution)
      }
      return result
    },
    []
  )
}
