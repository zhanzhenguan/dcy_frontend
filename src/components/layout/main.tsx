import { cn } from '@/utils/utils'

type MainProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  /**
   * @deprecated 主区域默认铺满侧栏右侧可用宽度；保留参数以免旧调用报错。
   */
  fluid?: boolean
  ref?: React.Ref<HTMLElement>
}

/** 与顶栏水平内边距对齐，四边一致 */
export const MAIN_CONTENT_PADDING = 'p-4 md:p-6'

export const Main = ({
  fixed,
  className,
  fluid: _fluid,
  ...props
}: MainProps) => {
  return (
    <main
      data-layout={fixed ? 'fixed' : 'auto'}
      className={cn(
        // 灰底画布；铺满侧栏右侧；四边 padding 一致
        'bg-background w-full min-w-0',
        MAIN_CONTENT_PADDING,

        fixed && 'flex grow flex-col overflow-hidden',

        className
      )}
      {...props}
    />
  )
}
