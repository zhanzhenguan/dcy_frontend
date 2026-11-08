import { Link } from '@tanstack/react-router'
import { AuthLayout } from '../AuthLayout'
import { AuthPanel } from '../components/AuthPanel'
import { ForgotPasswordForm } from './components/ForgPassForm'

export const ForgotPassword = () => {
  return (
    <AuthLayout>
      <AuthPanel
        title='找回密码'
        description='输入注册邮箱，我们将发送重置链接'
        badge='账号安全防护'
        footer={
          <p className='text-[11px] leading-tight text-slate-400'>
            想起密码了？{' '}
            <Link to='/sign-in' className='auth-link text-[11px]'>
              返回登录
            </Link>
            <br />
            还没有账号？{' '}
            <Link to='/sign-up' className='auth-link text-[11px]'>
              立即注册
            </Link>
          </p>
        }
      >
        <ForgotPasswordForm />
      </AuthPanel>
    </AuthLayout>
  )
}
