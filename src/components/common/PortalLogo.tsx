import logo from '@/assets/images/logo.png'
import logoV2 from '@/assets/images/logo_v2.png'
import { cn } from '@/utils/utils'
import './portalLogo.scss'

/** logo_v2 默认展示宽度（px） */
const PORTAL_LOGO_WIDTH = 172
/** logo_v2 宽高比（3156×1111） */
const PORTAL_LOGO_ASPECT = 3156 / 1111

type PortalLogoProps = {
  className?: string
  nameClassName?: string
  showName?: boolean
  /** 边长（app）或高度（portal）；省略则用 CSS / 默认宽度 */
  size?: number
  /** portal：官网/登录用 logo_v2；app：工作台侧栏用原 logo */
  variant?: 'portal' | 'app'
}

export const PortalLogo = ({
  className,
  nameClassName,
  showName = false,
  size,
  variant = 'portal',
}: PortalLogoProps) => {
  const isWide = variant === 'portal'
  const src = isWide ? logoV2 : logo

  return (
    <span
      className={cn('portal-logo', isWide && 'portal-logo--wide', className)}
    >
      <span
        className='portal-logo__mark'
        style={
          size != null
            ? isWide
              ? {
                  height: size,
                  width: Math.round(size * PORTAL_LOGO_ASPECT),
                }
              : { width: size, height: size }
            : isWide
              ? {
                  width: PORTAL_LOGO_WIDTH,
                  height: Math.round(PORTAL_LOGO_WIDTH / PORTAL_LOGO_ASPECT),
                }
              : undefined
        }
        aria-hidden
      >
        <img src={src} alt='' className='portal-logo__img' />
      </span>
      {showName ? (
        <span className={cn('portal-logo__name', nameClassName)}>大词源</span>
      ) : null}
    </span>
  )
}
