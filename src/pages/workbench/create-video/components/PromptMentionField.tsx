import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  forwardRef,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/utils'
import { MentionImagePicker } from './MentionImagePicker'
import type { MentionAsset } from './MentionAssetsPanel'
import {
  extractImageMentionOrder,
  htmlToPortableValue,
  portableMentionsToInternal,
} from './promptMentionClipboard'

/** 匹配 @图1 / @图片1 / @视频1 / @音频1 */
const MENTION_PATTERN = /@((?:图片|图|视频|音频)\d+)/g

export type PromptMentionImage = MentionAsset

export type PromptMentionFieldHandle = {
  focus: () => void
  /** 插入 @图N / @视频N / @音频N；若刚输入 @ 触发选择，会替换触发用的 @ */
  insertMention: (asset: MentionAsset) => void
}

type PromptMentionFieldProps = {
  value: string
  onChange: (value: string) => void
  /** @ 选择列表可用素材（不含数字人） */
  images: MentionAsset[]
  /** 解析提示词里 @图片N 缩略图；默认同 images。可选附带数字人 avatar */
  resolveImages?: MentionAsset[]
  /** 粘贴后按提示词图片顺序对齐参考图，返回最终写入的文案 */
  onResolvePastedPrompt?: (nextValue: string) => string
  placeholder?: string
  className?: string
  disabled?: boolean
  onFocus?: () => void
  onBlur?: () => void
}

type MentionMenuState = {
  open: boolean
  top: number
  left: number
  /** 输入 @ 触发时的文本偏移；替换无效引用时为 -1 */
  triggerIndex: number
  /** 点击无效引用替换时的文本偏移 */
  replaceOffset: number | null
  replaceLabel: string | null
}

const EMPTY_MENU: MentionMenuState = {
  open: false,
  top: 0,
  left: 0,
  triggerIndex: -1,
  replaceOffset: null,
  replaceLabel: null,
}

