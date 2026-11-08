import { Building2, Flag, Mail } from 'lucide-react'
import { revealDelay, ScrollReveal } from './ScrollReveal'
import mapImage from '@/assets/images/map.jpg'

const contactItems = [
  {
    icon: Building2,
    label: '公司名称',
    value: '厦门大词源人工智能有限公司',
    href: undefined,
  },
  {
    icon: Flag,
    label: '公司地址',
    value: '福建省厦门市集美区软件园三期F区F06栋\n福建省（厦门）人工智能产业园',
    href: undefined,
  },
  {
    icon: Mail,
    label: '企业邮箱',
    value: 'contact@WynnerAI.com',
    href: 'mailto:contact@WynnerAI.com',
  },
] as const

export const ContactSection = () => {
  return (
    <section
      id='contact'
      className='contact-section relative scroll-mt-24 py-16 sm:py-20 lg:py-24'
      aria-labelledby='contact-heading'
    >
      <ScrollReveal className='mx-auto max-w-7xl px-4 sm:px-6'>
        <header
          className='portal-reveal__item portal-reveal__item--fade contact-section__header mx-auto mb-12 max-w-2xl text-center sm:mb-14'
          style={revealDelay(0)}
        >
          <h2
            id='contact-heading'
            className='contact-section__heading mt-4 text-3xl font-bold tracking-tight sm:text-4xl'
          >
            联系
            <span className='contact-section__gradient-text'>我们</span>
          </h2>
          <p className='contact-section__lead mt-3 text-base leading-relaxed sm:text-lg'>
            无论是产品咨询、商务合作还是行业落地，欢迎随时与我们沟通
          </p>
        </header>

        <div
          className='portal-reveal__item portal-reveal__item--from-right contact-section__panel'
          style={revealDelay(1, 0.1)}
        >
          <div className='contact-section__content'>
            <div className='contact-section__panel-copy'>
              <span className='contact-section__eyebrow'>工作日 9:00–18:00 回复</span>
              <h3 className='contact-section__title'>
                让我们一起把 AI 落到业务现场
              </h3>
              <p className='contact-section__desc'>
                留下你的需求，我们会尽快安排顾问对接，协助完成场景评估与落地方案。
              </p>
            </div>

            <ul className='contact-section__list'>
              {contactItems.map(({ icon: Icon, label, value, href }) => (
                <li key={label} className='contact-section__item'>
                  <span className='contact-section__icon' aria-hidden>
                    <Icon className='size-4' strokeWidth={1.75} />
                  </span>
                  <div className='contact-section__meta'>
                    <p className='contact-section__label'>{label}</p>
                    {href ? (
                      <a
                        href={href}
                        className='contact-section__value contact-section__value--link'
                      >
                        {value}
                      </a>
                    ) : (
                      <p className='contact-section__value'>{value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className='contact-section__media'>
            <div className='contact-section__map-frame'>
              <img
                src={mapImage}
                alt='福建省（厦门）人工智能产业园孵化器'
                className='contact-section__map'
              />
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}
