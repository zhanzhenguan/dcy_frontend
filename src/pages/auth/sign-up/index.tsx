import { Link, useSearch } from '@tanstack/react-router'
import { AuthLayout } from '../AuthLayout'
import { AuthPanel } from '../components/AuthPanel'
import { SignUpForm } from './components/SignUpForm'

export const SignUp = () => {
  const { redirect, ref } = useSearch({ from: '/(auth)/sign-up' })

  return (
    <AuthLayout>
      <AuthPanel
        title='注册'
        description='创建 大词源 AI 平台账号'
        badge='开启 AI 增长之旅'
        footer={
          <p className='text-[11px] leading-tight text-slate-400'>
            注册即表示同意{' '}
            <a href='/terms' className='text-slate-500 hover:underline'>
              服务条款
            </a>{' '}
            与{' '}
            <a href='/privacy' className='text-slate-500 hover:underline'>
              隐私政策
            </a>
            。
            <br />
            已有账号？{' '}
            <Link to='/sign-in' className='auth-link text-[11px]'>
              立即登录
            </Link>
          </p>
        }
      >
        <SignUpForm redirectTo={redirect} referralCode={ref} />
      </AuthPanel>
    </AuthLayout>
  )
}
