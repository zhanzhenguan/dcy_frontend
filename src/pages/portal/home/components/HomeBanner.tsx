import { Link } from '@tanstack/react-router'
import { ArrowRight, Bell, Check, Play } from 'lucide-react'
import { PortalAiAmbient } from '@/components/common'
import { scrollToSection } from '@/utils/scrollToSection'

const focusTags = [
  '跨境电商AI赋能',
  '政企文旅',
  '垂直类大模型',
  '智能视频',
  'AI实战训练',
] as const

function BannerVisual() {
  return (
    <div className='home-banner__visual' aria-hidden>
      {/* Inner dashboard + widgets tilt together */}
      <div className='home-banner__tilt'>
        <div className='home-banner__dashboard'>
          <div className='home-banner__dash-head'>
            <div>
              <p className='home-banner__dash-title'>大词源 AI</p>
              <div className='home-banner__legend'>
                <span>
                  <i className='home-banner__dot home-banner__dot--blue' />
                  跨境电商AI赋能
                </span>
                <span>
                  <i className='home-banner__dot home-banner__dot--purple' />
                  政企文旅AI宣传解决方案
                </span>
                <span>
                  <i className='home-banner__dot home-banner__dot--green' />
                  智能视频
                </span>
              </div>
            </div>
          </div>

          <div className='home-banner__chart'>
            <svg viewBox='0 0 360 160' className='home-banner__chart-svg'>
              <defs>
                <linearGradient id='bannerArea' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='color-mix(in srgb, var(--portal-blue) 28%, transparent)' />
                  <stop offset='100%' stopColor='color-mix(in srgb, var(--portal-purple) 2%, transparent)' />
                </linearGradient>
              </defs>
              <path
                d='M0 110 C40 96, 70 70, 110 78 C150 86, 180 48, 220 58 C260 68, 300 36, 360 44 L360 160 L0 160 Z'
                fill='url(#bannerArea)'
              />
              <path
                d='M0 110 C40 96, 70 70, 110 78 C150 86, 180 48, 220 58 C260 68, 300 36, 360 44'
                fill='none'
                stroke='var(--portal-blue)'
                strokeWidth='3'
                strokeLinecap='round'
              />
              <path
                d='M0 128 C50 118, 90 102, 130 108 C170 114, 210 88, 250 96 C290 104, 330 78, 360 86'
                fill='none'
                stroke='var(--portal-purple)'
                strokeWidth='2.5'
                strokeDasharray='6 6'
                strokeLinecap='round'
              />
              <g fill='var(--portal-blue)'>
                <circle cx='110' cy='78' r='4' />
                <circle cx='220' cy='58' r='4' />
                <circle cx='300' cy='36' r='4' />
              </g>
              <g fill='var(--portal-green)'>
                <rect x='28' y='138' width='14' height='14' rx='3' />
                <rect x='56' y='132' width='14' height='20' rx='3' />
                <rect x='84' y='136' width='14' height='16' rx='3' />
                <rect x='112' y='128' width='14' height='24' rx='3' />
                <rect x='140' y='134' width='14' height='18' rx='3' opacity='0.7' />
                <rect x='168' y='126' width='14' height='26' rx='3' />
                <rect x='196' y='130' width='14' height='22' rx='3' opacity='0.75' />
                <rect x='224' y='122' width='14' height='30' rx='3' />
                <rect x='252' y='128' width='14' height='24' rx='3' opacity='0.8' />
                <rect x='280' y='118' width='14' height='34' rx='3' />
                <rect x='308' y='124' width='14' height='28' rx='3' />
              </g>
            </svg>
          </div>

          <div className='home-banner__widgets'>
            <article className='home-banner__widget'>
              <p>实战训练</p>
              <strong>AI</strong>
              <svg viewBox='0 0 80 24' className='home-banner__spark'>
                <path
                  d='M0 18 C12 14, 18 8, 28 10 C38 12, 46 4, 56 6 C66 8, 72 3, 80 5'
                  fill='none'
                  stroke='var(--portal-blue)'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
              </svg>
            </article>
            <article className='home-banner__widget home-banner__widget--ring'>
              <p>垂直模型</p>
              <div className='home-banner__ring'>
                <svg viewBox='0 0 48 48'>
                  <circle cx='24' cy='24' r='18' className='home-banner__ring-track' />
                  <circle cx='24' cy='24' r='18' className='home-banner__ring-value' />
                </svg>
                <span>80%</span>
              </div>
            </article>
            <article className='home-banner__widget'>
              <p>智能视频</p>
              <strong className='home-banner__widget-up'>+32%</strong>
              <div className='home-banner__mini-bars' aria-hidden>
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </article>
          </div>
        </div>
      </div>

      {/* Outer floats: flat, bob only — outside tilt layer */}
      <div className='home-banner__float home-banner__float--sync'>
        <div className='home-banner__float-row'>
          <span className='home-banner__float-icon home-banner__float-icon--ok'>
            <Check className='size-3.5' strokeWidth={2.5} />
          </span>
          <span className='home-banner__float-title'>实时同步</span>
        </div>
        <span className='home-banner__float-pill'>+24.5%</span>
      </div>

      <div className='home-banner__float home-banner__float--active'>
        <p>现在生效</p>
        <strong>1,247</strong>
      </div>

      <div className='home-banner__float home-banner__float--note'>
        <span className='home-banner__float-icon home-banner__float-icon--bell'>
          <Bell className='size-3.5' strokeWidth={2} />
        </span>
        <span className='home-banner__float-copy'>
          <strong>新的里程碑！</strong>
          <span>达到 1 万用户</span>
        </span>
      </div>
    </div>
  )
}

