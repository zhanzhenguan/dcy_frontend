import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { getUserDisplayName } from '@/utils/user'
import { Button } from '@/components/ui/button'
import { scrollToSection } from '@/utils/scrollToSection'
import { cn } from '@/utils/utils'
import { UserAvatar } from './UserAvatar'
import { PortalLogo } from './PortalLogo'

const navLinks = [
  { hash: 'home', label: '首页' },
  { hash: 'leadership', label: '领导关怀' },
  { hash: 'about', label: '关于品牌' },
  { hash: 'services', label: '产品能力' },
  { hash: 'pricing', label: '价格方案' },
  { hash: 'advantages', label: '应用场景' },
  { hash: 'contact', label: '联系我们' },
] as const

type NavHash = (typeof navLinks)[number]['hash']

function NavAnchor({
  hash,
  label,
  isHome,
  className,
  onNavigate,
}: {
  hash: string
  label: string
  isHome: boolean
  className: string
  onNavigate?: () => void
}) {
  if (isHome) {
    return (
      <a
        href={`#${hash}`}
        className={className}
        onClick={(event) => {
          event.preventDefault()
          scrollToSection(hash)
          window.history.pushState(null, '', `#${hash}`)
          onNavigate?.()
        }}
      >
        {label}
      </a>
    )
  }

  return (
    <Link to='/' hash={hash} className={className} onClick={onNavigate}>
      {label}
    </Link>
  )
}

