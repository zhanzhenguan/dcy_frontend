import { type ReactNode } from 'react'
import { cn } from '@/utils/utils'
import { Main } from './main'
import { PageSurface } from './PageSurface'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

/** 灰底画布上的页面标题区（无白底） */
export const PageHeader = ({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) => {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-4',
        className
      )}
    >
      <div className='min-w-0 space-y-1'>
        <h2 className='text-2xl font-bold tracking-tight'>{title}</h2>
        {description ? (
          <p className='text-muted-foreground text-sm'>{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          {actions}
        </div>
      ) : null}
    </div>
  )
}

type PageShellProps = {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** 标题区下方、内容卡上方的导航（如一级 Tab） */
  nav?: ReactNode
  children: ReactNode
  /**
   * 是否用白底卡片包裹 children，默认 true。
   * 多卡片/多面板页面可设为 false，由子节点自行使用 PageSurface / Card。
   */
  surface?: boolean
  className?: string
  headerClassName?: string
  surfaceClassName?: string
}

/**
 * 系统配置等模块通用布局：顶部标题（灰底）+ 下方白底内容卡。
 * 用于 ConfigurationPage / Main 内的页面主体。
 */
export const PageShell = ({
  title,
  description,
  actions,
  nav,
  children,
  surface = true,
  className,
  headerClassName,
  surfaceClassName,
}: PageShellProps) => {
  return (
    <div
      className={cn(
        'min-w-0 flex-1 space-y-6 overflow-y-auto pe-1 pb-12',
        className
      )}
    >
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        className={headerClassName}
      />
      {nav}
      {surface ? (
        <PageSurface className={surfaceClassName}>{children}</PageSurface>
      ) : (
        children
      )}
    </div>
  )
}

type ContentPageProps = PageShellProps & {
  mainClassName?: string
  /** 标题区下方、内容区上方的导航（如账户 Tab） */
  nav?: ReactNode
}

/**
 * 带应用顶栏下方 Main 的通用页：灰底 Main + PageHeader + 白底内容。
 */
export const ContentPage = ({
  nav,
  children,
  surface = true,
  className,
  surfaceClassName,
  mainClassName,
}: ContentPageProps) => {
  return (
    <Main className={cn('space-y-6', mainClassName)}>
      <div className={cn('space-y-6', className)}>
        {nav}
        {surface ? (
          <PageSurface className={surfaceClassName}>{children}</PageSurface>
        ) : (
          children
        )}
      </div>
    </Main>
  )
}
