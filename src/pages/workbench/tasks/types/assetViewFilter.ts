export type AssetViewFilter =
  | { kind: 'all' }
  | { kind: 'self' }
  | { kind: 'group'; groupPublicId: string; label: string }
  | { kind: 'user'; userPublicId: string; label: string }

export const defaultAssetViewFilter = (): AssetViewFilter => ({ kind: 'self' })

export function assetViewFilterKey(filter: AssetViewFilter): string {
  if (filter.kind === 'all') return 'all'
  if (filter.kind === 'self') return 'self'
  if (filter.kind === 'group') return `group:${filter.groupPublicId}`
  return `user:${filter.userPublicId}`
}

export function assetViewFilterLabel(filter: AssetViewFilter): string {
  if (filter.kind === 'all') return '所有'
  if (filter.kind === 'self') return '仅自己'
  return filter.label
}

/** 是否在卡片上展示创建人（非「仅自己」视角） */
export function shouldShowCreatorOnCards(filter: AssetViewFilter): boolean {
  return filter.kind !== 'self'
}

/** 赞踩仅在「仅自己」视角 */
export function shouldShowReactionControls(filter: AssetViewFilter): boolean {
  return filter.kind === 'self'
}

export type VideoListViewParams = {
  scope?: 'all' | 'self'
  group_public_id?: string
  user_public_id?: string
}

export function toVideoListViewParams(filter: AssetViewFilter): VideoListViewParams {
  if (filter.kind === 'group') {
    return { group_public_id: filter.groupPublicId }
  }
  if (filter.kind === 'user') {
    return { user_public_id: filter.userPublicId }
  }
  if (filter.kind === 'all') {
    return { scope: 'all' }
  }
  return { scope: 'self' }
}
