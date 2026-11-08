import { Link } from '@tanstack/react-router'
import { PortalBackToTop } from './PortalBackToTop'
import { PortalLogo } from './PortalLogo'

const footerColumns = [
  {
    title: '产品',
    links: [
      { label: '功能特性', href: '#insights' },
      { label: '价格方案', href: '#pricing' },
      { label: '平台对接', href: '#channels' },
      { label: '开放接口', href: '#' },
      { label: '更新日志', href: '#' },
    ],
  },
  {
    title: '公司',
    links: [
      { label: '关于我们', href: '#about' },
      { label: '领导关怀', href: '#leadership' },
      { label: '核心业务', href: '#services' },
      { label: '核心优势', href: '#advantages' },
      { label: '联系我们', href: '#contact' },
    ],
  },
  {
    title: '资源',
    links: [
      { label: '使用文档', href: '#campaigns' },
      { label: '帮助中心', href: '#' },
      { label: '用户社区', href: '#' },
      { label: '线上研讨', href: '#' },
      { label: '模板库', href: '#' },
    ],
  },
  {
    title: '法律',
    links: [
      { label: '隐私政策', href: '/privacy' },
      { label: '服务协议', href: '/terms' },
      { label: '安全合规', href: '#' },
      { label: 'Cookie 政策', href: '#' },
      { label: '数据保护', href: '#' },
    ],
  },
] as const

export const PortalFooter = () => {
  return (
    <footer className='relative bg-[#0B1120] text-slate-400'>
      <div className='mx-auto max-w-7xl px-4 pt-14 pb-8 sm:px-6 lg:px-8'>
        <div className='grid items-stretch gap-10 lg:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))] lg:gap-8'>
          <div className='flex max-w-md flex-col'>
            <Link to='/' className='transition-opacity duration-200 hover:opacity-80'>
              <PortalLogo />
            </Link>
            <p className='mt-4 text-sm leading-6 text-slate-400'>
              为电商团队打造的AI营销视频生成与发布自动化平台。
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className='text-sm font-semibold text-white'>{column.title}</h3>
              <ul className='mt-4 space-y-3'>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className='cursor-pointer text-sm text-slate-400 transition-colors duration-200 hover:text-white'
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className='mt-12 border-t border-slate-800 pt-8 pb-2'>
          <p className='flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-slate-500 sm:justify-start'>
            <span>© {new Date().getFullYear()} 厦门大词源人工智能有限公司. 保留所有权利。</span>
            <a
              href='https://beian.miit.gov.cn/'
              target='_blank'
              rel='noreferrer'
              className='transition-colors duration-200 hover:text-white'
            >
              闽ICP备2026030627号-1
            </a>
            <a
              href='https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=35021102002733'
              target='_blank'
              rel='noreferrer'
              className='transition-colors duration-200 hover:text-white'
            >
              闽公网安备35021102002733号
            </a>
          </p>
        </div>
      </div>
      <PortalBackToTop />
    </footer>
  )
}
