import { DEFAULT_USER_AVATAR, resolveUserAvatarUrl } from '@/utils/user'
import { cn } from '@/utils/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type UserAvatarProps = {
  src?: string | null
  alt?: string
  className?: string
  imageClassName?: string
  fallbackClassName?: string
}

/** 无头像或头像加载失败时，统一展示默认头像图 */
export const UserAvatar = ({
  src,
  alt = '用户头像',
  className,
  imageClassName,
  fallbackClassName,
}: UserAvatarProps) => {
  const resolved = resolveUserAvatarUrl(src)

  return (
    <Avatar className={className}>
      <AvatarImage src={resolved} alt={alt} className={imageClassName} />
      <AvatarFallback className={cn('overflow-hidden p-0', fallbackClassName)}>
        <img
          src={DEFAULT_USER_AVATAR}
          alt=''
          className='size-full object-cover'
        />
      </AvatarFallback>
    </Avatar>
  )
}
