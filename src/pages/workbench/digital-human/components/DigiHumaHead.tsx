import { Search, FilterX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Gender, type Region, type Style, type SortOption } from '../types'

interface DigitalHumanHeaderProps {
  selectedGender: Gender
  onSelectGender: (g: Gender) => void
  selectedRegion: Region
  onSelectRegion: (r: Region) => void
  selectedStyle: Style
  onSelectStyle: (s: Style) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  totalCount: number
}

const GENDERS: Gender[] = ['全部', '女', '男', '宠物']
const REGIONS: Region[] = [
  '全部',
  '欧美',
  '东南亚',
  '东亚',
  '拉美',
  '中东/非洲',
]
const STYLES: Style[] = [
  '全部',
  '商务',
  '休闲',
  '生活',
  '运动',
  '美妆',
  '科技',
  '电商',
]

export const DigitalHumanHeader = ({
  selectedGender,
  onSelectGender,
  selectedRegion,
  onSelectRegion,
  selectedStyle,
  onSelectStyle,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  totalCount,
}: DigitalHumanHeaderProps) => {
  const hasActiveFilter =
    selectedGender !== '全部' ||
    selectedRegion !== '全部' ||
    selectedStyle !== '全部' ||
    searchQuery !== ''

  const handleReset = () => {
    onSelectGender('全部')
    onSelectRegion('全部')
    onSelectStyle('全部')
    onSearchChange('')
  }

  return (
    <div className='space-y-6'>
      {/* Title & Description banner */}
      {/* <div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border border-border/50 backdrop-blur-sm'>
        <div className='relative z-10 max-w-3xl space-y-2'>
          <div className='inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20'>
            <Sparkles className='h-3.5 w-3.5' />
            150+ 多国籍 AI 数字人
          </div>
          <h1 className='text-2xl font-bold tracking-tight sm:text-3xl text-foreground'>
            数字人库
          </h1>
          <p className='text-sm text-muted-foreground md:text-base leading-relaxed'>
            100+ 多国籍 AI 数字人 · 支持 140+ 语言口型同步 · 适配全球视频发布与电商带货
          </p>
        </div>
      </div> */}

      {/* Filter Control Bar */}
      <div className='bg-card space-y-4 rounded-xl border p-4 shadow-sm sm:p-5'>
        {/* Gender Filter */}
        <div className='flex flex-wrap items-center gap-2 text-sm sm:gap-3'>
          <span className='text-muted-foreground w-12 shrink-0 text-xs font-medium sm:text-sm'>
            性别
          </span>
          <div className='flex flex-wrap gap-1.5 sm:gap-2'>
            {GENDERS.map((g) => {
              const active = selectedGender === g
              return (
                <button
                  key={g}
                  type='button'
                  onClick={() => onSelectGender(g)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {g}
                </button>
              )
            })}
          </div>
        </div>

        {/* Region Filter */}
        <div className='flex flex-wrap items-center gap-2 border-t pt-3 text-sm sm:gap-3'>
          <span className='text-muted-foreground w-12 shrink-0 text-xs font-medium sm:text-sm'>
            国籍
          </span>
          <div className='flex flex-wrap gap-1.5 sm:gap-2'>
            {REGIONS.map((r) => {
              const active = selectedRegion === r
              return (
                <button
                  key={r}
                  type='button'
                  onClick={() => onSelectRegion(r)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              )
            })}
          </div>
        </div>

        {/* Style Filter */}
        <div className='flex flex-wrap items-center gap-2 border-t pt-3 text-sm sm:gap-3'>
          <span className='text-muted-foreground w-12 shrink-0 text-xs font-medium sm:text-sm'>
            风格
          </span>
          <div className='flex flex-wrap gap-1.5 sm:gap-2'>
            {STYLES.map((s) => {
              const active = selectedStyle === s
              return (
                <button
                  key={s}
                  type='button'
                  onClick={() => onSelectStyle(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* Search, Sort & Counter Bar */}
        <div className='flex flex-col items-stretch justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center'>
          <div className='relative max-w-md flex-1'>
            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            <Input
              type='text'
              placeholder='搜索数字人名字、风格或语言...'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className='h-9 rounded-lg pl-9 text-sm'
            />
          </div>

          <div className='flex items-center justify-between gap-3 sm:justify-end'>
            {hasActiveFilter && (
              <button
                type='button'
                onClick={handleReset}
                className='text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs transition-colors'
              >
                <FilterX className='h-3.5 w-3.5' />
                重置条件
              </button>
            )}

            <Select
              value={sortBy}
              onValueChange={(val) => onSortChange(val as SortOption)}
            >
              <SelectTrigger className='h-9 w-[130px] text-xs sm:text-sm'>
                <SelectValue placeholder='排序方式' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='hot'>热门推荐</SelectItem>
                <SelectItem value='uses'>调用最多</SelectItem>
                <SelectItem value='newest'>最新上线</SelectItem>
              </SelectContent>
            </Select>

            <Badge
              variant='outline'
              className='bg-muted/30 h-9 px-3 text-xs font-normal whitespace-nowrap'
            >
              共{' '}
              <span className='text-primary mx-1 font-bold'>{totalCount}</span>{' '}
              位数字人
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
