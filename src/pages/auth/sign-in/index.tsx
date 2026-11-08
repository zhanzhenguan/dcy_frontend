import { useSearch } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { AuthLayout } from '../AuthLayout'
import { AuthPanel } from '../components/AuthPanel'
import { UserAuthForm } from './components/UserAuthForm'

export const SignIn = () => {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <AuthPanel
        title='登录'
        description='登录到 大词源 AI 平台'
        footer={
          <p className='text-[11px] leading-tight text-slate-400'>
            点击登录即表示您同意我们的{' '}
            <a href='/terms' className='text-slate-500 hover:underline'>
              服务条款
            </a>{' '}
            和{' '}
            <a href='/privacy' className='text-slate-500 hover:underline'>
              隐私政策
            </a>
            。
          </p>
        }
      >
        {redirect ? (
          <div className='mb-5 flex items-center gap-2.5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-medium text-violet-900'>
            <Info className='size-4 shrink-0 text-[var(--portal-purple)]' />
            <span>请先登录以访问所需页面</span>
          </div>
        ) : null}

        {/* Google 授权登录暂隐藏，后续再开放
        <div className='mb-5'>
          <button
            type='button'
            onClick={() => {}}
            className='group flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs transition-all duration-200 hover:bg-slate-50 active:bg-slate-100 sm:text-sm'
          >
            <svg className='size-4 transition-transform group-hover:scale-110' viewBox='0 0 24 24'>
              <path
                fill='#4285F4'
                d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
              />
              <path
                fill='#34A853'
                d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
              />
              <path
                fill='#FBBC05'
                d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z'
              />
              <path
                fill='#EA4335'
                d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z'
              />
            </svg>
            <span>使用 Google 账号登录</span>
          </button>
        </div>

        <div className='relative my-5 flex items-center justify-center'>
          <div className='w-full border-t border-slate-200' />
          <span className='absolute bg-white px-3 text-xs font-medium text-slate-400'>或</span>
        </div>
        */}

        <UserAuthForm redirectTo={redirect} />
      </AuthPanel>
    </AuthLayout>
  )
}
