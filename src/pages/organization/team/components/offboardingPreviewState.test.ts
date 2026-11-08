import assert from 'node:assert/strict'
import test from 'node:test'
import {
  offboardingCleanupFailureDetails,
  offboardingPrimaryAction,
  offboardingPreviewErrorMessage,
  offboardingPreviewSummary,
} from './offboardingPreviewState.ts'

test('offboarding cleanup tolerates null failure details from older responses', () => {
  assert.deepEqual(offboardingCleanupFailureDetails(null), [])
  assert.deepEqual(offboardingCleanupFailureDetails(['storage unavailable']), [
    'storage unavailable',
  ])
})

test('offboarding primary action confirms an existing preview', () => {
  assert.equal(offboardingPrimaryAction(null), 'create')
  assert.equal(offboardingPrimaryAction({} as never), 'confirm')
})

test('offboarding preview maps server resource counts without recomputing them', () => {
  const rows = offboardingPreviewSummary({
    resource_counts: {
      video_tasks: 2,
      video_drafts: 1,
      enterprise_assets: 3,
      enterprise_dirs: 4,
      personal_assets: 5,
      protected_personal_assets: 7,
      personal_directories: 6,
    },
  } as never)
  assert.deepEqual(rows, [
    ['视频任务', 2],
    ['手动草稿', 1],
    ['企业素材', 3],
    ['企业目录', 4],
    ['个人素材清理', 5],
    ['个人素材保留', 7],
    ['个人目录清理', 6],
  ])
})

test('offboarding preview reports server conflict messages', () => {
  assert.equal(
    offboardingPreviewErrorMessage(new Error('接收人不具备资格')),
    '接收人不具备资格'
  )
})
