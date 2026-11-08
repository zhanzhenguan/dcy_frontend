import {
  Clapperboard,
  Crosshair,
  FileScan,
  Gauge,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react'
import { revealDelay, ScrollReveal } from './ScrollReveal'

const services: {
  title: string
  desc: string
  icon: LucideIcon
  tone: 'blue' | 'purple' | 'green'
}[] = [
  {
    title: '跨境卖家AI赋能',
    desc: '为各大跨境卖家提供一站式AI解决方案，包括多模型AI智能视频生成、AI商品描述生成与本土化翻译、跨境市场趋势分析与选品建议、跨境平台直连发布等服务，帮助卖家突破语言与文化壁垒，精准触达全球市场，大幅提升海外运营效率与转化率。',
    icon: Gauge,
    tone: 'blue',
  },
  {
    title: '政企文旅AI宣传解决方案',
    desc: '为政企量身打造AI文旅宣传解决方案，以智能AI视频生成为核心场景，通过训练垂直模型自动生成视频脚本，一键生成高质量宣传视频。用AI技术赋能政企文旅宣传数字化升级，提升工作效率，大幅节约制作成本。',
    icon: FileScan,
    tone: 'purple',
  },
  {
    title: '垂直类模型训练',
    desc: '针对各大跨境卖家、政府等官方机构及金融、医疗、教育、制造等垂直行业，进行大模型的精细化调优与实战化训练。通过行业数据标注、场景化微调与持续迭代，打造高精度、高可靠性的行业专属AI模型，精准辅助行业客户业务决策与智能升级。',
    icon: LayoutGrid,
    tone: 'green',
  },
  {
    title: '智能视频生成',
    desc: '打通视频创作全流程，从脚本、分镜到视频生成一气呵成。内置先进AI模型，支持AI分析、脚本调优、数字人等多种智能内容创作能力，为跨境卖家提供多种营销视频，为政企提供文旅宣传动画，满足多元创意需求。',
    icon: Clapperboard,
    tone: 'blue',
  },
  {
    title: 'AI场景落地',
    desc: '为跨境卖家、政府机构及各行业企业提供从模型训练到业务部署的全链路服务。深入理解客户业务场景，精准适配行业需求，将AI能力无缝融入实际业务流程，实现真正的智能化升级与降本增效，持续提供长期稳定的技术支持与迭代优化。',
    icon: Crosshair,
    tone: 'purple',
  },
]

export const ServicesSection = () => {
  return (
    <section
      id='services'
      className='services-section relative scroll-mt-24 py-16 sm:py-20 lg:py-24'
      aria-labelledby='services-heading'
    >
      <ScrollReveal className='mx-auto max-w-7xl px-4 sm:px-6'>
        <header
          className='portal-reveal__item portal-reveal__item--fade services-section__header mx-auto mb-12 max-w-2xl text-center sm:mb-14'
          style={revealDelay(0)}
        >
          <h2
            id='services-heading'
            className='mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl'
          >
            核心
            <span className='services-section__gradient-text'>业务</span>
          </h2>
          <p className='mt-3 text-base leading-relaxed text-slate-500 sm:text-lg'>
            覆盖从模型训练到业务落地的完整能力，助力行业智能化升级
          </p>
        </header>

        <ul className='services-section__grid'>
          {services.map(({ title, desc, icon: Icon, tone }, index) => (
            <li
              key={title}
              className='portal-reveal__item portal-reveal__item--slide-x-left'
              style={revealDelay(1 + index, 0.1)}
            >
              <article
                className={`services-section__card services-section__card--${tone}`}
              >
                <div className='services-section__card-top'>
                  <span
                    className={`services-section__icon services-section__icon--${tone}`}
                    aria-hidden
                  >
                    <Icon className='size-5' strokeWidth={2} />
                  </span>
                  <span className='services-section__index' aria-hidden>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className='services-section__title'>{title}</h3>
                <p className='services-section__desc'>{desc}</p>
              </article>
            </li>
          ))}
        </ul>
      </ScrollReveal>
    </section>
  )
}
