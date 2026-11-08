import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils/utils'
import { type PublishStep } from '../types'

interface PublishStepperProps {
  currentStep: PublishStep
  onStepClick?: (step: PublishStep) => void
}

const steps = [
  {
    number: 1 as PublishStep,
    title: '选择平台',
    subtitle: '配置账号与目标平台',
  },
  {
    number: 2 as PublishStep,
    title: '合规预检',
    subtitle: '文案与视频规范校验',
  },
  {
    number: 3 as PublishStep,
    title: '发布中',
    subtitle: '模拟真人自动化发布',
  },
  {
    number: 4 as PublishStep,
    title: '完成',
    subtitle: '发布结果与链接生成',
  },
]

export const PublishStepper = ({
  currentStep,
  onStepClick,
}: PublishStepperProps) => {
  return (
    <div className='bg-card rounded-xl border p-4 shadow-sm'>
      <div className='grid grid-cols-4 gap-2 text-center'>
        {steps.map((s) => {
          const isCurrent = currentStep === s.number
          const isFinished = currentStep > s.number
          const canNavigateBack = Boolean(onStepClick && isFinished)

          return (
            <div
              key={s.number}
              onClick={() => {
                if (canNavigateBack && onStepClick) onStepClick(s.number)
              }}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg p-2 transition-all',
                canNavigateBack ? 'cursor-pointer' : '',
                isCurrent
                  ? 'bg-primary/10 text-primary ring-primary/30 font-semibold ring-1'
                  : isFinished
                    ? 'bg-muted/50 text-foreground hover:bg-muted'
                    : 'bg-muted/20 text-muted-foreground opacity-60'
              )}
            >
              <div className='flex items-center gap-1.5'>
                <div
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-bold transition-all',
                    isCurrent || isFinished
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isFinished ? (
                    <CheckCircle2 className='size-3.5' />
                  ) : (
                    s.number
                  )}
                </div>
                <span className='hidden text-xs font-medium sm:inline-block'>
                  {s.title}
                </span>
              </div>
              <span className='mt-0.5 text-[10px] opacity-75 sm:hidden'>
                {s.title}
              </span>
              <span className='mt-0.5 hidden text-[10px] opacity-75 sm:block'>
                {s.subtitle}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
