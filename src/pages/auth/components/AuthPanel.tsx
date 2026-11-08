import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/utils/utils'

type AuthPanelProps = {
  title: string
  description?: string
  badge?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export const AuthPanel = ({
  title,
  description,
  badge = '安全访问工作区',
  children,
  footer,
  className,
}: AuthPanelProps) => {
  return (
    <div className={cn('auth-panel auth-theme', className)}>
      {badge ? (
        <div className='auth-panel__badge'>
          <ShieldCheck className='size-3.5' />
          <span>{badge}</span>
        </div>
      ) : null}

      <div className='auth-panel__card'>
        <div className='mb-6 space-y-1'>
          <h2 className='auth-panel__title'>{title}</h2>
          {description ? <p className='auth-panel__desc'>{description}</p> : null}
        </div>

        {children}

        {footer ? <div className='mt-6 pt-2 text-center'>{footer}</div> : null}
      </div>
    </div>
  )
}