function resolveMentionAsset(label: string, assets: MentionAsset[]) {
  const byName = assets.find((item) => item.name === label)
  if (byName) return byName

  const legacy = /^图片(\d+)$/.exec(label)
  if (legacy) {
    const images = assets.filter((item) => item.kind === 'image')
    const short = `图${legacy[1]}`
    const long = `图片${legacy[1]}`
    const exact = images.find(
      (item) => item.name === short || item.name === long
    )
    if (exact) return exact
    return images[Number(legacy[1]) - 1] ?? null
  }

  const imageMatch = /^图(\d+)$/.exec(label)
  if (imageMatch) {
    const images = assets.filter((item) => item.kind === 'image')
    const exact = images.find((item) => item.name === `图${imageMatch[1]}`)
    if (exact) return exact
    return images[Number(imageMatch[1]) - 1] ?? null
  }

  const videoMatch = /^视频(\d+)$/.exec(label)
  if (videoMatch) {
    const videos = assets.filter((item) => item.kind === 'video')
    const exact = videos.find((item) => item.name === `视频${videoMatch[1]}`)
    if (exact) return exact
    return videos[Number(videoMatch[1]) - 1] ?? null
  }

  const audioMatch = /^音频(\d+)$/.exec(label)
  if (audioMatch) {
    const audios = assets.filter((item) => item.kind === 'audio')
    const exact = audios.find((item) => item.name === `音频${audioMatch[1]}`)
    if (exact) return exact
    return audios[Number(audioMatch[1]) - 1] ?? null
  }

  return null
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.ceil(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function resolveVideoDurationSeconds(asset: MentionAsset) {
  if (typeof asset.duration === 'number' && Number.isFinite(asset.duration)) {
    return Math.max(1, Math.round(asset.duration))
  }
  // 无时长时回退 15 秒，展示为 00:15
  return 15
}

function imageChipHtml(label: string, url: string | null) {
  const safeLabel = escapeHtml(label)
  const thumb = url
    ? `<img src="${escapeHtml(url)}" alt="" width="18" height="18" style="width:18px;height:18px;border-radius:4px;object-fit:cover;display:block" draggable="false" />`
    : `<span style="width:18px;height:18px;border-radius:4px;background:transparent;display:block;border:1px solid color-mix(in oklab, var(--foreground) 15%, transparent)"></span>`

  return (
    `<span contenteditable="false" data-mention="${safeLabel}" data-kind="image" class="prompt-mention-chip">` +
    `<span class="prompt-mention-chip__thumb">${thumb}</span>` +
    `<span class="prompt-mention-chip__label">${safeLabel}</span>` +
    `</span>\u200b`
  )
}

function unresolvedChipHtml(label: string, kind: string) {
  const safeLabel = escapeHtml(label)
  return (
    `<span contenteditable="false" data-mention="${safeLabel}" data-kind="${escapeHtml(kind)}" data-unresolved="true" class="prompt-mention-chip prompt-mention-chip--unresolved" title="素材不存在，点击重新选择">` +
    `<span class="prompt-mention-chip__label">@${safeLabel}</span>` +
    `</span>\u200b`
  )
}

function audioChipHtml(label: string) {
  const safeLabel = escapeHtml(label)
  return (
    `<span contenteditable="false" data-mention="${safeLabel}" data-kind="audio" class="prompt-mention-chip">` +
    `<span class="prompt-mention-chip__thumb" style="display:flex;align-items:center;justify-content:center;font-size:10px;background:color-mix(in oklab, var(--foreground) 8%, transparent)">♪</span>` +
    `<span class="prompt-mention-chip__label">${safeLabel}</span>` +
    `</span>\u200b`
  )
}

const CHIP_THUMB_STYLE =
  'width:18px;height:18px;border-radius:4px;object-fit:cover;display:block;pointer-events:none'

/** 视频：正文胶囊用首帧缩略图，大图在 hover 浮层展示 */
function videoChipHtml(label: string, asset: MentionAsset) {
  const safeLabel = escapeHtml(label)
  const duration = resolveVideoDurationSeconds(asset)
  const poster = asset.posterUrl || ''
  const url = asset.url || ''
  // 有封面图用 img；否则用 video 元数据画第一帧（#t=0.001 促发部分浏览器出帧）
  const chipThumb = poster
    ? `<img src="${escapeHtml(poster)}" alt="" width="18" height="18" style="${CHIP_THUMB_STYLE}" draggable="false" />`
    : url
      ? `<video src="${escapeHtml(url)}#t=0.001" muted playsinline preload="metadata" width="18" height="18" style="${CHIP_THUMB_STYLE}"></video>`
      : `<span style="width:18px;height:18px;border-radius:4px;display:flex;align-items:center;justify-content:center;background:color-mix(in oklab, var(--foreground) 10%, transparent);font-size:8px">▶</span>`

  return (
    `<span contenteditable="false" data-mention="${safeLabel}" data-kind="video" data-duration="${duration}" data-url="${escapeHtml(url)}" data-poster="${escapeHtml(poster)}" class="prompt-mention-chip">` +
    `<span class="prompt-mention-chip__thumb">${chipThumb}</span>` +
    `<span class="prompt-mention-chip__label">${safeLabel}</span>` +
    `</span>\u200b`
  )
}

function mentionHtml(label: string, asset: MentionAsset | null) {
  if (!asset) {
    const kind = /^(?:图片|图)/.test(label)
      ? 'image'
      : /^视频/.test(label)
        ? 'video'
        : /^音频/.test(label)
          ? 'audio'
          : 'image'
    return unresolvedChipHtml(label, kind)
  }
  if (asset.kind === 'image') {
    return imageChipHtml(label, asset.url ?? null)
  }
  if (asset.kind === 'audio') {
    return audioChipHtml(label)
  }
  return videoChipHtml(label, asset)
}

function valueToHtml(value: string, assets: MentionAsset[]) {
  if (!value) return ''
  let html = ''
  let lastIndex = 0
  const pattern = new RegExp(MENTION_PATTERN.source, 'g')
  let match: RegExpExecArray | null

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      html += escapeHtml(value.slice(lastIndex, match.index)).replace(
        /\n/g,
        '<br>'
      )
    }
    const label = match[1]
    const asset = resolveMentionAsset(label, assets)
    html += mentionHtml(label, asset)
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < value.length) {
    html += escapeHtml(value.slice(lastIndex)).replace(/\n/g, '<br>')
  }

  return html
}

function htmlToValue(root: HTMLElement) {
  let text = ''

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node.textContent ?? '').replace(/\u200b/g, '')
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    if (el.dataset.mention) {
      text += `@${el.dataset.mention}`
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

function getCaretTextOffset(root: HTMLElement): number | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer)) return null

  const pre = range.cloneRange()
  pre.selectNodeContents(root)
  pre.setEnd(range.startContainer, range.startOffset)
  const probe = document.createElement('div')
  probe.appendChild(pre.cloneContents())
  return htmlToValue(probe).length
}

