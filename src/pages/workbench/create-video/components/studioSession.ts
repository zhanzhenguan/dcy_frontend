/** 创作页操作态：存于 sessionStorage，刷新同标签页可恢复 */

import type { VideoGenerationTask } from '@/services/api/videoApi'

const STORAGE_PREFIX = 'great-etymology:create-video-studio'
const ACTIVE_SCOPE_KEY = '__active__'
const REUSE_PROMPT_KEY = 'great-etymology:create-reuse-prompt'
export const CREATE_REENTER_EVENT = 'great-etymology:create-reenter'

const terminalTaskStatuses = new Set([
  'succeeded',
  'failed',
  'cancelled',
  'expired',
])

export type StudioSessionPayload = {
  version: 1 | 2
  updatedAt: number
  draftId: string
  projectTitle: string
  currentStep: 1 | 2 | 3 | 4
  draftData: Record<string, unknown>
  /**
   * 是否有用户本地修改。
   * 草稿编辑：仅 dirty=true 时刷新才恢复 session；未改过刷新仍用服务端草稿。
   */
  dirty: boolean
  /** 进行中 / 刚完成的生成任务，刷新后继续展示与轮询 */
  activeTasks?: VideoGenerationTask[]
}

/** 新建用 `new`，编辑已有草稿用 draftId，避免互相覆盖 */
function storageKey(userId: string, scope: string) {
  return `${STORAGE_PREFIX}:${userId || 'anonymous'}:${scope || 'new'}`
}

function activePointerKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId || 'anonymous'}:${ACTIVE_SCOPE_KEY}`
}

function sessionScope(draftId: string) {
  return draftId.trim() ? draftId.trim() : 'new'
}

function setActiveScope(userId: string, scope: string) {
  try {
    window.sessionStorage.setItem(activePointerKey(userId), scope)
  } catch {
    /* ignore */
  }
}

function getActiveScope(userId: string) {
  try {
    return window.sessionStorage.getItem(activePointerKey(userId))
  } catch {
    return null
  }
}

function clearActiveScope(userId: string) {
  try {
    window.sessionStorage.removeItem(activePointerKey(userId))
  } catch {
    /* ignore */
  }
}

function isBrowserReload() {
  try {
    const nav = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming | undefined
    return nav?.type === 'reload'
  } catch {
    return false
  }
}

export function hasFinishedGenerationTasks(
  tasks: VideoGenerationTask[] | null | undefined
) {
  return Boolean(
    tasks &&
      tasks.length > 0 &&
      tasks.every((task) => terminalTaskStatuses.has(task.status))
  )
}

/** 资产页「复用提示」：仅暂存提示词，创作页消费后清空 */
export function stashReusePrompt(prompt: string) {
  const text = prompt.trim()
  if (!text || typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(REUSE_PROMPT_KEY, text)
  } catch {
    /* ignore */
  }
}

/** 读取并清除暂存的复用提示词 */
export function consumeReusePrompt(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const text = window.sessionStorage.getItem(REUSE_PROMPT_KEY)?.trim() || ''
    window.sessionStorage.removeItem(REUSE_PROMPT_KEY)
    return text || null
  } catch {
    return null
  }
}

/** 本轮已发起过生成（含进行中）——再进创建页应开新工程且不带旧 draftId */
export function hasGenerationAttempt(
  tasks: VideoGenerationTask[] | null | undefined
) {
  return Boolean(tasks && tasks.length > 0)
}

/** 保留工具栏操作配置（平台/语言/模型/参考模式/输出/数字人等），清空素材与脚本 */
export function stripSessionCreativeContent(
  draftData: Record<string, unknown>
): Record<string, unknown> {
  const { config, referenceMode, activeSuppTab, selectedHuman } = draftData
  return {
    referenceMode: referenceMode ?? 'all',
    firstFrame: null,
    lastFrame: null,
    activeSuppTab: activeSuppTab ?? 'video',
    sellingPoints: '',
    referenceVideos: [],
    productVideo: null,
    materials: [],
    activePreviewIndex: 0,
    selectedHuman: selectedHuman ?? null,
    scriptContent: '',
    customScriptContent: '',
    activeScriptMode: 'ai',
    selectedScriptTab: 'custom',
    scripts: [],
    scriptSummary: '',
    autoGenerateScripts: true,
    ...(config ? { config } : {}),
  }
}

/**
 * 再进创建：只留工具栏操作配置，强制 draftId 为空（不传旧草稿 id），并写回 session。
 * 保存草稿 / 生成后切到「我的项目」再回来都走此逻辑。
 */
export function resetCreateSessionKeepOperations(userId: string) {
  const session = loadActiveStudioSession(userId)
  if (!session) return null
  const next = {
    draftId: '',
    projectTitle: '',
    currentStep: 1 as const,
    draftData: stripSessionCreativeContent(session.draftData),
    activeTasks: [] as VideoGenerationTask[],
    dirty: true,
  }
  saveStudioSession(userId, next)
  return {
    version: 2 as const,
    updatedAt: Date.now(),
    ...next,
  }
}

/**
 * 无 URL draftId 进入创建页时的 session。
 * 路由切走再进（非刷新）→ 清空素材/脚本与 draftId，保留工具栏。
 * 浏览器刷新 → 完整恢复（含素材与任务）。
 * 注意：返回给页面的 draftId 由 bootstrap 强制为 ''；仅 URL 草稿编辑才带 id。
 */
export function resolveCreateEntrySession(
  userId: string
): StudioSessionPayload | null {
  const session = loadActiveStudioSession(userId)
  if (!session) return null
  if (!isBrowserReload()) {
    return resetCreateSessionKeepOperations(userId)
  }
  return session
}

export function loadStudioSession(
  userId: string,
  draftId = ''
): StudioSessionPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(
      storageKey(userId, sessionScope(draftId))
    )
    if (!raw) return null
    const parsed = JSON.parse(raw) as StudioSessionPayload
    if (
      (parsed?.version !== 1 && parsed?.version !== 2) ||
      !parsed.draftData
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** 创建页（无 URL draftId）优先恢复最近一次操作的 session */
export function loadActiveStudioSession(
  userId: string
): StudioSessionPayload | null {
  if (typeof window === 'undefined') return null
  const active = getActiveScope(userId)
  if (active) {
    const scoped = loadStudioSession(
      userId,
      active === 'new' ? '' : active
    )
    if (scoped) return scoped
  }
  return loadStudioSession(userId, '')
}

export function saveStudioSession(
  userId: string,
  payload: Omit<StudioSessionPayload, 'version' | 'updatedAt'>
) {
  if (typeof window === 'undefined') return
  try {
    const scope = sessionScope(payload.draftId)
    const next: StudioSessionPayload = {
      version: 2,
      updatedAt: Date.now(),
      ...payload,
    }
    window.sessionStorage.setItem(
      storageKey(userId, scope),
      JSON.stringify(next)
    )
    setActiveScope(userId, scope)
    // 新建首次落库拿到 draftId 后，把 new 槽同步一份，避免短暂空窗
    if (scope !== 'new') {
      window.sessionStorage.setItem(
        storageKey(userId, 'new'),
        JSON.stringify(next)
      )
    }
  } catch {
    // quota / private mode — ignore
  }
}

export function clearStudioSession(userId: string, draftId = '') {
  if (typeof window === 'undefined') return
  try {
    const scope = sessionScope(draftId)
    window.sessionStorage.removeItem(storageKey(userId, scope))
    if (scope === 'new') {
      window.sessionStorage.removeItem(storageKey(userId, 'new'))
    }
    const active = getActiveScope(userId)
    if (!active || active === scope) {
      clearActiveScope(userId)
    }
  } catch {
    /* empty */
  }
}

/** 清空当前用户全部创作 session（继续新建工程时） */
export function clearAllStudioSessions(userId: string) {
  if (typeof window === 'undefined') return
  try {
    const prefix = `${STORAGE_PREFIX}:${userId || 'anonymous'}:`
    const keys: string[] = []
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    keys.forEach((key) => window.sessionStorage.removeItem(key))
  } catch {
    /* empty */
  }
}
