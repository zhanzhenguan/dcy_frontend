import {
  termsData,
  type TermsItem,
  type TermsListItem,
} from '../data'

function emphasize(text: string) {
  const patterns = [
    '所有订阅套餐、积分充值款项完成支付后，不支持任何情形退款。',
    '平台不承诺 AI 成片内容完全准确、合规、适配广告投放要求',
    '平台无法承诺您的数据绝对不会发生泄露、丢失',
    '申诉申请不代表必然解除限制',
    '您必须人工审核全部生成素材后再对外使用',
    '文中加粗标注为权责划分、免责、退款、责任限制等核心风险条款，请您重点审阅。',
  ]

  let nodes: Array<string | { bold: true; text: string }> = [text]
  for (const phrase of patterns) {
    const next: typeof nodes = []
    for (const node of nodes) {
      if (typeof node !== 'string') {
        next.push(node)
        continue
      }
      if (!node.includes(phrase)) {
        next.push(node)
        continue
      }
      const parts = node.split(phrase)
      parts.forEach((part, index) => {
        if (part) next.push(part)
        if (index < parts.length - 1) next.push({ bold: true, text: phrase })
      })
    }
    nodes = next
  }

  return nodes.map((node, index) =>
    typeof node === 'string' ? (
      <span key={index}>{node}</span>
    ) : (
      <strong key={index}>{node.text}</strong>
    )
  )
}

function ListItems({ items }: { items: TermsListItem[] }) {
  return (
    <ul className='terms-section__list'>
      {items.map((item, index) => {
        if (typeof item === 'string') {
          return <li key={index}>{emphasize(item)}</li>
        }
        return (
          <li key={index}>
            {emphasize(item.text)}
            {item.children?.length ? (
              <ul className='terms-section__list terms-section__list--nested'>
                {item.children.map((child) => (
                  <li key={child}>{emphasize(child)}</li>
                ))}
              </ul>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function Items({ items }: { items: TermsItem[] }) {
  return (
    <>
      {items.map((item, index) => {
        if (item.type === 'p') {
          return (
            <p key={index} className='terms-section__p'>
              {emphasize(item.text)}
            </p>
          )
        }
        return <ListItems key={index} items={item.items} />
      })}
    </>
  )
}

export const TermsSection = () => {
  return (
    <article className='terms-section' aria-labelledby='terms-heading'>
      <header className='terms-section__header'>
        <h1 id='terms-heading' className='terms-section__title'>
          服务
          <span className='terms-section__gradient-text'>协议</span>
        </h1>
      </header>

      <div className='terms-section__body'>
        <section className='terms-section__chapter terms-section__intro'>
          <p className='terms-section__meta'>
            生效日期：{termsData.effectiveDate}
          </p>
          {termsData.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className='terms-section__p'>
              {emphasize(paragraph)}
            </p>
          ))}
        </section>

        {termsData.chapters.map((chapter) => (
          <section key={chapter.title} className='terms-section__chapter'>
            <h2>{chapter.title}</h2>
            {chapter.sections.map((section, sectionIndex) => (
              <div
                key={`${chapter.title}-${section.title || sectionIndex}`}
                className='terms-section__block'
              >
                {section.title ? <h3>{section.title}</h3> : null}
                <Items items={section.items} />
              </div>
            ))}
          </section>
        ))}
      </div>
    </article>
  )
}