export const HomeBanner = () => {
  return (
    <section
      id="home"
      className='home-banner relative flex w-full flex-col justify-start overflow-x-clip pt-[5.25rem] pb-10 sm:pt-[5.5rem] sm:pb-12 lg:justify-center lg:pt-[5.25rem] lg:pb-10'
      aria-label='大词源 AI 品牌主视觉'
    >
      <div className='home-banner__bg' aria-hidden>
        <PortalAiAmbient variant='hero' />
      </div>

      <div className='relative z-10 mx-auto grid w-full min-w-0 max-w-7xl flex-1 items-center gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-12 xl:gap-16'>
        <div className='home-banner__copy min-w-0'>
          <div className='home-banner__heading home-banner__enter home-banner__enter--2'>
            <h1 className='home-banner__title'>
              大词源<span className='home-banner__gradient-text'>AI</span>
            </h1>
            <p className='home-banner__company'>厦门大词源人工智能有限公司</p>
          </div>

          <div className='home-banner__lead home-banner__enter home-banner__enter--3'>
            <p className='home-banner__slogan'>专注垂直类行业大模型实战化训练</p>
            <p className='home-banner__slogan home-banner__slogan--sm'>
              精准服务跨境卖家 · 政府机构 · 各行业客户
            </p>
          </div>

          <div className='home-banner__actions home-banner__enter home-banner__enter--5'>
            <Link to='/sign-up' className='home-banner__cta home-banner__cta--primary'>
              9.9元试用
              <ArrowRight className='size-4' strokeWidth={2.25} aria-hidden />
            </Link>
            <a
              href='#about'
              className='home-banner__cta home-banner__cta--secondary'
              onClick={(event) => {
                event.preventDefault()
                scrollToSection('about')
                window.history.pushState(null, '', '#about')
              }}
            >
              <Play className='size-4' strokeWidth={2} aria-hidden />
              观看演示
            </a>
          </div>

          <ul className='home-banner__tags home-banner__enter home-banner__enter--6'>
            {focusTags.map((tag) => (
              <li key={tag}>
                <span className='home-banner__tag'>{tag}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className='home-banner__enter home-banner__enter--4 relative z-10 min-w-0 w-full'>
          <BannerVisual />
        </div>
      </div>
    </section>
  )
}
