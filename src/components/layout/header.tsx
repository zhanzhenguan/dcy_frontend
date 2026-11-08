import { useEffect, useState } from 'react'
import { cn } from '@/utils/utils'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

function getScrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node: HTMLElement | null = el?.parentElement ?? null
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight
    ) {
      return node
    }
    node = node.parentElement
  }
  return window
}

export const Header = ({ className, fixed, children, ref, ...props }: HeaderProps) => {
  const [offset, setOffset] = useState(0)
  const [node, setNode] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!fixed || !node) return

    const scrollRoot = getScrollParent(node)
    const onScroll = () => {
      const top =
        scrollRoot instanceof Window
          ? document.body.scrollTop || document.documentElement.scrollTop
          : scrollRoot.scrollTop
      setOffset(top)
    }

    onScroll()
    scrollRoot.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollRoot.removeEventListener('scroll', onScroll)
  }, [fixed, node])

  return (
    <header
      ref={(el) => {
        setNode(el)
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      className={cn(
        'z-50 h-16 border-border border-b bg-surface shadow-sm dark:shadow-none',
        fixed && 'header-fixed peer/header sticky top-0 w-full shrink-0',
        offset > 10 && fixed && 'shadow-md dark:shadow-sm',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'relative flex h-full items-center gap-3 px-4 sm:gap-4 md:px-6',
          offset > 10 &&
            fixed &&
            'after:bg-surface/90 after:absolute after:inset-0 after:-z-10 after:backdrop-blur-lg'
        )}
      >
        <SidebarTrigger variant='outline' className='max-md:scale-125' />
        <Separator orientation='vertical' className='h-6' />
        {children}
      </div>
    </header>
  )
}
