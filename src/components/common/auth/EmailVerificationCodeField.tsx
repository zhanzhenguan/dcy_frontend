import { useEffect, useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import { getCaptcha, sendEmailCode } from '@/services/api/authApi'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type EmailVerificationCodeFieldProps = {
  email: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

export const EmailVerificationCodeField = ({
  email,
  value,
  disabled = false,
  onChange,
}: EmailVerificationCodeFieldProps) => {
  const [countdown, setCountdown] = useState(0)
  const [captcha, setCaptcha] = useState<Awaited<
    ReturnType<typeof getCaptcha>
  > | null>(null)
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaOpen, setCaptchaOpen] = useState(false)
  const [captchaLoading, setCaptchaLoading] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setInterval(
      () => setCountdown((current) => Math.max(0, current - 1)),
      1000
    )
    return () => window.clearInterval(timer)
  }, [countdown])

  async function refreshCaptcha() {
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

  async function openCaptcha() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('请先输入有效的邮箱地址')
      return
    }
    setCaptchaOpen(true)
    await refreshCaptcha()
  }

  async function sendCode() {
    if (!captcha || !captchaCode.trim()) return
    setCaptchaLoading(true)
    try {
      const result = await sendEmailCode({
        email: email.trim(),
        captcha_id: captcha.captcha_id,
        captcha_code: captchaCode.trim(),
      })
      setCountdown(result.retry_after)
      setCaptchaOpen(false)
      toast.success('邮箱验证码已发送')
    } catch (error) {
      toast.error(getApiErrorMessage(error, '邮箱验证码发送失败'))
      await refreshCaptcha()
    } finally {
      setCaptchaLoading(false)
    }
  }

  return (
    <>
      <div className='space-y-1.5'>
        <label className='block text-xs font-medium text-slate-700'>
          <span className='me-1 text-rose-500'>*</span>邮箱验证码
        </label>
        <div className='flex gap-2'>
          <div className='relative flex flex-1 items-center'>
            <KeyRound className='pointer-events-none absolute start-3.5 size-4 text-slate-400' />
            <input
              type='text'
              inputMode='numeric'
              autoComplete='one-time-code'
              maxLength={6}
              placeholder='输入 6 位验证码'
              value={value}
              onChange={(event) =>
                onChange(event.target.value.replace(/\D/g, ''))
              }
              disabled={disabled}
              className='auth-input'
            />
          </div>
          <button
            type='button'
            onClick={() => void openCaptcha()}
            disabled={disabled || countdown > 0}
            className='shrink-0 rounded-md bg-slate-900 px-3 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
          </button>
        </div>
      </div>

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
              {captchaLoading && !captcha ? (
                <Loader2 className='size-5 animate-spin text-slate-500' />
              ) : captcha ? (
                <img
                  src={captcha.captcha_image}
                  alt='图形验证码，点击可刷新'
                  className='h-12 max-w-full object-contain'
                />
              ) : null}
            </button>
            <input
              type='text'
              autoFocus
              placeholder='请输入图形验证码'
              value={captchaCode}
              onChange={(event) => setCaptchaCode(event.target.value)}
              className='auth-input'
            />
            <button
              type='button'
              onClick={() => void sendCode()}
              disabled={captchaLoading || !captchaCode.trim()}
              className='auth-cta'
            >
              {captchaLoading ? (
                <Loader2 className='size-5 animate-spin text-white' />
              ) : (
                '发送验证码'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