function getSelectionTextOffsets(
  root: HTMLElement
): { start: number; end: number } | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null

  const toOffset = (container: Node, offset: number) => {
    const pre = document.createRange()
    pre.selectNodeContents(root)
    pre.setEnd(container, offset)
    const probe = document.createElement('div')
    probe.appendChild(pre.cloneContents())
    return htmlToValue(probe).length
  }

  const start = toOffset(range.startContainer, range.startOffset)
  const end = toOffset(range.endContainer, range.endOffset)
  return start <= end ? { start, end } : { start: end, end: start }
}

function setCaretAtTextOffset(root: HTMLElement, targetOffset: number) {
  const selection = window.getSelection()
  if (!selection) return

  let remaining = Math.max(0, targetOffset)
  let placed = false

  const place = (node: Node, offset: number) => {
    const range = document.createRange()
    range.setStart(node, offset)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    placed = true
  }

  const walk = (node: Node): boolean => {
    if (placed) return true
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').replace(/\u200b/g, '')
      if (remaining <= text.length) {
        // 映射回含零宽字符的实际偏移
        const raw = node.textContent ?? ''
        let visible = 0
        let rawIndex = 0
        while (rawIndex < raw.length && visible < remaining) {
          if (raw[rawIndex] !== '\u200b') visible += 1
          rawIndex += 1
        }
        place(node, rawIndex)
        return true
      }
      remaining -= text.length
      return false
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return false
    const el = node as HTMLElement
    if (el.dataset.mention) {
      const token = `@${el.dataset.mention}`
      if (remaining <= token.length) {
        // 落在胶囊上：放在胶囊后
        const parent = el.parentNode
        if (parent) {
          place(parent, Array.from(parent.childNodes).indexOf(el) + 1)
        }
        return true
      }
      remaining -= token.length
      return false
    }
    if (el.tagName === 'BR') {
      if (remaining <= 1) {
        const parent = el.parentNode
        if (parent) {
          place(parent, Array.from(parent.childNodes).indexOf(el) + 1)
        }
        return true
      }
      remaining -= 1
      return false
    }
    for (const child of Array.from(el.childNodes)) {
      if (walk(child)) return true
    }
    return false
  }

  for (const child of Array.from(root.childNodes)) {
    if (walk(child)) break
  }
  if (!placed) {
    const range = document.createRange()
    range.selectNodeContents(root)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

function getCaretClientRect(): DOMRect | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0).cloneRange()
  range.collapse(true)
  const rects = range.getClientRects()
  if (rects.length > 0) return rects[0]
  const rect = range.getBoundingClientRect()
  if (rect.width || rect.height || rect.top || rect.left) return rect
  return null
}

function findAtTriggerIndex(text: string, caret: number): number | null {
  const before = text.slice(0, caret)
  const atIndex = before.lastIndexOf('@')
  if (atIndex < 0) return null

  const prev = atIndex > 0 ? before[atIndex - 1] : ''
  if (prev && /[A-Za-z0-9_]/.test(prev)) return null

  const query = before.slice(atIndex + 1)
  if (/[\s\n]/.test(query)) return null
  if (/^(?:图片|图|视频|音频)\d+$/.test(query)) return null
  return atIndex
}

/** 提示词输入：图片/视频正文仅胶囊；视频 hover 浮层预览并倒计时，移出即隐藏 */
export const PromptMentionField = forwardRef<
  PromptMentionFieldHandle,
  PromptMentionFieldProps
