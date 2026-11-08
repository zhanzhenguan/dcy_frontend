/** 参考图展示名：图1、图2…（仅前端 / @ 引用用，按已占用编号顺延；不影响 OSS 文件名） */
export function allocateReferenceImageNames(
  existing: Array<{ type?: string; name: string }>,
  count: number
) {
  const names: string[] = []
  const used = new Set<number>()
  for (const item of existing) {
    if (item.type && item.type !== 'image') continue
    const matched = /^图(\d+)$/.exec(item.name.trim())
    if (matched) used.add(Number(matched[1]))
  }
  let n = 1
  while (names.length < count) {
    while (used.has(n)) n += 1
    names.push(`图${n}`)
    used.add(n)
    n += 1
  }
  return names
}

export type MentionLabelRename = { from: string; to: string }

/**
 * 按列表顺序重编号展示名（图1… / 视频1…），并返回旧名→新名映射，
 * 供提示词 @ 引用同步改写。
 */
export function renumberReferenceNames<T extends { name: string }>(
  items: T[],
  kind: 'image' | 'video'
): { items: T[]; renames: MentionLabelRename[] } {
  const prefix = kind === 'image' ? '图' : '视频'
  const pattern = kind === 'image' ? /^图\d+$/ : /^视频\d+$/
  const renames: MentionLabelRename[] = []
  let changed = false
  const next = items.map((item, index) => {
    const newName = `${prefix}${index + 1}`
    const trimmed = item.name.trim()
    const oldName = pattern.test(trimmed) ? trimmed : newName
    if (oldName !== newName) {
      renames.push({ from: oldName, to: newName })
    }
    if (item.name === newName) return item
    changed = true
    return { ...item, name: newName }
  })
  return { items: changed ? next : items, renames }
}

/**
 * 按提示词中 @图N 首次出现顺序重排参考图。
 * 已是 1…k 顺序则返回 null（无需调整）。
 */
export function planMaterialsAlignToMentionOrder<T extends { name: string }>(
  materials: T[],
  mentionOrder: number[]
): { items: T[]; renames: MentionLabelRename[] } | null {
  if (materials.length === 0 || mentionOrder.length === 0) return null

  const validOrder: number[] = []
  const seen = new Set<number>()
  for (const index of mentionOrder) {
    if (index < 1 || index > materials.length || seen.has(index)) continue
    seen.add(index)
    validOrder.push(index)
  }
  if (validOrder.length === 0) return null
  if (validOrder.every((n, i) => n === i + 1)) return null

  const head = validOrder.map((n) => materials[n - 1])
  const tail = materials.filter((_, i) => !seen.has(i + 1))
  const moved = [...head, ...tail]
  if (moved.every((item, i) => item === materials[i])) return null

  return renumberReferenceNames(moved, 'image')
}

/** 从提示词中移除已删除参考图的 @ 引用 */
export function stripMentionTokens(text: string, labels: string[]) {
  if (!text || labels.length === 0) return text
  let next = text
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    next = next.replace(new RegExp(`@${escaped}\\u200b?`, 'g'), '')
  }
  return next.replace(/[^\S\n]{2,}/g, ' ').replace(/ *\n */g, '\n')
}

/**
 * 将提示词中的 @旧标签 改写为 @新标签（两阶段替换，避免互换时互相覆盖）。
 * 图N 会同步处理 图片N 别名。
 */
export function remapMentionTokens(
  text: string,
  renames: MentionLabelRename[]
) {
  if (!text || renames.length === 0) return text

  const expanded: MentionLabelRename[] = []
  for (const rename of renames) {
    if (!rename.from || !rename.to || rename.from === rename.to) continue
    expanded.push(rename)
    if (/^图\d+$/.test(rename.from) && /^图\d+$/.test(rename.to)) {
      expanded.push({
        from: rename.from.replace(/^图/, '图片'),
        to: rename.to.replace(/^图/, '图片'),
      })
    }
  }
  if (expanded.length === 0) return text

  let next = text
  const staged = expanded.map((rename, index) => ({
    ...rename,
    token: `__MENTION_REMAP_${index}__`,
  }))

  for (const rename of staged) {
    const escaped = rename.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    next = next.replace(
      new RegExp(`@${escaped}(\\u200b?)`, 'g'),
      `@${rename.token}$1`
    )
  }
  for (const rename of staged) {
    next = next.split(`@${rename.token}`).join(`@${rename.to}`)
  }
  return next
}

/** 当前仍可用的 @ 标签（图N ↔ 图片N 互认） */
export function buildValidMentionLabels(
  assets: Array<{ name: string; kind: string }>
) {
  const valid = new Set<string>()
  for (const asset of assets) {
    const name = asset.name.trim()
    if (!name) continue
    valid.add(name)
    if (asset.kind === 'image') {
      if (/^图\d+$/.test(name)) valid.add(name.replace(/^图/, '图片'))
      if (/^图片\d+$/.test(name)) valid.add(name.replace(/^图片/, '图'))
    }
  }
  return valid
}

/** 去掉提示词里已无对应素材的 @图N / @图片N / @视频N / @音频N */
export function stripUnresolvedMentionTokens(
  text: string,
  assets: Array<{ name: string; kind: string }>
) {
  if (!text) return text
  const valid = buildValidMentionLabels(assets)
  const next = text.replace(
    /@((?:图片|图|视频|音频)\d+)\u200b?/g,
    (_full, label: string) => (valid.has(label) ? `@${label}` : '')
  )
  return next.replace(/[^\S\n]{2,}/g, ' ').replace(/ *\n */g, '\n')
}

/** 列出提示词中无法对应到当前素材的 @ 标签 */
export function listUnresolvedMentionLabels(
  text: string,
  assets: Array<{ name: string; kind: string }>
) {
  if (!text) return [] as string[]
  const valid = buildValidMentionLabels(assets)
  const unresolved: string[] = []
  const seen = new Set<string>()
  const pattern = /@((?:图片|图|视频|音频)\d+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const label = match[1]
    if (valid.has(label) || seen.has(label)) continue
    seen.add(label)
    unresolved.push(label)
  }
  return unresolved
}

export function mentionLabelsForAsset(name: string, kind: string) {
  const label = name.trim()
  if (!label) return [] as string[]
  if (kind === 'image') {
    if (/^图\d+$/.test(label)) {
      return [label, label.replace(/^图/, '图片')]
    }
    if (/^图片\d+$/.test(label)) {
      return [label, label.replace(/^图片/, '图')]
    }
  }
  return [label]
}
