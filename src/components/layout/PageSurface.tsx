import { cn } from '@/utils/utils'

type PageSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>
}

/** 灰底 Main 上的白底内容面板 */
export const PageSurface = ({ className, ...props }: PageSurfaceProps) => {
  return (
    <div
      className={cn(
        'bg-surface rounded-xl border p-6 shadow-sm',
        className
      )}
      {...props}
    />
  )
}
