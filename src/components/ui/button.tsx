import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/utils'

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,box-shadow,filter,transform,opacity] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:brightness-105 active:brightness-95',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'overflow-visible text-primary underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

type Ripple = {
  id: number
  x: number
  y: number
  size: number
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  onPointerDown,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const [ripples, setRipples] = React.useState<Ripple[]>([])
  const rippleEnabled = !asChild && variant !== 'link'
  const classes = cn(buttonVariants({ variant, size, className }))

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(event)
    if (
      !rippleEnabled ||
      event.defaultPrevented ||
      props.disabled ||
      event.button !== 0
    ) {
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const next: Ripple = {
      id: Date.now() + Math.random(),
      x: event.clientX - rect.left - size / 2,
      y: event.clientY - rect.top - size / 2,
      size,
    }
    setRipples((current) => [...current, next])
    window.setTimeout(() => {
      setRipples((current) => current.filter((item) => item.id !== next.id))
    }, 520)
  }

  // Slot 只能有一个子节点；asChild 时不注入涟漪层
  if (asChild) {
    return (
      <Slot
        data-slot='button'
        className={classes}
        {...props}
        onPointerDown={onPointerDown}
      >
        {children}
      </Slot>
    )
  }

  return (
    <button
      data-slot='button'
      className={classes}
      {...props}
      onPointerDown={handlePointerDown}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          aria-hidden
          className='pointer-events-none absolute rounded-full bg-current opacity-30'
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            animation: 'md-button-ripple 520ms ease-out forwards',
          }}
        />
      ))}
    </button>
  )
}

export { Button, buttonVariants }