>(function PromptMentionField(
  {
    value,
    onChange,
    images,
    resolveImages,
    onResolvePastedPrompt,
    placeholder,
    className,
    disabled,
    onFocus,
    onBlur,
  },
  ref
) {
  const assetsForResolve = resolveImages ?? images
  const editorRef = useRef<HTMLDivElement>(null)
  const lastValueRef = useRef(value)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const skipBlurCloseRef = useRef(false)
  const videoTipRef = useRef<HTMLDivElement | null>(null)
  const videoCountdownRef = useRef<{
    label: string
    timer: number
    remaining: number
    total: number
  } | null>(null)
  const [menu, setMenu] = useState<MentionMenuState>(EMPTY_MENU)

  const closeMenu = useCallback(() => {
    setMenu((prev) => (prev.open ? { ...EMPTY_MENU } : prev))
  }, [])

  const syncEditorHtml = useCallback(
    (nextValue: string) => {
      const editor = editorRef.current
      if (!editor) return
      const nextHtml = valueToHtml(nextValue, assetsForResolve)
      if (editor.innerHTML !== nextHtml) {
        editor.innerHTML = nextHtml
      }
      lastValueRef.current = nextValue
    },
    [assetsForResolve]
  )

  const placeCaretAtEnd = () => {
    const editor = editorRef.current
    if (!editor) return
    const selection = window.getSelection()
    if (!selection) return
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const replaceMentionAt = useCallback(
    (asset: MentionAsset, offset: number, oldLabel: string) => {
      const editor = editorRef.current
      if (!editor) return
      const current = htmlToValue(editor)
      const oldToken = `@${oldLabel}`
      if (current.slice(offset, offset + oldToken.length) !== oldToken) {
        // 回退：替换首个同名无效引用
        const fallback = current.indexOf(oldToken)
        if (fallback < 0) return
        const label = asset.name.trim() || oldLabel
        const next = `${current.slice(0, fallback)}@${label}${current.slice(fallback + oldToken.length)}`
        syncEditorHtml(next)
        onChange(next)
        closeMenu()
        queueMicrotask(() => {
          editor.focus()
          setCaretAtTextOffset(editor, fallback + label.length + 1)
        })
        return
      }
      const label = asset.name.trim() || oldLabel
      const next = `${current.slice(0, offset)}@${label}${current.slice(offset + oldToken.length)}`
      syncEditorHtml(next)
      onChange(next)
      closeMenu()
      queueMicrotask(() => {
        editor.focus()
        setCaretAtTextOffset(editor, offset + label.length + 1)
      })
    },
    [closeMenu, onChange, syncEditorHtml]
  )

  const insertMentionAt = useCallback(
    (asset: MentionAsset, triggerIndex: number | null) => {
      const editor = editorRef.current
      if (!editor) return
      const label = asset.name.trim() || '图1'
      const token = `@${label}`
      const current = htmlToValue(editor)
      let next: string

      if (triggerIndex != null && triggerIndex >= 0) {
        const caret = getCaretTextOffset(editor) ?? current.length
        const before = current.slice(0, triggerIndex)
        const after = current.slice(Math.max(caret, triggerIndex + 1))
        const needsSpaceBefore =
          before.length > 0 && !/\s$/.test(before) && !before.endsWith('\n')
        next = `${before}${needsSpaceBefore ? ' ' : ''}${token} ${after.replace(/^\s*/, '')}`
      } else {
        const needsSpace =
          current.length > 0 && !/\s$/.test(current) && !current.endsWith('\n')
        next = `${current}${needsSpace ? ' ' : ''}${token} `
      }

      syncEditorHtml(next)
      onChange(next)
      closeMenu()
      queueMicrotask(() => {
        editor.focus()
        placeCaretAtEnd()
      })
    },
    [closeMenu, onChange, syncEditorHtml]
  )

  const handleSelectMentionAsset = useCallback(
    (asset: MentionAsset) => {
      if (menu.replaceOffset != null && menu.replaceLabel) {
        replaceMentionAt(asset, menu.replaceOffset, menu.replaceLabel)
        return
      }
      insertMentionAt(asset, menu.open ? menu.triggerIndex : null)
    },
    [
      insertMentionAt,
      menu.open,
      menu.replaceLabel,
      menu.replaceOffset,
      menu.triggerIndex,
      replaceMentionAt,
    ]
  )

  useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus()
    },
    insertMention: (asset) => {
      if (menu.replaceOffset != null && menu.replaceLabel) {
        replaceMentionAt(asset, menu.replaceOffset, menu.replaceLabel)
        return
      }
      insertMentionAt(asset, menu.open ? menu.triggerIndex : null)
    },
  }))

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (document.activeElement === editor && lastValueRef.current === value) {
      return
    }
    syncEditorHtml(value)
  }, [value, assetsForResolve, syncEditorHtml])

  // 图片：hover 小预览；视频：hover 浮层大图 + 倒计时，移出即消失
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const hideImageTip = () => {
      tipRef.current?.remove()
      tipRef.current = null
    }

    const hideVideoTip = () => {
      const active = videoCountdownRef.current
      if (active) {
        window.clearInterval(active.timer)
        videoCountdownRef.current = null
      }
      videoTipRef.current?.remove()
      videoTipRef.current = null
    }

    const placeTipNearChip = (tip: HTMLElement, chip: HTMLElement) => {
      const rect = chip.getBoundingClientRect()
      const tipRect = tip.getBoundingClientRect()
      const left = Math.min(
        Math.max(8, rect.left + rect.width / 2 - tipRect.width / 2),
        window.innerWidth - tipRect.width - 8
      )
      let top = rect.bottom + 8
      if (top + tipRect.height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - tipRect.height - 8)
      }
      tip.style.left = `${left}px`
      tip.style.top = `${top}px`
    }

    const startVideoTip = (chip: HTMLElement) => {
      const label = chip.dataset.mention ?? ''
      const asset = resolveMentionAsset(label, assetsForResolve)
      const total = Math.max(
        1,
        Number(chip.dataset.duration) ||
          resolveVideoDurationSeconds(
            asset ?? {
              id: label,
              url: '',
              name: label,
              kind: 'video',
              duration: 15,
            }
          )
      )
      if (videoTipRef.current?.dataset.label === label) return

      hideImageTip()
      hideVideoTip()

      const url = asset?.url || chip.dataset.url || ''
      const poster = asset?.posterUrl || chip.dataset.poster || ''
      const tip = document.createElement('div')
      tip.dataset.label = label
      tip.className = 'prompt-mention-video-tip'
      tip.style.cssText =
        'position:fixed;z-index:200;width:min(11.5rem,42vw);aspect-ratio:3/4;overflow:hidden;border-radius:1.1rem;border:1px solid var(--border);background:#111;box-shadow:0 12px 32px rgba(0,0,0,.22);pointer-events:none'
      tip.innerHTML =
        (url
          ? `<video src="${escapeHtml(url)}" ${poster ? `poster="${escapeHtml(poster)}"` : ''} muted playsinline preload="metadata" style="display:block;width:100%;height:100%;object-fit:cover"></video>`
          : `<span style="display:block;width:100%;height:100%;background:#222"></span>`) +
        `<span style="position:absolute;top:0.55rem;left:0.6rem;max-width:calc(100% - 1.2rem);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff;font-size:11px;font-weight:500;text-shadow:0 1px 2px rgba(0,0,0,.55)">${escapeHtml(label)}</span>` +
        `<span data-countdown style="position:absolute;bottom:0.55rem;left:0.6rem;color:#fff;font-size:11px;font-weight:500;font-variant-numeric:tabular-nums;text-shadow:0 1px 2px rgba(0,0,0,.55)">${formatClock(total)}</span>`

      document.body.appendChild(tip)
      videoTipRef.current = tip
      placeTipNearChip(tip, chip)

      const countdown = tip.querySelector(
        '[data-countdown]'
      ) as HTMLElement | null
      const video = tip.querySelector('video') as HTMLVideoElement | null
      let remaining = total
      if (video) void video.play().catch(() => undefined)

      const timer = window.setInterval(() => {
        remaining -= 1
        if (remaining <= 0) {
          remaining = total
          if (video) {
            video.currentTime = 0
            void video.play().catch(() => undefined)
          }
        }
        if (countdown) countdown.textContent = formatClock(remaining)
        if (videoCountdownRef.current) {
          videoCountdownRef.current.remaining = remaining
        }
      }, 1000)

      videoCountdownRef.current = { label, timer, remaining, total }
    }

    const onOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const chip = target?.closest?.(
        '.prompt-mention-chip'
      ) as HTMLElement | null
      if (!chip || !editor.contains(chip)) return

      if (chip.dataset.unresolved === 'true') {
        hideVideoTip()
        hideImageTip()
        return
      }

      const kind = chip.dataset.kind
      const label = chip.dataset.mention ?? ''

      if (kind === 'video') {
        startVideoTip(chip)
        return
      }

      if (kind !== 'image') {
        hideVideoTip()
        return
      }

      hideVideoTip()
      const asset = resolveMentionAsset(label, assetsForResolve)
      if (!asset?.url || asset.kind !== 'image') {
        hideImageTip()
        return
      }
      if (tipRef.current?.dataset.label === label) return

      hideImageTip()
      const tip = document.createElement('div')
      tip.dataset.label = label
      tip.style.cssText =
        'position:fixed;z-index:200;padding:6px;border-radius:10px;border:1px solid var(--border);background:var(--background);box-shadow:0 10px 28px rgba(0,0,0,.16);pointer-events:none'
      tip.innerHTML = `<img src="${escapeHtml(asset.url)}" alt="${escapeHtml(label)}" style="width:96px;height:96px;border-radius:6px;object-fit:cover;display:block" />`
      document.body.appendChild(tip)
      tipRef.current = tip
      placeTipNearChip(tip, chip)
    }

    const onOut = (event: MouseEvent) => {
      const related = event.relatedTarget as Node | null
      const chip = (event.target as HTMLElement | null)?.closest?.(
        '.prompt-mention-chip'
      ) as HTMLElement | null
      if (chip && related && chip.contains(related)) return

      const kind = chip?.dataset.kind
      if (kind === 'video') {
        hideVideoTip()
        return
      }
      hideImageTip()
    }

    editor.addEventListener('mouseover', onOver)
    editor.addEventListener('mouseout', onOut)
    return () => {
      editor.removeEventListener('mouseover', onOver)
      editor.removeEventListener('mouseout', onOut)
      hideImageTip()
      hideVideoTip()
    }
  }, [assetsForResolve])

  useLayoutEffect(() => {
    if (!menu.open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (menuRef.current?.contains(target)) return
      if (editorRef.current?.contains(target)) return
      closeMenu()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMenu()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menu.open, closeMenu])

  const emitChange = () => {
    const editor = editorRef.current
    if (!editor) return
    const next = htmlToValue(editor)
    lastValueRef.current = next
    onChange(next)

    const caret = getCaretTextOffset(editor)
    if (caret == null) {
      closeMenu()
      return
    }
    const triggerIndex = findAtTriggerIndex(next, caret)
    if (triggerIndex == null) {
      if (menu.replaceOffset == null) closeMenu()
      return
    }
    const rect = getCaretClientRect()
    const editorRect = editor.getBoundingClientRect()
    const top = (rect?.bottom ?? editorRect.top + 24) + 6
    const left = Math.min(
      Math.max(8, rect?.left ?? editorRect.left + 16),
      window.innerWidth - 240
    )
    setMenu({
      open: true,
      top,
      left,
      triggerIndex,
      replaceOffset: null,
      replaceLabel: null,
    })
  }

  const openReplaceMenuForChip = (chip: HTMLElement) => {
    const editor = editorRef.current
    if (!editor || disabled) return
    const label = chip.dataset.mention
    if (!label) return

    const pre = document.createRange()
    pre.selectNodeContents(editor)
    pre.setEndBefore(chip)
    const probe = document.createElement('div')
    probe.appendChild(pre.cloneContents())
    const offset = htmlToValue(probe).length

    const rect = chip.getBoundingClientRect()
    const top = rect.bottom + 6
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - 240
    )
    setMenu({
      open: true,
      top,
      left,
      triggerIndex: -1,
      replaceOffset: offset,
      replaceLabel: label,
    })
  }

  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    const chip = target?.closest?.(
      '.prompt-mention-chip[data-unresolved="true"]'
    ) as HTMLElement | null
    if (!chip || !editorRef.current?.contains(chip)) return
    event.preventDefault()
    event.stopPropagation()
    openReplaceMenuForChip(chip)
  }

  const handleEditorMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    const chip = target?.closest?.(
      '.prompt-mention-chip[data-unresolved="true"]'
    ) as HTMLElement | null
    if (!chip || !editorRef.current?.contains(chip)) return
    event.preventDefault()
    skipBlurCloseRef.current = true
  }

  const handleCopyOrCut = (
    event: React.ClipboardEvent<HTMLDivElement>,
    isCut: boolean
  ) => {
    const editor = editorRef.current
    if (!editor) return
    const offsets = getSelectionTextOffsets(editor)
    if (!offsets || offsets.start === offsets.end) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const probe = document.createElement('div')
    probe.appendChild(selection.getRangeAt(0).cloneContents())
    const portable = htmlToPortableValue(probe)
    event.clipboardData.setData('text/plain', portable)
    event.preventDefault()

    if (!isCut || disabled) return
    const current = htmlToValue(editor)
    const next = `${current.slice(0, offsets.start)}${current.slice(offsets.end)}`
    syncEditorHtml(next)
    onChange(next)
    queueMicrotask(() => {
      editor.focus()
      setCaretAtTextOffset(editor, offsets.start)
    })
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const editor = editorRef.current
    if (!editor) return
    event.preventDefault()

    const raw =
      event.clipboardData.getData('text/plain') ||
      event.clipboardData.getData('text')
    const inserted = portableMentionsToInternal(raw.replace(/\r\n/g, '\n'))
    const current = htmlToValue(editor)
    const offsets = getSelectionTextOffsets(editor) ?? {
      start: current.length,
      end: current.length,
    }
    let next = `${current.slice(0, offsets.start)}${inserted}${current.slice(offsets.end)}`
    if (onResolvePastedPrompt && extractImageMentionOrder(next).length > 0) {
      next = onResolvePastedPrompt(next)
    }
    const caret = Math.min(next.length, offsets.start + inserted.length)
    syncEditorHtml(next)
    onChange(next)
    closeMenu()
    queueMicrotask(() => {
      editor.focus()
      setCaretAtTextOffset(editor, caret)
    })
  }

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-1 flex-col overflow-hidden',
        className
      )}
    >
      <style>{`
        .prompt-mention-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin: 0 2px;
          padding: 2px 8px 2px 3px;
          height: 1.55em;
          border-radius: 999px;
          border: 1px solid color-mix(in oklab, var(--foreground) 10%, transparent);
          background: color-mix(in oklab, var(--foreground) 7%, transparent);
          vertical-align: middle;
          user-select: all;
          cursor: default;
          font-size: 13px;
          font-weight: 500;
          line-height: 1;
          color: var(--foreground);
          transition: background-color 120ms ease, border-color 120ms ease;
        }
        .prompt-mention-chip:hover {
          background: color-mix(in oklab, var(--foreground) 11%, transparent);
        }
        .prompt-mention-chip__thumb {
          display: inline-flex;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 4px;
          background: transparent;
        }
        .prompt-mention-chip__label {
          font-size: 13px;
          font-weight: 500;
          line-height: 1;
          color: inherit;
          max-width: 8rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .prompt-mention-chip--unresolved {
          gap: 0;
          padding: 2px 8px;
          border-color: color-mix(in oklab, var(--destructive) 70%, transparent);
          background: color-mix(in oklab, var(--destructive) 10%, transparent);
          color: var(--destructive);
          text-decoration: underline;
          text-underline-offset: 2px;
          cursor: pointer;
        }
        .prompt-mention-chip--unresolved:hover {
          background: color-mix(in oklab, var(--destructive) 16%, transparent);
        }
      `}</style>
      {!value ? (
        <div className='text-muted-foreground pointer-events-none absolute inset-0 z-[1] overflow-hidden p-4 text-sm leading-relaxed'>
          {placeholder}
        </div>
      ) : null}
      <div
        ref={editorRef}
        role='textbox'
        aria-multiline
        contentEditable={!disabled}
        suppressContentEditableWarning
        className={cn(
          'absolute inset-0 z-[1] overflow-y-auto border-0 bg-transparent p-4 text-sm leading-relaxed break-words outline-none',
          disabled && 'pointer-events-none opacity-60'
        )}
        onInput={emitChange}
        onCopy={(event) => handleCopyOrCut(event, false)}
        onCut={(event) => handleCopyOrCut(event, true)}
        onPaste={handlePaste}
        onMouseDown={handleEditorMouseDown}
        onClick={handleEditorClick}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menu.open) {
            event.preventDefault()
            closeMenu()
          }
        }}
        onFocus={() => onFocus?.()}
        onBlur={() => {
          emitChange()
          onBlur?.()
          if (skipBlurCloseRef.current) {
            skipBlurCloseRef.current = false
            return
          }
          window.setTimeout(() => {
            if (!menuRef.current?.contains(document.activeElement)) {
              closeMenu()
            }
          }, 0)
        }}
      />

      {menu.open
        ? createPortal(
            <div
              ref={menuRef}
              className='bg-popover text-popover-foreground fixed z-100 w-60 overflow-hidden rounded-xl border shadow-lg'
              style={{ top: menu.top, left: menu.left }}
              onMouseDown={() => {
                skipBlurCloseRef.current = true
              }}
            >
              <div className='text-muted-foreground border-b px-3 py-2 text-xs font-medium'>
                {menu.replaceLabel
                  ? `替换 @${menu.replaceLabel}`
                  : '可能@的内容'}
              </div>
              <MentionImagePicker
                assets={images}
                onSelect={handleSelectMentionAsset}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  )
})
