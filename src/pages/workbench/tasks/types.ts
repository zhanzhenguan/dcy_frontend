import type { VideoDraft, VideoGenerationTask } from '@/services/api/videoApi'

export type AssetListItem =
  | {
      kind: 'task'
      id: string
      createdAt: number
      task: VideoGenerationTask
    }
  | {
      kind: 'draft'
      id: string
      createdAt: number
      draft: VideoDraft
    }

export function toTaskAssetItem(task: VideoGenerationTask): AssetListItem {
  return {
    kind: 'task',
    id: `task-${task.id}`,
    createdAt: task.created_at,
    task,
  }
}

export function toDraftAssetItem(draft: VideoDraft): AssetListItem {
  return {
    kind: 'draft',
    id: `draft-${draft.id}`,
    createdAt: draft.created_at,
    draft,
  }
}

export function sortAssetItemsDesc(items: AssetListItem[]) {
  return [...items].sort((a, b) => b.createdAt - a.createdAt)
}

export function sortAssetItemsAsc(items: AssetListItem[]) {
  return [...items].sort((a, b) => a.createdAt - b.createdAt)
}

/**
 * 合并草稿与分页视频：草稿只进入「当前已加载视频」的时间窗口，
 * 避免全量草稿插到尚未加载的更早/更晚视频前面。
 */
export function mergeAssetItems(params: {
  drafts: AssetListItem[]
  tasks: AssetListItem[]
  sortOrder: 'newest' | 'oldest'
  /** 视频是否还有下一页 */
  hasMoreTasks: boolean
}): AssetListItem[] {
  const { drafts, tasks, sortOrder, hasMoreTasks } = params

  if (tasks.length === 0) {
    // 视频仍在分页中：暂不放出草稿，防止草稿单独占满可视区
    if (hasMoreTasks) return []
    return sortOrder === 'oldest'
      ? sortAssetItemsAsc(drafts)
      : sortAssetItemsDesc(drafts)
  }

  let visibleDrafts = drafts
  if (hasMoreTasks) {
    if (sortOrder === 'newest') {
      const oldestLoaded = Math.min(...tasks.map((item) => item.createdAt))
      visibleDrafts = drafts.filter((item) => item.createdAt >= oldestLoaded)
    } else {
      const newestLoaded = Math.max(...tasks.map((item) => item.createdAt))
      visibleDrafts = drafts.filter((item) => item.createdAt <= newestLoaded)
    }
  }

  const merged = [...visibleDrafts, ...tasks]
  return sortOrder === 'oldest'
    ? sortAssetItemsAsc(merged)
    : sortAssetItemsDesc(merged)
}