function useActiveNavHash(isHome: boolean) {
  const locationHash = useRouterState({
    select: (s) => s.location.hash.replace(/^#/, ''),
  })
  const [activeHash, setActiveHash] = useState<NavHash>('home')
  const lockUntilRef = useRef(0)
  const lockedHashRef = useRef<NavHash | null>(null)

  const selectHash = (hash: NavHash, options?: { lockMs?: number }) => {
    if (options?.lockMs) {
      lockedHashRef.current = hash
      lockUntilRef.current = performance.now() + options.lockMs
    }
    setActiveHash(hash)
  }

  useEffect(() => {
    if (!isHome) return
    if (!navLinks.some((item) => item.hash === locationHash)) return
    const hash = locationHash as NavHash
    // 程序化滚动锁定期间忽略 URL hash 回写，避免打断滑块
    if (
      lockedHashRef.current &&
      performance.now() < lockUntilRef.current &&
      hash !== lockedHashRef.current
    ) {
      return
    }
    setActiveHash(hash)
  }, [isHome, locationHash])

  useEffect(() => {
    if (!isHome) return

    let frame = 0
    const update = () => {
      frame = 0
      if (
        lockedHashRef.current &&
        performance.now() < lockUntilRef.current
      ) {
        return
      }
      lockedHashRef.current = null

      let current: NavHash = 'home'
      for (const item of navLinks) {
        const el = document.getElementById(item.hash)
        if (!el) continue
        if (el.getBoundingClientRect().top <= 260) {
          current = item.hash
        }
      }
      setActiveHash((prev) => (prev === current ? prev : current))
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [isHome])

  return [activeHash, selectHash] as const
}

function DesktopPortalNav({
  isHome,
  activeHash,
  onSelect,
}: {
  isHome: boolean
  activeHash: NavHash
  onSelect: (hash: NavHash, options?: { lockMs?: number }) => void
}) {
  const listRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const readyRef = useRef(false)
  const activeIndexRef = useRef(0)
  const activeIndex = Math.max(
    0,
    navLinks.findIndex((item) => item.hash === activeHash)
  )
  activeIndexRef.current = activeIndex

  const moveIndicator = (animate: boolean) => {
    const item = itemRefs.current[activeIndexRef.current]
    const pill = indicatorRef.current
    if (!item || !pill) return

    const left = item.offsetLeft
    const width = item.offsetWidth
    if (!readyRef.current) {
      pill.style.transition = 'none'
      readyRef.current = true
    } else if (animate) {
      pill.style.transition =
        'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), width 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease'
    } else {
      pill.style.transition = 'none'
    }

    pill.style.width = `${width}px`
    pill.style.transform = `translate3d(${left}px, 0, 0)`
    pill.style.opacity = width > 0 ? '1' : '0'
  }

  useLayoutEffect(() => {
    moveIndicator(true)
  }, [activeIndex])

  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const onResize = () => moveIndicator(false)
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(onResize)
        : null
    observer?.observe(list)
    window.addEventListener('resize', onResize)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const handleHomeClick = (
    event: MouseEvent<HTMLAnchorElement>,
    hash: NavHash
  ) => {
    event.preventDefault()
    onSelect(hash, { lockMs: 900 })
    scrollToSection(hash)
    window.history.pushState(null, '', `#${hash}`)
  }

  return (
    <nav
      ref={listRef}
      aria-label='门户导航'
      className='portal-header__nav relative hidden w-fit items-center rounded-full bg-white/10 p-1 md:flex'
    >
      <span
        ref={indicatorRef}
        aria-hidden
        className='pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-white/20 shadow-sm will-change-transform'
        style={{ width: 0, opacity: 0, transform: 'translate3d(0, 0, 0)' }}
      />
      {navLinks.map((item, index) => {
        const active = item.hash === activeHash
        const className = cn(
          'relative z-10 cursor-pointer rounded-full px-3.5 py-2 text-[14px] font-medium transition-[color,background-color] duration-200 lg:px-4 lg:py-2.5',
          active
            ? 'is-active font-semibold text-white'
            : 'text-slate-300 hover:bg-white/15 hover:text-white'
        )

        if (isHome) {
          return (
            <a
              key={item.hash}
              ref={(node) => {
                itemRefs.current[index] = node
              }}
              href={`#${item.hash}`}
              className={className}
              aria-current={active ? 'true' : undefined}
              onClick={(event) => handleHomeClick(event, item.hash)}
            >
              {item.label}
            </a>
          )
        }

        return (
          <Link
            key={item.hash}
            ref={(node) => {
              itemRefs.current[index] = node
            }}
            to='/'
            hash={item.hash}
            className={className}
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(item.hash, { lockMs: 900 })}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** true = 截图用不透明导航；false = 滚动后毛玻璃 */
const HEADER_SOLID_FOR_SCREENSHOT = true

export const PortalHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isHome = pathname === '/'
  const [activeHash, selectHash] = useActiveNavHash(isHome)
  const accessToken = useAuthStore((state) => state.auth.accessToken)
  const user = useAuthStore((state) => state.auth.user)
  const isLoggedIn = Boolean(accessToken)
  const displayName = user ? getUserDisplayName(user) : 'User'

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      setScrolled(window.scrollY > 12)
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  const workbenchLinkClass =
    'inline-flex h-auto items-center gap-2 rounded-lg px-2 py-1.5 text-slate-50 transition-colors hover:bg-white/10'

  return (
    <header className='portal-header pointer-events-none fixed inset-x-0 top-0 z-50'>
      <div className='portal-header__inner pointer-events-auto'>
        <div
          className={cn(
            'portal-header__shell',
            scrolled &&
              (HEADER_SOLID_FOR_SCREENSHOT
                ? 'portal-header__shell--scrolled-solid'
                : 'portal-header__shell--scrolled-glass')
          )}
        >
          <div className='portal-header__bar'>
            <Link
              to='/'
              className='portal-header__brand min-w-0 transition-opacity duration-200 hover:opacity-80'
            >
              <PortalLogo />
            </Link>

            <DesktopPortalNav
              isHome={isHome}
              activeHash={activeHash}
              onSelect={selectHash}
            />

            <div className='portal-header__auth hidden items-center gap-3 md:flex'>
              {isLoggedIn ? (
                <Link
                  to='/dashboard'
                  className={workbenchLinkClass}
                  aria-label='进入工作台'
                >
                  <UserAvatar
                    src={user?.avatar_url}
                    alt={displayName}
                    className='size-9'
                  />
                  <span className='hidden truncate text-sm font-semibold text-slate-50 sm:inline'>
                    {displayName}
                  </span>
                </Link>
              ) : (
                <>
                  <Link
                    to='/sign-in'
                    className='cursor-pointer text-[15px] font-medium transition-colors duration-200'
                  >
                    登录
                  </Link>
                  <Link
                    to='/sign-up'
                    className='portal-btn-primary inline-flex h-10 cursor-pointer items-center rounded-full px-5 text-[14px] font-semibold'
                  >
                    9.9元试用
                  </Link>
                </>
              )}
            </div>

            <Button
              variant='ghost'
              size='icon'
              className='portal-header__menu shrink-0 cursor-pointer md:hidden'
              aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
          </div>

          {mobileOpen && (
            <div className='portal-header__mobile border-t md:hidden'>
              <div className='flex flex-col gap-1'>
                {navLinks.map((item) => (
                  <NavAnchor
                    key={item.hash}
                    hash={item.hash}
                    label={item.label}
                    isHome={isHome}
                    className={cn(
                      'cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      activeHash === item.hash
                        ? 'bg-white/15 text-white'
                        : 'text-slate-300'
                    )}
                    onNavigate={() => {
                      selectHash(item.hash)
                      setMobileOpen(false)
                    }}
                  />
                ))}
                <div className='portal-header__mobile-divider mt-3 flex flex-col gap-2 border-t pt-3'>
                  {isLoggedIn ? (
                    <Link
                      to='/dashboard'
                      className={cn(workbenchLinkClass, 'w-full px-3')}
                      aria-label='进入工作台'
                      onClick={() => setMobileOpen(false)}
                    >
                      <UserAvatar
                        src={user?.avatar_url}
                        alt={displayName}
                        className='size-9'
                      />
                      <span className='truncate text-sm font-semibold text-slate-50'>
                        {displayName}
                      </span>
                    </Link>
                  ) : (
                    <>
                      <Link
                        to='/sign-in'
                        className='cursor-pointer rounded-lg px-3 py-2.5 text-center text-sm font-medium transition-colors'
                        onClick={() => setMobileOpen(false)}
                      >
                        登录
                      </Link>
                      <Link
                        to='/sign-up'
                        className='portal-btn-primary inline-flex h-11 cursor-pointer items-center justify-center rounded-full text-sm font-semibold'
                        onClick={() => setMobileOpen(false)}
                      >
                        9.9元试用
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
