import { useState } from 'react'
import { Check, Search, Sparkles, User, UserRoundX } from 'lucide-react'
import { cn } from '@/utils/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scrollArea'
import { mockDigitalHumans } from './digiHumaMock'

export type DigitalHuman = {
  id: string
  name: string
  avatarUrl: string
  assetId?: string
  source?: 'seedance' | 'other'
  gender: 'male' | 'female'
  category: 'business' | 'daily' | 'fashion' | 'tech'
  tags: string[]
  recommended?: boolean
}

type DigitalHumanPickerProps = {
  humans?: DigitalHuman[]
  loading?: boolean
  selectedId?: string
  onSelect: (human: DigitalHuman) => void
  allowNone?: boolean
  noneSelected?: boolean
  onSelectNone?: () => void
}

export const DigitalHumanPicker = ({
  humans = mockDigitalHumans,
  loading = false,
  selectedId,
  onSelect,
  allowNone = false,
  noneSelected = false,
  onSelectNone,
}: DigitalHumanPickerProps) => {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')

  const filteredHumans = humans.filter((dh) => {
    // 已选中的数字人始终展示，避免带入后在筛选/搜索下看不到选中态
    if (selectedId && dh.id === selectedId) return true

    const matchesSearch =
      dh.name.toLowerCase().includes(search.toLowerCase()) ||
      dh.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    if (activeTab === 'male') return dh.gender === 'male'
    if (activeTab === 'female') return dh.gender === 'female'
    if (activeTab === 'business') return dh.category === 'business'
    if (activeTab === 'recommended') return Boolean(dh.recommended)

    return true
  })

  return (
    <div className='bg-card flex min-h-0 flex-1 flex-col space-y-4 rounded-xl border p-4 shadow-sm'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h3 className='flex items-center gap-2 text-base font-semibold'>
            <User className='text-primary size-4' />
            选取数字人形象
          </h3>
          <p className='text-muted-foreground text-xs'>
            {allowNone
              ? '选择最契合您产品的 AI 数字人模特，也可不使用数字人'
              : '选择最契合您产品的 AI 数字人模特'}
          </p>
        </div>
        <div className='relative w-full sm:w-56'>
          <Search className='text-muted-foreground absolute top-2.5 left-2.5 size-4' />
          <Input
            placeholder='搜索数字人或风格...'
            className='pl-8 text-xs'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <div className='flex flex-wrap gap-1.5 border-b pb-3 text-xs'>
        {[
          { id: 'all', label: '全部数字人' },
          { id: 'recommended', label: '🔥 热门推荐' },
          { id: 'female', label: '女性形象' },
          { id: 'male', label: '男性形象' },
          { id: 'business', label: '商务干练' },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            size='sm'
            className='h-7 text-xs'
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Humans Grid */}
      <ScrollArea className='min-h-[280px] flex-1 pr-2'>
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
          {loading && (
            <div className='text-muted-foreground col-span-full flex h-36 items-center justify-center text-xs'>
              正在加载数字人目录...
            </div>
          )}
          {allowNone && (
            <button
              type='button'
              onClick={onSelectNone}
              className={cn(
                'group bg-background hover:border-primary/50 relative overflow-hidden rounded-xl border text-left transition-all hover:shadow-md',
                noneSelected
                  ? 'border-primary bg-primary/5 ring-primary/20 ring-2'
                  : 'border-border'
              )}
            >
              <div className='bg-muted/60 relative flex aspect-[3/4] w-full items-center justify-center'>
                <div className='bg-background text-muted-foreground flex size-14 items-center justify-center rounded-full border shadow-sm'>
                  <UserRoundX className='size-7' />
                </div>
                {noneSelected && (
                  <div className='bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full shadow-md'>
                    <Check className='size-3.5' />
                  </div>
                )}
              </div>
              <div className='p-2.5'>
                <div className='text-foreground truncate text-sm font-semibold'>
                  不使用数字人
                </div>
                <div className='text-muted-foreground mt-1 truncate text-xs'>
                  仅使用产品素材生成
                </div>
              </div>
            </button>
          )}
          {filteredHumans.map((human) => {
            const isSelected = human.id === selectedId
            return (
              <div
                key={human.id}
                onClick={() => onSelect(human)}
                className={cn(
                  'group bg-background hover:border-primary/50 relative cursor-pointer overflow-hidden rounded-xl border transition-all hover:shadow-md',
                  isSelected
                    ? 'border-primary ring-primary/20 bg-primary/5 ring-2'
                    : 'border-border'
                )}
              >
                <div className='bg-muted relative aspect-[3/4] w-full overflow-hidden'>
                  <img
                    src={human.avatarUrl}
                    alt={human.name}
                    className='size-full object-cover transition-transform duration-300 group-hover:scale-105'
                  />
                  {human.recommended && (
                    <Badge className='absolute top-2 left-2 bg-amber-500 text-[10px] text-white hover:bg-amber-600'>
                      <Sparkles className='mr-0.5 inline size-2.5' /> 热门
                    </Badge>
                  )}
                  {isSelected && (
                    <div className='bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full shadow-md'>
                      <Check className='size-3.5' />
                    </div>
                  )}
                </div>
                <div className='p-2.5'>
                  <div className='text-foreground truncate text-sm font-semibold'>
                    {human.name}
                  </div>
                  <div className='mt-1.5 flex flex-wrap gap-1'>
                    {human.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className='bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-[10px]'
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
