import assert from 'node:assert/strict'
import test from 'node:test'
import {
  mergeAssetItems,
  type AssetListItem,
} from './types.ts'
import type { VideoDraft, VideoGenerationTask } from '@/services/api/videoApi'

function task(id: string, createdAt: number): AssetListItem {
  return {
    kind: 'task',
    id: `task-${id}`,
    createdAt,
    task: { id, created_at: createdAt } as VideoGenerationTask,
  }
}

function draft(id: string, createdAt: number): AssetListItem {
  return {
    kind: 'draft',
    id: `draft-${id}`,
    createdAt,
    draft: { id, created_at: createdAt } as VideoDraft,
  }
}

test('mergeAssetItems newest：只放出不早于最旧已加载视频的草稿', () => {
  const items = mergeAssetItems({
    drafts: [draft('d1', 95), draft('d2', 70), draft('d3', 40)],
    tasks: [task('v1', 100), task('v2', 90), task('v3', 80)],
    sortOrder: 'newest',
    hasMoreTasks: true,
  })
  assert.deepEqual(
    items.map((item) => item.id),
    ['task-v1', 'draft-d1', 'task-v2', 'task-v3']
  )
})

test('mergeAssetItems newest：没有更多视频时放出剩余更早草稿', () => {
  const items = mergeAssetItems({
    drafts: [draft('d1', 95), draft('d2', 70)],
    tasks: [task('v1', 100), task('v2', 80)],
    sortOrder: 'newest',
    hasMoreTasks: false,
  })
  assert.deepEqual(
    items.map((item) => item.id),
    ['task-v1', 'draft-d1', 'task-v2', 'draft-d2']
  )
})

test('mergeAssetItems newest：视频还在加载且尚无任务时不提前放出草稿', () => {
  const items = mergeAssetItems({
    drafts: [draft('d1', 95)],
    tasks: [],
    sortOrder: 'newest',
    hasMoreTasks: true,
  })
  assert.deepEqual(items, [])
})
