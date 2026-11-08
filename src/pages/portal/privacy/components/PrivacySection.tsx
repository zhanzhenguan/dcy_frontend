import {
  privacyData,
  type PrivacyItem,
  type PrivacyListItem,
} from '../data'

function emphasize(text: string) {
  const patterns = [
    '特别提示：文中加粗标注内容为隐私合规、权责界定、风险限制等核心条款，请您重点审阅。您使用平台全部服务即代表您已充分阅读、理解并自愿同意本隐私政策全部内容；若您不同意本政策任意条款，请立即停止使用平台所有服务。',
    '银行卡信息、支付密码、支付密钥等核心敏感金融数据，全部由第三方正规支付机构独立处理及存储，我方不采集、不留存、不获取任何用户敏感支付信息。',
    '我方承诺绝不使用用户上传的任何私有素材训练、微调自有及第三方AI大模型',
    '全脱敏、无法关联个人身份',
    '所有数据均无法定位具体自然人，仅用于统计用户使用习惯、优化产品功能与服务体验',
    '中国大陆境内合规阿里云服务器',
    '无用户单独、明确书面同意，我方绝不主动公开披露用户个人信息',
    '未经用户明确同意，不会缩减用户原有合法隐私权益',
    '负责人、主管、成员',
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

function ListItems({ items }: { items: PrivacyListItem[] }) {
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

function Items({ items }: { items: PrivacyItem[] }) {
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

export const PrivacySection = () => {
  return (
    <article className='terms-section' aria-labelledby='privacy-heading'>
      <header className='terms-section__header'>
        <h1 id='privacy-heading' className='terms-section__title'>
          隐私
          <span className='terms-section__gradient-text'>政策</span>
        </h1>
      </header>

      <div className='terms-section__body'>
        <section className='terms-section__chapter terms-section__intro'>
          <p className='terms-section__meta'>
            生效日期：{privacyData.effectiveDate}
          </p>
          {privacyData.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className='terms-section__p'>
              {emphasize(paragraph)}
            </p>
          ))}
          {privacyData.toc.length > 0 ? (
            <ul className='terms-section__list'>
              {privacyData.toc.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>

        {privacyData.chapters.map((chapter) => (
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
