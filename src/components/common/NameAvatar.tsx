import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/utils/utils'

const AVATAR_TONES = [
  'bg-sky-100 text-sky-800',
  'bg-teal-100 text-teal-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-900',
  'bg-orange-100 text-orange-800',
  'bg-rose-100 text-rose-800',
  'bg-violet-100 text-violet-800',
  'bg-slate-200 text-slate-700',
] as const

const getNameInitials = (name: string) => {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  if (/[\u4e00-\u9fff]/.test(trimmed)) {
    return trimmed.replace(/\s+/g, '').slice(0, 1)
  }
  const letters = trimmed.replace(/[^a-zA-Z]/g, '')
  if (letters.length >= 2) return letters.slice(0, 2).toUpperCase()
  if (letters.length === 1) return letters.toUpperCase()
  return trimmed.slice(0, 2).toUpperCase()
}

const getNameAvatarTone = (seed: string) => {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

type NameAvatarProps = {
  name: string
  src?: string | null
  className?: string
  fallbackClassName?: string
}

/** 有真实头像则展示；否则按名称生成色块 + 缩写 */
export const NameAvatar = ({
  name,
  src,
  className,
  fallbackClassName,
}: NameAvatarProps) => {
  const trimmedSrc = src?.trim()
  const hasImage =
    Boolean(trimmedSrc) && !/^(null|undefined|none)$/i.test(trimmedSrc ?? '')
  const initials = getNameInitials(name)
  const tone = getNameAvatarTone(name.trim() || 'user')

  return (
    <Avatar className={cn('size-10', className)}>
      {hasImage ? (
        <AvatarImage src={trimmedSrc} alt={name} className='object-cover' />
      ) : null}
      <AvatarFallback
        className={cn(
          'text-xs font-semibold tracking-wide',
          tone,
          fallbackClassName
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
