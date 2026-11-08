import type { OffboardingPreview } from '@/services/api/tenantApi'

export function offboardingCleanupFailureDetails(
  details: readonly string[] | null | undefined
) {
  return details ?? []
}

export function offboardingPrimaryAction(preview: OffboardingPreview | null) {
  return preview ? 'confirm' : 'create'
}

export function offboardingPreviewSummary(preview: OffboardingPreview) {
  const counts = preview.resource_counts
  return [
    ['视频任务', counts.video_tasks],
    ['手动草稿', counts.video_drafts],
    ['企业素材', counts.enterprise_assets],
    ['企业目录', counts.enterprise_dirs],
    ['个人素材清理', counts.personal_assets],
    ['个人素材保留', counts.protected_personal_assets],
    ['个人目录清理', counts.personal_directories],
  ] as const
}

export function offboardingPreviewErrorMessage(
  error: unknown,
  fallback = '无法创建离职交接预览'
) {
  return error instanceof Error && error.message ? error.message : fallback
}
