import { NameAvatar } from '@/components/common'
import { cn } from '@/utils/utils'
import {
  AssetThumbControl,
  type AssetThumbValue,
} from './AssetThumbControl'

/** 卡片脚注用 HH:mm（本地时区） */
function formatCardClock(unix?: number) {
  if (!unix) return ''
  const date = new Date(unix * 1000)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

type AssetCreatorMetaProps = {
  name?: string
  avatarUrl?: string | null
  /** Unix 秒；展示为几点几分 */
  createdAt?: number
  className?: string
  /** 「全部」：头像 + 昵称，右侧时间 */
  showCreator?: boolean
  /** 「仅自己」：左侧时间 + 赞踩 */
  showThumb?: boolean
  thumbValue?: AssetThumbValue
  onThumbChange?: (next: AssetThumbValue) => void
}

/**
 * 资产卡片底部信息条。
 * - 全部：头像、昵称，右侧 HH:mm
 * - 仅自己：左侧 HH:mm + 赞踩（无头像昵称）
 */
export const AssetCreatorMeta = ({
  name,
  avatarUrl,
  createdAt,
  className,
  showCreator = false,
  showThumb = false,
  thumbValue,
  onThumbChange,
}: AssetCreatorMetaProps) => {
  const displayName = (name ?? '').trim() || '未知用户'
  const timeLabel = formatCardClock(createdAt)

  // 固定高度，避免成功（有赞踩）/失败/草稿脚注高低不一
  const barClass = cn(
    'flex h-9 min-w-0 items-center gap-2',
    className
  )

  if (showCreator) {
    return (
      <div className={barClass}>
        <NameAvatar
          name={displayName}
          src={avatarUrl}
          className='size-5 shrink-0 ring-1 ring-black/5 dark:ring-white/10'
          fallbackClassName='text-[9px] font-semibold'
        />
        <span
          className='text-foreground/75 min-w-0 flex-1 truncate text-[11px] leading-none font-medium tracking-tight'
          title={displayName}
        >
          {displayName}
        </span>
        {timeLabel ? (
          <span
            className='text-muted-foreground shrink-0 font-mono text-[11px] leading-none tabular-nums'
            title={timeLabel}
          >
            {timeLabel}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div className={barClass}>
      <span
        className='text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px] leading-none tabular-nums'
        title={timeLabel || undefined}
      >
        {timeLabel || '—'}
      </span>
      {showThumb ? (
        <AssetThumbControl value={thumbValue} onChange={onThumbChange} />
      ) : null}
    </div>
  )
}
