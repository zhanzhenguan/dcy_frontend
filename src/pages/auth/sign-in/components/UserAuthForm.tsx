import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Loader2,
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  Smartphone,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { getApiErrorMessage } from '@/services/api/apiError'
import { getCaptcha, login, sendSmsCode, smsLogin } from '@/services/api/authApi'
import { cn } from '@/utils/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PasswordInput } from '@/components/common'

const passwordFormSchema = z.object({
  email: z.email({
    error: (iss) =>
      iss.input === '' ? '请输入邮箱或账号' : '请输入有效的邮箱地址',
  }),
  password: z.string().min(1, '请输入密码').min(6, '密码长度不能少于 6 位'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export const UserAuthForm = ({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) => {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const [loginMode, setLoginMode] = useState<'password' | 'code'>('password')
  const [countdown, setCountdown] = useState(0)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [captcha, setCaptcha] = useState<Awaited<
    ReturnType<typeof getCaptcha>
  > | null>(null)
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaOpen, setCaptchaOpen] = useState(false)
  const [captchaLoading, setCaptchaLoading] = useState(false)

  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setInterval(
      () => setCountdown((value) => Math.max(0, value - 1)),
      1000
    )
    return () => window.clearInterval(timer)
  }, [countdown])

  const refreshCaptcha = async () => {
    setCaptchaLoading(true)
    try {
      setCaptcha(await getCaptcha())
      setCaptchaCode('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, '图形验证码加载失败'))
    } finally {
      setCaptchaLoading(false)
    }
  }

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error('请输入正确的手机号')
      return
    }
    setCaptchaOpen(true)
    await refreshCaptcha()
  }

  const handleCaptchaSubmit = async () => {
    if (!captcha || !captchaCode.trim()) return
    setCaptchaLoading(true)
    try {
      const result = await sendSmsCode({
        phone,
        captcha_id: captcha.captcha_id,
        captcha_code: captchaCode.trim(),
      })
      setCountdown(result.retry_after)
      setCaptchaOpen(false)
      toast.success('短信验证码已发送')
    } catch (error) {
      toast.error(getApiErrorMessage(error, '验证码发送失败'))
      await refreshCaptcha()
    } finally {
      setCaptchaLoading(false)
    }
  }

  async function onSubmit(data: z.infer<typeof passwordFormSchema>) {
    try {
      const session =
        loginMode === 'password'
          ? await login(data)
          : await smsLogin({ phone, code })
      auth.setSession(session)

      const targetPath =
        redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : '/dashboard'
      await navigate({ to: targetPath, replace: true })
      toast.success(`欢迎回来，${session.user.nickname || session.user.email}`)
    } catch (error) {
      form.setError('root', {
        message: getApiErrorMessage(error, '登录失败，请检查账号和密码'),
      })
    }
  }

  const isLoading = form.formState.isSubmitting

  return (
    <div className={cn('w-full space-y-5', className)}>
      {/* Segmented Switcher Tab (密码登录 / 验证码登录) */}
      <div className='flex rounded-full bg-slate-100 p-1 text-xs font-semibold'>
        <button
          type='button'
          onClick={() => setLoginMode('password')}
          className={cn(
            'flex-1 cursor-pointer rounded-full py-2 text-center transition-all duration-200',
            loginMode === 'password'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          密码登录
        </button>
        <button
          type='button'
          onClick={() => setLoginMode('code')}
          className={cn(
            'flex-1 cursor-pointer rounded-full py-2 text-center transition-all duration-200',
            loginMode === 'code'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          验证码登录
        </button>
      </div>

      <form
        onSubmit={
          loginMode === 'password'
            ? form.handleSubmit(onSubmit)
            : (event) => {
                event.preventDefault()
                void onSubmit(form.getValues())
              }
        }
        className='space-y-4'
        {...props}
      >
        {/* Account / Email Input */}
        {loginMode === 'password' ? (
          <div className='space-y-1.5'>
            <label className='block text-xs font-medium text-slate-700'>
              <span className='me-1 text-rose-500'>*</span>账号 / 邮箱
            </label>
            <div className='relative flex items-center'>
              <div className='pointer-events-none absolute start-3.5 text-slate-400'>
                <Mail className='size-4' />
              </div>
              <input
                type='email'
                autoComplete='email'
                placeholder='输入手机号或邮箱'
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
        ) : (
          <div className='space-y-1.5'>
            <label className='block text-xs font-medium text-slate-700'>
              <span className='me-1 text-rose-500'>*</span>手机号
            </label>
            <div className='relative flex items-center'>
              <Smartphone className='pointer-events-none absolute start-3.5 size-4 text-slate-400' />
              <input
                type='tel'
                inputMode='numeric'
                maxLength={11}
                autoComplete='tel'
                placeholder='输入手机号'
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value.replace(/\D/g, ''))
                }
                className='auth-input'
              />
            </div>
          </div>
        )}

        {/* Password Mode vs Code Mode Fields */}
        {loginMode === 'password' ? (
          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <label className='block text-xs font-medium text-slate-700'>
                <span className='me-1 text-rose-500'>*</span>密码
              </label>
              <Link to='/forgot-password' className='auth-link text-xs'>
                忘记密码？
              </Link>
            </div>
            <div className='relative flex items-center'>
              <div className='pointer-events-none absolute start-3.5 z-10 text-slate-400'>
                <Lock className='size-4' />
              </div>
              <PasswordInput
                autoComplete='current-password'
                placeholder='请输入密码'
                className='w-full'
                inputClassName='auth-input !h-auto pe-12 dark:border-slate-200 dark:bg-white dark:text-slate-900'
                {...form.register('password')}
              />
            </div>
            {form.formState.errors.password && (
              <p className='ps-1 text-xs font-medium text-rose-500'>
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
        ) : (
          <div className='space-y-1.5'>
            <label className='block text-xs font-medium text-slate-700'>
              <span className='me-1 text-rose-500'>*</span>验证码
            </label>
            <div className='flex gap-2'>
              <div className='relative flex flex-1 items-center'>
                <div className='pointer-events-none absolute start-3.5 text-slate-400'>
                  <KeyRound className='size-4' />
                </div>
                <input
                  type='text'
                  placeholder='6 位验证码'
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  inputMode='numeric'
                  className='auth-input'
                />
              </div>
              <button
                type='button'
                onClick={handleSendCode}
                disabled={countdown > 0}
                className='shrink-0 cursor-pointer rounded-2xl bg-slate-900 px-4 py-3 text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-50'
              >
                {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
              </button>
            </div>
          </div>
        )}

        {/* Global Root Error */}
        {form.formState.errors.root?.message && (
          <p
            className='rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-center text-xs font-medium text-rose-500'
            role='alert'
          >
            {form.formState.errors.root.message}
          </p>
        )}

        <button type='submit' disabled={isLoading} className='auth-cta mt-2'>
          {isLoading ? (
            <Loader2 className='size-5 animate-spin text-white' />
          ) : (
            <>
              <span>登录</span>
              <ArrowRight className='size-4' />
            </>
          )}
        </button>
      </form>

      <Dialog open={captchaOpen} onOpenChange={setCaptchaOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>安全验证</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <button
              type='button'
              className='flex h-16 w-full items-center justify-center rounded-md border bg-slate-50'
              onClick={() => void refreshCaptcha()}
              title='点击刷新图形验证码'
            >
              {captcha ? (
                <img
                  src={captcha.captcha_image}
                  alt='图形验证码'
                  className='h-12 w-[140px]'
                />
              ) : (
                <Loader2 className='size-5 animate-spin' />
              )}
            </button>
            <input
              className='auth-input'
              autoFocus
              maxLength={4}
              inputMode='numeric'
              placeholder='请输入图中 4 位数字'
              value={captchaCode}
              onChange={(event) =>
                setCaptchaCode(event.target.value.replace(/\D/g, ''))
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleCaptchaSubmit()
                }
              }}
            />
            <button
              type='button'
              className='auth-cta'
              disabled={captchaLoading || captchaCode.length !== 4}
              onClick={() => void handleCaptchaSubmit()}
            >
              {captchaLoading ? (
                <Loader2 className='size-5 animate-spin' />
              ) : (
                '确认并发送'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
