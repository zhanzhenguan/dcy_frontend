import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, KeyRound, Loader2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import type { AuthSession } from '@/stores/authStore'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  getCaptcha,
  getGlobalInvitationCodeEnabled,
  sendSmsCode,
  smsLoginViaTenantInvitation,
} from '@/services/api/authApi'
import { cn } from '@/utils/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isAlreadyEnterpriseMemberMessage } from '@/utils/invitationJoinMessages'

type InvitationSmsFormProps = {
  inviteCode: string
  onSuccess: (session: AuthSession) => void | Promise<void>
  onAlreadyMember?: () => void | Promise<void>
  className?: string
}

export const InvitationSmsForm = ({
  inviteCode,
  onSuccess,
  onAlreadyMember,
  className,
}: InvitationSmsFormProps) => {
  const globalInvitationCodeQuery = useQuery({
    queryKey: ['global-invitation-code-enabled'],
    queryFn: getGlobalInvitationCodeEnabled,
    retry: false,
  })
  const globalInvitationCodeEnabled =
    globalInvitationCodeQuery.data?.enabled !== false
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [globalInvitationCode, setGlobalInvitationCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [captcha, setCaptcha] = useState<Awaited<
    ReturnType<typeof getCaptcha>
  > | null>(null)
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaOpen, setCaptchaOpen] = useState(false)
  const [captchaLoading, setCaptchaLoading] = useState(false)

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
    } catch (err) {
      toast.error(getApiErrorMessage(err, '图形验证码加载失败'))
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
    } catch (err) {
      toast.error(getApiErrorMessage(err, '验证码发送失败'))
      await refreshCaptcha()
    } finally {
      setCaptchaLoading(false)
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }
    if (!/^\d{4,6}$/.test(code.trim())) {
      setError('请输入短信验证码')
      return
    }
    const normalizedInvitationCode = globalInvitationCode.trim().toUpperCase()
    if (
      globalInvitationCodeEnabled &&
      !/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(normalizedInvitationCode)
    ) {
      setError('请输入 8 位有效邀请码')
      return
    }
    setSubmitting(true)
    try {
      const session = await smsLoginViaTenantInvitation(inviteCode, {
        phone,
        code: code.trim(),
        global_invitation_code: globalInvitationCodeEnabled
          ? normalizedInvitationCode
          : undefined,
      })
      await onSuccess(session)
    } catch (err) {
      const message = getApiErrorMessage(err, '登录并加入企业失败')
      if (onAlreadyMember && isAlreadyEnterpriseMemberMessage(message)) {
        await onAlreadyMember()
        return
      }
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className={cn('space-y-3.5', className)}>
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

        <div className='space-y-1.5'>
          <label className='block text-xs font-medium text-slate-700'>
            <span className='me-1 text-rose-500'>*</span>验证码
          </label>
          <div className='flex gap-2'>
            <div className='relative flex flex-1 items-center'>
              <KeyRound className='pointer-events-none absolute start-3.5 size-4 text-slate-400' />
              <input
                type='text'
                placeholder='6 位验证码'
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                inputMode='numeric'
                className='auth-input'
              />
            </div>
            <button
              type='button'
              onClick={() => void handleSendCode()}
              disabled={countdown > 0}
              className='shrink-0 cursor-pointer rounded-2xl bg-slate-900 px-4 py-3 text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-50'
            >
              {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
            </button>
          </div>
        </div>

        {globalInvitationCodeEnabled ? (
          <div className='space-y-1.5'>
            <label className='block text-xs font-medium text-slate-700'>
              <span className='me-1 text-rose-500'>*</span>邀请码
            </label>
            <div className='relative flex items-center'>
              <KeyRound className='pointer-events-none absolute start-3.5 size-4 text-slate-400' />
              <input
                type='text'
                autoComplete='off'
                spellCheck={false}
                maxLength={8}
                placeholder='请输入 8 位邀请码'
                value={globalInvitationCode}
                onChange={(event) =>
                  setGlobalInvitationCode(
                    event.target.value
                      .toUpperCase()
                      .replace(/[^A-HJ-NP-Z2-9]/g, '')
                  )
                }
                className='auth-input uppercase'
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <p
            className='rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-center text-xs font-medium text-rose-500'
            role='alert'
          >
            {error}
          </p>
        ) : null}

        <button type='submit' disabled={submitting} className='auth-cta mt-1'>
          {submitting ? (
            <Loader2 className='size-5 animate-spin text-white' />
          ) : (
            <>
              <span>短信登录并加入</span>
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
    </>
  )
}
