import { Link } from '@tanstack/react-router'
import { AuthLayout } from '../AuthLayout'
import { AuthPanel } from '../components/AuthPanel'
import { OtpForm } from './components/OtpForm'

export const Otp = () => {
  return (
    <AuthLayout>
      <AuthPanel
        title='验证码确认'
        description='请输入发送至邮箱的 6 位验证码'
        badge='安全验证'
        footer={
          <p className='text-[11px] leading-tight text-slate-400'>
            没有收到？{' '}
            <Link to='/sign-in' className='auth-link text-[11px]'>
              重新发送 / 返回登录
            </Link>
          </p>
        }
      >
        <OtpForm />
      </AuthPanel>
    </AuthLayout>
  )
}
