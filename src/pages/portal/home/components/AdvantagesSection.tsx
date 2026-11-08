import { revealDelay, ScrollReveal } from './ScrollReveal'

const advantages = [
  {
    no: '01',
    title: '垂直类模型训练',
    desc: '聚焦跨境卖家、政府服务及各垂直行业领域，对通用大模型进行深度调优与场景化训练。通过行业专属数据标注与持续迭代，确保模型在特定业务场景下的精准性与可靠性。',
  },
  {
    no: '02',
    title: '实战化落地能力',
    desc: '不追求技术炫技，专注AI在实际业务中的真实落地。从跨境卖家的多平台运营到政企文旅宣传，从需求分析到效果评估，全流程保障客户业务价值最大化。',
  },
  {
    no: '03',
    title: '行业场景深耕',
    desc: '深入理解各大跨境卖家、政府等官方机构以及金融、医疗、教育、制造等行业痛点，积累丰富的行业知识库与场景经验。以精准模型辅助行业专家，实现专业决策的智能化升级。',
  },
  {
    no: '04',
    title: '全链路服务体系',
    desc: '覆盖数据标注、模型训练、场景适配、部署运维的全周期服务。为跨境卖家、政府机构及各行业客户持续迭代优化，提供长期稳定的技术支持，保障AI应用的高效运行。',
  },
] as const

export const AdvantagesSection = () => {
  return (
    <section
      id='advantages'
      className='advantages-section relative scroll-mt-24 py-16 sm:py-20 lg:py-24'
      aria-labelledby='advantages-heading'
    >
      <ScrollReveal className='mx-auto max-w-7xl px-4 sm:px-6'>
        <header
          className='portal-reveal__item portal-reveal__item--fade advantages-section__header mx-auto mb-12 max-w-2xl text-center sm:mb-14'
          style={revealDelay(0)}
        >
          <h2
            id='advantages-heading'
            className='mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl'
          >
            核心
            <span className='advantages-section__gradient-text'>优势</span>
          </h2>
          <p className='mt-3 text-base leading-relaxed text-slate-500 sm:text-lg'>
            深耕垂直场景与全链路落地，让 AI 能力真正转化为业务价值
          </p>
        </header>

        <ul className='advantages-section__grid'>
          {advantages.map((item, index) => (
            <li
              key={item.no}
              className='portal-reveal__item portal-reveal__item--rise'
              style={revealDelay(1 + index, 0.14)}
            >
              <article className='advantages-section__card'>
                <div className='advantages-section__card-head'>
                  <span className='advantages-section__no' aria-hidden>
                    {item.no}
                  </span>
                  <h3 className='advantages-section__title'>{item.title}</h3>
                </div>
                <p className='advantages-section__desc'>{item.desc}</p>
              </article>
            </li>
          ))}
        </ul>
      </ScrollReveal>
    </section>
  )
}
