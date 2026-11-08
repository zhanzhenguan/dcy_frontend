import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Industry, type Platform, type SortOption } from '../types'

interface InspirationHeaderProps {
  industries: Industry[]
  selectedIndustry: Industry
  onSelectIndustry: (ind: Industry) => void
  selectedPlatform: Platform | '全部'
  onSelectPlatform: (plat: Platform | '全部') => void
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  totalCount: number
}

const platforms: Array<Platform | '全部'> = [
  '全部',
  'TikTok',
  'Instagram',
  'Amazon',
  'Facebook',
  'YouTube',
]

export const InspirationHeader = ({
  industries,
  selectedIndustry,
  onSelectIndustry,
  selectedPlatform,
  onSelectPlatform,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: InspirationHeaderProps) => {
  return (
    <div className='space-y-6'>
      {/* Title & Page Description */}
      <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
        {/* <div>
          <div className='flex items-center gap-2'>
            <h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-foreground'>
              灵感库
            </h1>
            <Badge variant='secondary' className='gap-1 text-xs font-semibold px-2.5 py-0.5'>
              <Sparkles className='h-3 w-3 text-primary' /> {totalCount} 个爆款案例
            </Badge>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>
            浏览行业爆款广告 · 分析创意策略 · 一键复刻同款视频
          </p>
        </div> */}
        <section>
          <h1 className='text-2xl font-bold'>灵感库</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            浏览行业爆款广告 · 分析创意策略 · 一键复刻同款视频
          </p>
        </section>
        {/* Search Bar & Sort Dropdown */}
        <div className='flex w-full items-center gap-3 sm:w-auto'>
          <div className='relative flex-1 sm:w-64'>
            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            <Input
              type='search'
              placeholder='搜索品牌、脚本、痛点关键词...'
              className='bg-muted/30 border-border/70 h-9 pl-9 text-xs sm:text-sm'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <Select
            value={sortBy}
            onValueChange={(val) => onSortChange(val as SortOption)}
          >
            <SelectTrigger className='bg-muted/30 border-border/70 h-9 w-32 text-xs sm:text-sm'>
              <div className='flex items-center gap-1.5'>
                <SlidersHorizontal className='text-muted-foreground h-3.5 w-3.5' />
                <SelectValue placeholder='排序' />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='popular'>播放最高</SelectItem>
              <SelectItem value='ctr'>CTR 最高</SelectItem>
              <SelectItem value='latest'>最新发布</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter Category Filter Box */}
      <div className='border-border/60 bg-card/40 space-y-3 rounded-xl border p-4 shadow-xs'>
        {/* Industry Filter Row */}
        <div className='flex items-start gap-3 text-xs sm:items-center'>
          <span className='text-muted-foreground w-12 shrink-0 pt-1 font-medium sm:pt-0'>
            行业
          </span>
          <div className='flex flex-1 flex-wrap items-center gap-1.5'>
            {['全部', ...industries].map((ind) => {
              const active = selectedIndustry === ind
              return (
                <button
                  key={ind}
                  type='button'
                  onClick={() => onSelectIndustry(ind)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {ind}
                </button>
              )
            })}
          </div>
        </div>

        {/* Platform Filter Row */}
        <div className='border-border/40 flex items-start gap-3 border-t pt-1 text-xs sm:items-center'>
          <span className='text-muted-foreground w-12 shrink-0 pt-1 font-medium sm:pt-0'>
            平台
          </span>
          <div className='flex flex-1 flex-wrap items-center gap-1.5'>
            {platforms.map((plat) => {
              const active = selectedPlatform === plat
              return (
                <button
                  key={plat}
                  type='button'
                  onClick={() => onSelectPlatform(plat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {plat}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
