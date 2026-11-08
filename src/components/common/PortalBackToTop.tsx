import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/utils/utils'

const SHOW_AFTER_PX = 420

function scrollToTop() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
}

/** 门户页右下角「回到顶部」：默认箭头，hover 展开胶囊文案，点击平滑滚到最顶 */
export const PortalBackToTop = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type='button'
      aria-label='回到顶部'
      tabIndex={visible ? 0 : -1}
      onClick={scrollToTop}
      className={cn(
        'group/back-top fixed inset-e-4 bottom-6 z-50 h-11 w-11 cursor-pointer overflow-hidden rounded-full text-white shadow-lg transition-[width,transform,opacity,filter] duration-300 sm:inset-e-6 sm:bottom-8 sm:h-12 sm:w-12',
        'hover:w-[7.25rem] sm:hover:w-[8rem]',
        '[background-image:var(--portal-gradient)] hover:brightness-110 focus-visible:w-[7.25rem] focus-visible:ring-2 focus-visible:ring-(--portal-gradient-from) focus-visible:ring-offset-2 focus-visible:outline-none sm:focus-visible:w-[8rem]',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      )}
    >
      <span className='absolute inset-0 flex items-center justify-center'>
        <ArrowUp
          className='portal-back-to-top__arrow size-5 transition-opacity duration-200 group-hover/back-top:opacity-0 group-focus-visible/back-top:opacity-0'
          aria-hidden
        />
      </span>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center px-3 text-sm font-medium whitespace-nowrap',
          'opacity-0 transition-opacity duration-200 group-hover/back-top:opacity-100 group-focus-visible/back-top:opacity-100'
        )}
      >
        回到顶部
      </span>
    </button>
  )
}
