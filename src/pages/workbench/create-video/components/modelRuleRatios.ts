type ProviderRatioRules = {
  provider: { code: string }
  generation_limits: { allowed_ratios: string[] }
}

export function allowedRatiosForProvider(
  providers: ProviderRatioRules[],
  providerCode: string
): string[] {
  const normalizedProviderCode = providerCode.trim().toLowerCase()
  const provider = providers.find(
    (item) => item.provider.code.trim().toLowerCase() === normalizedProviderCode
  )
  if (!provider) return []

  return provider.generation_limits.allowed_ratios.reduce<string[]>(
    (result, ratio) => {
      const normalizedRatio = ratio.trim().toLowerCase()
      if (normalizedRatio && !result.includes(normalizedRatio)) {
        result.push(normalizedRatio)
      }
      return result
    },
    []
  )
}
