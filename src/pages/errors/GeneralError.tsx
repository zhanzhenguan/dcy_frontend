import { useNavigate, useRouter } from '@tanstack/react-router'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
}

export const GeneralError = ({
  className,
  minimal = false,
}: GeneralErrorProps) => {
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>抱歉，系统出现异常</span>
        <p className='text-muted-foreground text-center'>
          给您带来不便，敬请谅解。
          <br /> 请稍后再试。
        </p>
        {!minimal && (
          <div className='mt-6 flex gap-4'>
            <Button variant='outline' onClick={() => history.go(-1)}>
              返回上一页
            </Button>
            <Button onClick={() => navigate({ to: '/' })}>返回首页</Button>
          </div>
        )}
      </div>
    </div>
  )
}
