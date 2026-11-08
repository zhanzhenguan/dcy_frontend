import { Globe, Radio, ShoppingBag } from 'lucide-react'
import { cn } from '@/utils/utils'
import { type PlatformId } from '../types'

interface PlatformIconProps {
  platformId: PlatformId
  className?: string
}

const PLATFORM_ALIASES: Record<string, PlatformId> = {
  tiktok: 'tiktok',
  instagram: 'instagram',
  facebook: 'facebook',
  youtube: 'youtube',
  amazon: 'amazon_live',
  'amazon live': 'amazon_live',
  amazon_live: 'amazon_live',
  shopee: 'shopee',
  'shopee 视频': 'shopee',
  小红书: 'xiaohongshu',
  xiaohongshu: 'xiaohongshu',
  xhs: 'xiaohongshu',
  抖音: 'douyin',
  douyin: 'douyin',
}

/** 用投放平台 name / short_name / id 解析发布平台图标 id。 */
export function resolvePlatformId(
  ...candidates: Array<string | null | undefined>
): PlatformId | null {
  for (const candidate of candidates) {
    if (!candidate) continue
    const key = candidate.trim().toLowerCase()
    const matched = PLATFORM_ALIASES[key]
    if (matched) return matched
  }
  return null
}

function TikTokNote({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' aria-hidden>
      <path
        d='M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.29 0 .58.04.85.12V9.32a6.32 6.32 0 00-.85-.06A6.34 6.34 0 003.15 15.6a6.34 6.34 0 0010.86 4.48c.43-.43.78-.93 1.04-1.48V11.8a8.16 8.16 0 004.54 1.38V9.75a4.85 4.85 0 01-2.45-.66 4.8 4.8 0 01-1.55-2.4z'
        fill='#25F4EE'
        transform='translate(-0.6 0.4)'
      />
      <path
        d='M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.29 0 .58.04.85.12V9.32a6.32 6.32 0 00-.85-.06A6.34 6.34 0 003.15 15.6a6.34 6.34 0 0010.86 4.48c.43-.43.78-.93 1.04-1.48V11.8a8.16 8.16 0 004.54 1.38V9.75a4.85 4.85 0 01-2.45-.66 4.8 4.8 0 01-1.55-2.4z'
        fill='#FE2C55'
        transform='translate(0.6 -0.4)'
      />
      <path
        d='M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.29 0 .58.04.85.12V9.32a6.32 6.32 0 00-.85-.06A6.34 6.34 0 003.15 15.6a6.34 6.34 0 0010.86 4.48c.43-.43.78-.93 1.04-1.48V11.8a8.16 8.16 0 004.54 1.38V9.75a4.85 4.85 0 01-2.45-.66 4.8 4.8 0 01-1.55-2.4z'
        fill='white'
      />
    </svg>
  )
}

export const PlatformIcon = ({
  platformId,
  className = 'size-6',
}: PlatformIconProps) => {
  switch (platformId) {
    case 'tiktok':
      return (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-[22%] bg-black text-white',
            className
          )}
        >
          <TikTokNote className='size-[72%]' />
        </span>
      )
    case 'instagram':
      return (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-[22%] text-white',
            className
          )}
          style={{
            background:
              'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
          }}
        >
          <svg className='size-[68%]' viewBox='0 0 24 24' fill='currentColor'>
            <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' />
          </svg>
        </span>
      )
    case 'facebook':
      return (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-white',
            className
          )}
        >
          <svg className='size-[58%]' viewBox='0 0 24 24' fill='currentColor'>
            <path d='M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z' />
          </svg>
        </span>
      )
    case 'youtube':
      return (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-[22%] bg-white text-[#FF0000]',
            className
          )}
        >
          <svg className='size-[78%]' viewBox='0 0 24 24' fill='currentColor'>
            <path d='M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' />
          </svg>
        </span>
      )
    case 'amazon_live':
      return (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-[22%] bg-amber-500 text-white',
            className
          )}
        >
          <Radio className='size-[62%]' strokeWidth={2.5} />
        </span>
      )
    case 'shopee':
      return (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-[22%] bg-orange-600 text-white',
            className
          )}
        >
          <ShoppingBag className='size-[62%]' strokeWidth={2.5} />
        </span>
      )
    case 'xiaohongshu':
      return (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-[22%] bg-red-600 text-[0.62em] font-black leading-none text-white',
            className
          )}
        >
          小
        </span>
      )
    case 'douyin':
      return (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-[22%] bg-zinc-900 text-white',
            className
          )}
        >
          <TikTokNote className='size-[72%]' />
        </span>
      )
    default:
      return <Globe className={cn('shrink-0 text-muted-foreground', className)} />
  }
}
