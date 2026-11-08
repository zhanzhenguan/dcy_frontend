import {
  Clapperboard,
  Globe2,
  Layers,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { revealDelay, ScrollReveal } from './ScrollReveal'

const capabilities: {
  title: string
  icon: LucideIcon
  tone: 'blue' | 'purple' | 'green'
}[] = [
  { title: '跨境卖家AI赋能', icon: Globe2, tone: 'blue' },
  { title: '政企文旅AI宣传', icon: ShieldCheck, tone: 'purple' },
  { title: '垂直类模型训练', icon: Layers, tone: 'green' },
  { title: 'AI视频生成', icon: Clapperboard, tone: 'blue' },
]

export const AboutSection = () => {
  return (
    <section
      id='about'
      className='about-section relative scroll-mt-24 py-16 sm:py-20 lg:py-24'
      aria-labelledby='about-heading'
    >
      <ScrollReveal className='mx-auto max-w-7xl px-4 sm:px-6'>
        <header
          className='portal-reveal__item portal-reveal__item--fade about-section__header mx-auto mb-12 max-w-2xl text-center sm:mb-14'
          style={revealDelay(0)}
        >
          <h2
            id='about-heading'
            className='about-section__heading mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl'
          >
            关于
            <span className='about-section__gradient-text'>我们</span>
          </h2>
          <p className='about-section__lead mt-3 text-base leading-relaxed text-slate-500 sm:text-lg'>
            专注垂直行业大模型落地，让人工智能真正服务于业务增长
          </p>
        </header>

        <div className='about-section__layout'>
          <div
            className='portal-reveal__item portal-reveal__item--from-left about-section__story'
            style={revealDelay(1)}
          >
            <p className='about-section__body'>
              大词源AI是厦门大词源人工智能有限公司旗下AI品牌，专注垂直类行业大模型的训练与应用落地。我们服务跨境卖家、政府机构以及金融、医疗、教育、制造等各行业客户，助力业务效率提升与智能化升级。
            </p>

            <aside className='about-section__quote'>
              <p>
                让AI真正落地——从跨境卖家视频智能生成服务，到政企文旅AI宣传解决方案，再到行业定制模型，我们始终以实战为导向。
              </p>
            </aside>
          </div>

          <ul className='about-section__grid'>
            {capabilities.map(({ title, icon: Icon, tone }, index) => (
              <li
                key={title}
                className='portal-reveal__item portal-reveal__item--scale'
                style={revealDelay(2 + index, 0.1)}
              >
                <article className={`about-section__card about-section__card--${tone}`}>
                  <span
                    className={`about-section__icon about-section__icon--${tone}`}
                    aria-hidden
                  >
                    <Icon className='size-5' strokeWidth={2} />
                  </span>
                  <h3 className='about-section__card-title'>{title}</h3>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </ScrollReveal>
    </section>
  )
}
