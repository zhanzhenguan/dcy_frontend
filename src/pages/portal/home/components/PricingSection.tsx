import { Link } from '@tanstack/react-router';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/utils/utils';
import { revealDelay, ScrollReveal } from './ScrollReveal';


type Plan = {
  name: string
  price: string
  period: string
  credits: string
  videoLead: string
  videoMid: string
  videoTail: string
  features: string[]
  cta: string
  to: '/sign-up' | '/subscriptions'
  popular?: boolean
}

const plans: Plan[] = [
  {
    name: '入门版',
    price: '¥99',
    period: '/月',
    credits: '100',
    videoLead: '12',
    videoMid: '15',
    videoTail: '视频',
    features: [
      '15 秒 1080P 9:16 竖屏',
      'AI 脚本 + 多语种配音 + 字幕',
      '基础数据看板',
    ],
    cta: '¥9.9 试用',
    to: '/sign-up',
  },
  {
    name: '进阶版',
    price: '¥199',
    period: '/月',
    credits: '220',
    videoLead: '22',
    videoMid: '15',
    videoTail: '视频',
    features: [
      '15 秒 1080P 9:16 竖屏',
      'AI 脚本 + 多语种配音 + 字幕',
      '基础数据看板',
    ],
    cta: '¥9.9 试用',
    to: '/sign-up',
  },
  {
    name: '专业版',
    price: '¥399',
    period: '/月',
    credits: '450',
    videoLead: '30',
    videoMid: '15',
    videoTail: '视频',
    features: [
      '15 秒 1080P 9:16 竖屏',
      'AI 脚本 + 多语种配音 + 字幕',
      '基础数据看板',
    ],
    cta: '¥9.9 试用',
    to: '/sign-up',
    popular: true,
  },
  {
    name: '旗舰版',
    price: '¥599',
    period: '/月',
    credits: '700',
    videoLead: '30',
    videoMid: '15',
    videoTail: '视频',
    features: [
      '15 秒 1080P 9:16 竖屏',
      'AI 脚本 + 多语种配音 + 字幕',
      '基础数据看板',
    ],
    cta: '¥9.9 试用',
    to: '/sign-up',
  },
]

export const PricingSection = () => {
  return (
    <section
      id='pricing'
      className='pricing-section relative scroll-mt-24 py-16 sm:py-20 lg:py-24'
      aria-labelledby='pricing-heading'
    >
      <ScrollReveal className='mx-auto max-w-7xl px-4 sm:px-6'>
        <header
          className='portal-reveal__item portal-reveal__item--fade mx-auto mb-12 max-w-2xl text-center sm:mb-14'
          style={revealDelay(0)}
        >
          <h2
            id='pricing-heading'
            className='text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl'
          >
            简单透明的
            <span className='pricing-section__gradient-text'>价格方案</span>
          </h2>
          <p className='mt-3 text-base leading-relaxed text-slate-500 sm:text-lg'>
            选择适合你的套餐。所有方案均可 ¥9.9 试用。
          </p>
        </header>

        <ul className='pricing-section__grid'>
          {plans.map((plan, index) => (
            <li
              key={plan.name}
              className={cn(
                'portal-reveal__item portal-reveal__item--blur relative flex',
                plan.popular && 'pricing-section__item--popular'
              )}
              style={revealDelay(1 + index, 0.18)}
            >
              {plan.popular && (
                <span className='pricing-section__badge'>推荐</span>
              )}
              <article
                className={cn(
                  'pricing-section__card',
                  plan.popular && 'pricing-section__card--popular'
                )}
              >
                <div className='pricing-section__head'>
                  <h3 className='pricing-section__name'>{plan.name}</h3>
                  <p className='pricing-section__price'>
                    <span className='pricing-section__price-value'>{plan.price}</span>
                    <span className='pricing-section__price-period'>{plan.period}</span>
                  </p>

                  <div className='pricing-section__credits'>
                    <p className='pricing-section__credits-num'>{plan.credits}</p>
                    <p className='pricing-section__credits-label'>积分 / 月</p>
                  </div>

                </div>

                <ul className='pricing-section__features'>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check
                        className='size-4 shrink-0 text-emerald-500'
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.to}
                  className={cn(
                    'pricing-section__cta',
                    plan.popular
                      ? 'pricing-section__cta--primary'
                      : 'pricing-section__cta--outline'
                  )}
                >
                  {plan.cta}
                  <ArrowRight className='size-4' strokeWidth={2.25} aria-hidden />
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </ScrollReveal>
    </section>
  )
}