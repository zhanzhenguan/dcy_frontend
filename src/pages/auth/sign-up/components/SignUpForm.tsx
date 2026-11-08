import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/utils/utils'
import { EmailVerificationCodeField, PasswordInput } from '@/components/common'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  getGlobalInvitationCodeEnabled,
  getRegistrationEnabled,
  register,
} from '@/services/api/authApi'

const formSchema = z
  .object({
    nickname: z
      .string()
      .trim()
      .min(1, '请输入昵称')
      .min(2, '昵称至少 2 个字符')
      .max(32, '昵称不能超过 32 个字符'),
    email: z.email({
      error: (iss) =>
        iss.input === '' ? '请输入邮箱' : '请输入有效的邮箱地址',
    }),
    emailCode: z.string(),
    globalInvitationCode: z.string().trim().toUpperCase(),
    password: z.string().min(1, '请输入密码').min(7, '密码长度不能少于 7 位'),
    confirmPassword: z.string().min(1, '请确认密码'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  })

type SignUpFormProps = React.HTMLAttributes<HTMLFormElement> & {
  redirectTo?: string
  referralCode?: string
}

export const SignUpForm = ({
  className,
  redirectTo,
  referralCode,
  ...props
}: SignUpFormProps) => {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const globalInvitationCodeQuery = useQuery({
    queryKey: ['global-invitation-code-enabled'],
    queryFn: getGlobalInvitationCodeEnabled,
    retry: false,
  })
  const globalInvitationCodeEnabled =
    globalInvitationCodeQuery.data?.enabled !== false
  const registrationQuery = useQuery({
    queryKey: ['registration-enabled'],
    queryFn: getRegistrationEnabled,
    retry: false,
  })
  const requireEmailVerification =
    registrationQuery.data?.require_email_verification !== false

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nickname: '',
      email: '',
      emailCode: '',
      globalInvitationCode: '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    const globalInvitationCode = data.globalInvitationCode.trim().toUpperCase()
    if (
      globalInvitationCodeEnabled &&
      !/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(globalInvitationCode)
    ) {
      form.setError('globalInvitationCode', {
        message: '请输入 8 位有效邀请码',
      })
      return
    }
    if (requireEmailVerification && !/^\d{6}$/.test(data.emailCode)) {
      form.setError('emailCode', { message: '请输入 6 位邮箱验证码' })
      return
    }
    try {
      const session = await register({
        email: data.email.trim(),
        ...(requireEmailVerification ? { email_code: data.emailCode } : {}),
        password: data.password,
        nickname: data.nickname.trim(),
        global_invitation_code: globalInvitationCodeEnabled
          ? globalInvitationCode
          : undefined,
        ...(referralCode ? { referral_code: referralCode } : {}),
      })
      auth.setSession(session)

      const targetPath =
        redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : '/dashboard'
      await navigate({ to: targetPath, replace: true })
      toast.success(
        `注册成功，欢迎 ${session.user.nickname || session.user.email}`
      )
    } catch (error) {
      form.setError('root', {
        message: getApiErrorMessage(error, '注册失败，请稍后重试'),
      })
    }
  }

  const isLoading = form.formState.isSubmitting

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn('space-y-4', className)}
      {...props}
    >
      {referralCode ? (
        <p className='rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-900'>
          已填写邀请码：{referralCode}
        </p>
      ) : null}

      <div className='space-y-1.5'>
        <label className='block text-xs font-medium text-slate-700'>
          <span className='me-1 text-rose-500'>*</span>昵称
        </label>
        <div className='relative flex items-center'>
          <div className='pointer-events-none absolute start-3.5 text-slate-400'>
            <UserRound className='size-4' />
          </div>
          <input
            type='text'
            autoComplete='nickname'
            placeholder='怎么称呼你'
            className='auth-input'
            {...form.register('nickname')}
          />
        </div>
        {form.formState.errors.nickname && (
          <p className='ps-1 text-xs font-medium text-rose-500'>
            {form.formState.errors.nickname.message}
          </p>
        )}
      </div>

      <div className='space-y-1.5'>
        <label className='block text-xs font-medium text-slate-700'>
          <span className='me-1 text-rose-500'>*</span>邮箱
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

      {requireEmailVerification ? (
        <>
          <input type='hidden' {...form.register('emailCode')} />
          <EmailVerificationCodeField
            email={form.watch('email')}
            value={form.watch('emailCode')}
            disabled={isLoading}
            onChange={(value) =>
              form.setValue('emailCode', value, { shouldValidate: true })
            }
          />
          {form.formState.errors.emailCode && (
            <p className='ps-1 text-xs font-medium text-rose-500'>
              {form.formState.errors.emailCode.message}
            </p>
          )}
        </>
      ) : null}

      {globalInvitationCodeEnabled ? (
        <div className='space-y-1.5'>
          <label className='block text-xs font-medium text-slate-700'>
            <span className='me-1 text-rose-500'>*</span>邀请码
          </label>
          <div className='relative flex items-center'>
            <div className='pointer-events-none absolute start-3.5 text-slate-400'>
              <KeyRound className='size-4' />
            </div>
            <input
              type='text'
              autoComplete='off'
              spellCheck={false}
              maxLength={8}
              placeholder='请输入 8 位邀请码'
              className='auth-input uppercase'
              {...form.register('globalInvitationCode')}
            />
          </div>
          {form.formState.errors.globalInvitationCode && (
            <p className='ps-1 text-xs font-medium text-rose-500'>
              {form.formState.errors.globalInvitationCode.message}
            </p>
          )}
        </div>
      ) : null}

      <div className='space-y-1.5'>
        <label className='block text-xs font-medium text-slate-700'>
          <span className='me-1 text-rose-500'>*</span>密码
        </label>
        <div className='relative flex items-center'>
          <div className='pointer-events-none absolute start-3.5 z-10 text-slate-400'>
            <Lock className='size-4' />
          </div>
          <PasswordInput
            autoComplete='new-password'
            placeholder='至少 7 位密码'
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

      <div className='space-y-1.5'>
        <label className='block text-xs font-medium text-slate-700'>
          <span className='me-1 text-rose-500'>*</span>确认密码
        </label>
        <div className='relative flex items-center'>
          <div className='pointer-events-none absolute start-3.5 z-10 text-slate-400'>
            <Lock className='size-4' />
          </div>
          <PasswordInput
            autoComplete='new-password'
            placeholder='再次输入密码'
            className='w-full'
            inputClassName='auth-input !h-auto pe-12 dark:border-slate-200 dark:bg-white dark:text-slate-900'
            {...form.register('confirmPassword')}
          />
        </div>
        {form.formState.errors.confirmPassword && (
          <p className='ps-1 text-xs font-medium text-rose-500'>
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      {form.formState.errors.root?.message ? (
        <p
          className='rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-center text-xs font-medium text-rose-500'
          role='alert'
        >
          {form.formState.errors.root.message}
        </p>
      ) : null}

      <button type='submit' disabled={isLoading} className='auth-cta mt-2'>
        {isLoading ? (
          <Loader2 className='size-5 animate-spin text-white' />
        ) : (
          <>
            <span>创建账号</span>
            <ArrowRight className='size-4' />
          </>
        )}
      </button>
    </form>
  )
}
