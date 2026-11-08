import React from 'react'
import { PortalLogo } from '@/components/common'
import { ShieldCheck, Layers, Video, CheckCircle2 } from 'lucide-react'
import './auth.scss'

type AuthLayoutProps = {
  children: React.ReactNode
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div
      className='auth-theme relative flex min-h-svh w-full flex-col overflow-hidden font-sans antialiased selection:bg-[var(--portal-purple)] selection:text-white lg:flex-row'
      style={{ background: 'var(--portal-hero-deep)' }}
    >
      <div
        className='pointer-events-none absolute inset-0 overflow-hidden'
        style={{ background: 'var(--portal-hero-bg)' }}
        aria-hidden
      />

      <div className='relative z-10 flex min-h-max w-full flex-1 flex-col justify-between p-6 sm:p-10 lg:min-h-svh lg:min-w-[32rem] lg:flex-[1.15] lg:p-12 xl:min-w-[36rem] xl:p-16'>
        <div className='flex items-center gap-3'>
          <div className='inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-xl'>
            <PortalLogo
              variant='app'
              showName={false}
              size={30}
              nameClassName='text-white'
            />
            <span className='text-sm font-bold tracking-tight'>大词源</span>
            <span className='text-slate-500'>|</span>
            <span className='font-normal text-slate-300'>AI 增长控制台</span>
          </div>
        </div>

        <div className='my-auto max-w-xl space-y-5 py-8 lg:space-y-6 lg:py-12'>
          <div className='inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-violet-100 backdrop-blur-md'>
            <CheckCircle2 className='size-3.5 text-sky-300' />
            <span>AI 矩阵视频全链路自动化工作流</span>
          </div>

          <h1 className='text-3xl leading-[1.15] font-black tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl'>
            登录您的智能 <br />
            <span className='bg-gradient-to-r from-sky-200 via-white to-violet-300 bg-clip-text text-transparent'>
              视频创作引擎
            </span>
          </h1>

          <p className='max-w-lg text-sm leading-relaxed font-normal text-slate-300/85 sm:text-base lg:text-lg'>
            返回 AI 工作区，继续管理爆款短视频文案、数字人播报、全网多账号自动发布。
          </p>
        </div>

        <div className='grid grid-cols-3 items-stretch gap-2.5 pt-4 sm:gap-3.5'>
          <div className='group relative flex h-full min-w-0 flex-col rounded-2xl border border-white/40 bg-white/95 p-3 text-slate-900 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white sm:p-4 xl:p-5'>
            <div className='mb-2.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-semibold text-[var(--portal-blue)] sm:mb-3 sm:size-9'>
              <Layers className='size-4 sm:size-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <h3 className='text-sm font-bold tracking-tight text-slate-900'>官方工作流</h3>
              <p className='mt-1 line-clamp-3 text-xs leading-relaxed text-slate-500'>
                连接抖音、TikTok、小红书账号，在统一工作区内完成智能生成与自动发布。
              </p>
            </div>
          </div>

          <div className='group relative flex h-full min-w-0 flex-col rounded-2xl border border-white/40 bg-white/95 p-3 text-slate-900 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white sm:p-4 xl:p-5'>
            <div className='mb-2.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 font-semibold text-[var(--portal-purple)] sm:mb-3 sm:size-9'>
              <Video className='size-4 sm:size-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <h3 className='text-sm font-bold tracking-tight text-slate-900'>批量生产</h3>
              <p className='mt-1 line-clamp-3 text-xs leading-relaxed text-slate-500'>
                从商品与灵感素材快速生成可复用的视频草稿，无需逐个搭建。
              </p>
            </div>
          </div>

          <div className='group relative flex h-full min-w-0 flex-col rounded-2xl border border-white/40 bg-white/95 p-3 text-slate-900 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white sm:p-4 xl:p-5'>
            <div className='mb-2.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-green-100 font-semibold text-[var(--portal-green)] sm:mb-3 sm:size-9'>
              <ShieldCheck className='size-4 sm:size-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <h3 className='text-sm font-bold tracking-tight text-slate-900'>账号安全</h3>
              <p className='mt-1 line-clamp-3 text-xs leading-relaxed text-slate-500'>
                支持密码、验证码与快捷登入，满足团队日常高效安全的访问需求。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className='relative z-20 flex w-full flex-1 items-center justify-center p-4 sm:p-6 lg:min-w-[22rem] lg:flex-1 lg:p-10'>
        <div className='w-full max-w-[460px] py-4'>{children}</div>
      </div>
    </div>
  )
}
