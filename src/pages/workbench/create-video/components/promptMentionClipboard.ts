/** 提示词剪贴板可移植引用：@[Image 1](image_1) / @[Video 1](video_1) / @[Audio 1](audio_1) */

const PORTABLE_MENTION_PATTERN =
  /@\[(Image|Video|Audio)\s+(\d+)\]\(\s*(image|video|audio)_(\d+)\s*\)/gi

/** 内部标签 → 可移植文本（复制用） */
export function mentionLabelToPortable(label: string) {
  const trimmed = label.trim()
  const image = /^(?:图片|图)(\d+)$/.exec(trimmed)
  if (image) return `@[Image ${image[1]}](image_${image[1]})`
  const video = /^视频(\d+)$/.exec(trimmed)
  if (video) return `@[Video ${video[1]}](video_${video[1]})`
  const audio = /^音频(\d+)$/.exec(trimmed)
  if (audio) return `@[Audio ${audio[1]}](audio_${audio[1]})`
  return `@${trimmed}`
}

/**
 * 可移植文本 → 内部 @图N / @视频N / @音频N。
 * 以展示序号（Image 2）为准，对应当前参考素材顺序中的第 N 项。
 */
export function portableMentionsToInternal(text: string) {
  if (!text) return text
  return text.replace(
    PORTABLE_MENTION_PATTERN,
    (_full, kind: string, displayIndex: string) => {
      const n = Number(displayIndex)
      if (!Number.isFinite(n) || n < 1) return ''
      const type = String(kind).toLowerCase()
      if (type === 'image') return `@图${n}`
      if (type === 'video') return `@视频${n}`
      if (type === 'audio') return `@音频${n}`
      return ''
    }
  )
}

/** 提取提示词中 @图N / @图片N 的首次出现顺序（1-based） */
export function extractImageMentionOrder(text: string) {
  if (!text) return [] as number[]
  const order: number[] = []
  const seen = new Set<number>()
  const pattern = /@(?:图片|图)(\d+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const n = Number(match[1])
    if (!Number.isFinite(n) || n < 1 || seen.has(n)) continue
    seen.add(n)
    order.push(n)
  }
  return order
}

/** 将编辑器 DOM（或选区克隆）序列化为可移植纯文本 */
export function htmlToPortableValue(root: HTMLElement) {
  let text = ''

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node.textContent ?? '').replace(/\u200b/g, '')
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    if (el.dataset.mention) {
      text += mentionLabelToPortable(el.dataset.mention)
      return
    }
    if (el.tagName === 'BR') {
      text += '\n'
      return
    }
    if (
      (el.tagName === 'DIV' || el.tagName === 'P') &&
      text &&
      !text.endsWith('\n')
    ) {
      text += '\n'
    }
    Array.from(el.childNodes).forEach(walk)
  }

  Array.from(root.childNodes).forEach(walk)
  return text.replace(/^\n+/, '')
}
