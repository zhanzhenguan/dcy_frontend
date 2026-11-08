import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { KeyRound, Loader2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { getApiErrorMessage } from '@/services/api/apiError'
import { getCaptcha, sendSmsCode } from '@/services/api/authApi'
import { bindUserPhone, changeUserPhone } from '@/services/api/userProfileApi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ChangePhoneDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPhone?: string
}

export const ChangePhoneDialog = ({
  open,
  onOpenChange,
  currentPhone = '',
}: ChangePhoneDialogProps) => {
  const isChange = Boolean(currentPhone)
  const updateProfile = useAuthStore((state) => state.auth.updateProfile)
  const queryClient = useQueryClient()
  const [oldPhone, setOldPhone] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [captchaOpen, setCaptchaOpen] = useState(false)
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [captchaCode, setCaptchaCode] = useState('')
  const [captcha, setCaptcha] = useState<Awaited<
    ReturnType<typeof getCaptcha>
  > | null>(null)

  const resetForm = () => {
    setOldPhone('')
    setPhone('')
    setCode('')
    setCountdown(0)
    setCaptchaOpen(false)
    setCaptchaCode('')
    setCaptcha(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

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
      toast.error(isChange ? '请输入正确的新手机号' : '请输入正确的手机号')
      return
    }
    if (isChange && phone === currentPhone.replace(/\D/g, '')) {
      toast.error('新手机号不能与当前手机号相同')
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

  const handleSubmit = async () => {
    if (isChange) {
      if (!/^1[3-9]\d{9}$/.test(oldPhone)) {
        toast.error('请输入正确的旧手机号')
        return
      }
      if (oldPhone !== currentPhone.replace(/\D/g, '')) {
        toast.error('旧手机号不正确')
        return
      }
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error(isChange ? '请输入正确的新手机号' : '请输入正确的手机号')
      return
    }
    if (isChange && phone === oldPhone) {
      toast.error('新手机号不能与旧手机号相同')
      return
    }
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('请输入 6 位短信验证码')
      return
    }
    setSubmitting(true)
    try {
      const profile = isChange
        ? await changeUserPhone({
            old_phone: oldPhone,
            new_phone: phone,
            code: code.trim(),
          })
        : await bindUserPhone({
            phone,
            code: code.trim(),
          })
      queryClient.setQueryData(['user-profile'], profile)
      updateProfile({
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
        email: profile.email,
        phone: profile.phone,
      })
      toast.success(isChange ? '手机号已更换' : '手机号已绑定')
      handleOpenChange(false)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, isChange ? '更换手机号失败' : '绑定手机号失败')
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className='space-y-4 rounded-2xl p-6 sm:max-w-md'>
          <DialogHeader className='space-y-1.5'>
            <DialogTitle className='text-lg font-bold'>
              {isChange ? '更换手机号' : '绑定手机号'}
            </DialogTitle>
            <DialogDescription className='text-xs'>
              {isChange
                ? '输入当前绑定的旧手机号与新手机号，完成短信验证后即可更换'
                : '绑定手机号后可用于验证码登录同一账号'}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            {isChange && (
              <div className='space-y-1.5'>
                <Label htmlFor='change-old-phone'>旧手机号</Label>
                <div className='relative'>
                  <Smartphone className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
                  <Input
                    id='change-old-phone'
                    type='tel'
                    inputMode='numeric'
                    maxLength={11}
                    autoComplete='tel'
                    placeholder='请输入当前绑定的手机号'
                    className='pl-9'
                    value={oldPhone}
                    onChange={(event) =>
                      setOldPhone(event.target.value.replace(/\D/g, ''))
                    }
                  />
                </div>
              </div>
            )}

            <div className='space-y-1.5'>
              <Label htmlFor='change-phone'>
                {isChange ? '新手机号' : '手机号'}
              </Label>
              <div className='relative'>
                <Smartphone className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
                <Input
                  id='change-phone'
                  type='tel'
                  inputMode='numeric'
                  maxLength={11}
                  autoComplete='tel'
                  placeholder={isChange ? '请输入新手机号' : '请输入手机号'}
                  className='pl-9'
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/\D/g, ''))
                  }
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='change-phone-code'>短信验证码</Label>
              <div className='flex gap-2'>
                <div className='relative min-w-0 flex-1'>
                  <KeyRound className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
                  <Input
                    id='change-phone-code'
                    type='text'
                    inputMode='numeric'
                    maxLength={6}
                    placeholder='6 位验证码'
                    className='pl-9'
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, ''))
                    }
                  />
                </div>
                <Button
                  type='button'
                  variant='outline'
                  className='shrink-0'
                  disabled={countdown > 0}
                  onClick={() => void handleSendCode()}
                >
                  {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className='border-t pt-2'>
            <Button
              type='button'
              variant='outline'
              className='rounded-xl text-xs'
              onClick={() => handleOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type='button'
              className='gap-1.5 rounded-xl px-5 text-xs font-bold'
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting && <Loader2 className='size-3.5 animate-spin' />}
              {isChange ? '确认更换' : '确认绑定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={captchaOpen} onOpenChange={setCaptchaOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>图形验证码</DialogTitle>
            <DialogDescription>完成验证后发送短信验证码</DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            <button
              type='button'
              className='bg-muted flex h-16 w-full items-center justify-center overflow-hidden rounded-lg border'
              onClick={() => void refreshCaptcha()}
              disabled={captchaLoading}
            >
              {captcha?.captcha_image ? (
                <img
                  src={captcha.captcha_image}
                  alt='图形验证码'
                  className='h-full object-contain'
                />
              ) : (
                <span className='text-muted-foreground text-xs'>
                  {captchaLoading ? '加载中…' : '点击刷新'}
                </span>
              )}
            </button>
            <Input
              value={captchaCode}
              onChange={(event) => setCaptchaCode(event.target.value)}
              placeholder='请输入图形验证码'
              autoComplete='off'
            />
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setCaptchaOpen(false)}
            >
              取消
            </Button>
            <Button
              type='button'
              disabled={captchaLoading || !captchaCode.trim()}
              onClick={() => void handleCaptchaSubmit()}
            >
              {captchaLoading && <Loader2 className='size-3.5 animate-spin' />}
              确认发送
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
