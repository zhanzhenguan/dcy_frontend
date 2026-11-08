import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { sleep, cn } from '@/utils/utils'

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? '请输入邮箱' : '请输入有效的邮箱地址'),
  }),
})

export const ForgotPasswordForm = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    toast.promise(sleep(2000), {
      loading: '正在发送邮件...',
      success: () => {
        setIsLoading(false)
        form.reset()
        navigate({ to: '/otp' })
        return `重置邮件已发送至 ${data.email}`
      },
      error: '发送失败，请稍后重试',
    })
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn('space-y-4', className)}
      {...props}
    >
      <div className='space-y-1.5'>
        <label className='block text-xs font-medium text-slate-700'>
          <span className='me-1 text-rose-500'>*</span>注册邮箱
        </label>
        <div className='relative flex items-center'>
          <div className='pointer-events-none absolute start-3.5 text-slate-400'>
            <Mail className='size-4' />
          </div>
          <input
            type='email'
            autoComplete='email'
            placeholder='name@example.com'
            className='auth-input'
            {...form.register('email')}
          />
        </div>
        {form.formState.errors.email && (
          <p className='ps-1 text-xs font-medium text-rose-500'>
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <button type='submit' disabled={isLoading} className='auth-cta mt-2'>
        {isLoading ? (
          <Loader2 className='size-5 animate-spin text-white' />
        ) : (
          <>
            <span>发送重置链接</span>
            <ArrowRight className='size-4' />
          </>
        )}
      </button>
    </form>
  )
}
