import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { SearchX, Brain } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import { listIndustries } from '@/services/api/industryApi'
import {
  listInspirations,
  type Inspiration as ApiInspiration,
} from '@/services/api/inspirationApi'
import { Badge } from '@/components/ui/badge.tsx'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import { Pagination } from '@/components/common'
import { InspirationCard } from './components/InspCard'
import { InspirationHeader } from './components/InspHeader'
import {
  type Industry,
  type InspirationItem,
  type Platform,
  type SortOption,
} from './types'

function compactNumber(value: number) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function toInspirationItem(item: ApiInspiration): InspirationItem {
  return {
    id: item.id,
    brand: item.brand,
    brandCode: item.brand_code,
    brandBgColor: item.brand_bg_color,
    industry: item.industry as Industry,
    platform: item.platform as Platform,
    title: item.title,
    creativeStrategy: item.creative_strategy,
    tags: item.tags,
    metrics: {
      views: compactNumber(item.views),
      ctr: `${item.ctr}%`,
      duration: `${item.duration}s`,
    },
    coverImage: item.cover_image,
    videoUrl: item.video_url,
    scriptBreakdown: {
      hook: item.hook,
      targetAudience: item.target_audience,
      visualStyle: item.visual_style,
      sellingPoints: item.selling_points,
      timeline: item.timeline,
      fullScript: item.full_script,
      aiPrompt: item.ai_prompt,
    },
  }
}

export const InspirationPage = () => {
  const navigate = useNavigate()
  const [selectedIndustry, setSelectedIndustry] = useState<Industry>('全部')
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | '全部'>(
    '全部'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [playingId, setPlayingId] = useState<number | string | null>(null)

  const industriesQuery = useQuery({
    queryKey: ['industries'],
    queryFn: listIndustries,
  })
  const industries = useMemo(
    () => (industriesQuery.data?.items ?? []).map((item) => item.name),
    [industriesQuery.data]
  )

  const activeIndustry =
    industriesQuery.isSuccess &&
    selectedIndustry !== '全部' &&
    !industries.includes(selectedIndustry)
      ? '全部'
      : selectedIndustry

  const query = useQuery({
    queryKey: [
      'inspirations',
      activeIndustry,
      selectedPlatform,
      searchQuery,
      sortBy,
      page,
      pageSize,
    ],
    queryFn: () =>
      listInspirations({
        page,
        page_size: pageSize,
        industry: activeIndustry === '全部' ? undefined : activeIndustry,
        platform: selectedPlatform === '全部' ? undefined : selectedPlatform,
        keyword: searchQuery.trim() || undefined,
        sort: sortBy,
      }),
  })
  const filteredList = useMemo(
    () => (query.data?.items ?? []).map(toInspirationItem),
    [query.data]
  )

  const totalCount = query.data?.total ?? 0
  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const currentPage = Math.min(page, totalPages)

  const handleSelectIndustry = (ind: Industry) => {
    setSelectedIndustry(ind)
    setPage(1)
  }
  const handleSelectPlatform = (plat: Platform | '全部') => {
    setSelectedPlatform(plat)
    setPage(1)
  }
  const handleSearchChange = (q: string) => {
    setSearchQuery(q)
    setPage(1)
  }
  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort)
    setPage(1)
  }

  // Handle direct Replicate click from card
  const handleReplicate = (item: InspirationItem) => {
    const promptText = `【同款爆款视频复刻】\n行业: ${item.industry}\n核心策略: ${item.creativeStrategy}\n文案脚本:\n${item.scriptBreakdown.fullScript}`
    void navigator.clipboard.writeText(promptText)
    void navigate({
      to: '/create',
    })
    toast.success(`已复制【${item.brand}】爆款脚本，去创建视频！`)
  }

  return (
    <>
      {/* App Header Bar */}
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <Brain className='text-primary size-5 shrink-0' />
          <span className='truncate font-medium'>灵感库</span>
          <Badge
            variant='outline'
            className='bg-primary/5 text-primary border-primary/20 hidden text-[10px] font-normal sm:inline-flex'
          >
            爆款广告一键复刻
          </Badge>
        </div>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* Main Content Area */}
      <Main className='space-y-6'>
        {/* Header Toolbar */}
        <InspirationHeader
          industries={industries}
          selectedIndustry={activeIndustry}
          onSelectIndustry={handleSelectIndustry}
          selectedPlatform={selectedPlatform}
          onSelectPlatform={handleSelectPlatform}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          totalCount={totalCount}
        />

        {industriesQuery.isError && (
          <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm'>
            行业列表加载失败：{getApiErrorMessage(industriesQuery.error)}
          </div>
        )}

        {query.isError && (
          <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm'>
            灵感库加载失败：{getApiErrorMessage(query.error)}
          </div>
        )}

        {/* Card Grid */}
        {query.isLoading ? (
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className='space-y-3 rounded-md border p-4'>
                <Skeleton className='aspect-video w-full' />
                <Skeleton className='h-4 w-2/3' />
                <Skeleton className='h-3 w-full' />
                <Skeleton className='h-9 w-full' />
              </div>
            ))}
          </div>
        ) : filteredList.length > 0 ? (
          <>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {filteredList.map((item) => (
                <InspirationCard
                  key={item.id}
                  item={item}
                  isPlaying={playingId === item.id}
                  onPlayChange={(playing) =>
                    setPlayingId(playing ? item.id : null)
                  }
                  onReplicate={handleReplicate}
                />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={(p) => {
                setPage(p)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </>
        ) : (
          /* Empty State */
          <div className='bg-muted/20 my-8 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center'>
            <div className='bg-muted/80 text-muted-foreground mb-4 flex h-16 w-16 items-center justify-center rounded-full'>
              <SearchX className='h-8 w-8' />
            </div>
            <h3 className='text-foreground text-lg font-semibold'>
              未找到相关爆款案例
            </h3>
            <p className='text-muted-foreground mt-1 max-w-sm text-sm'>
              尝试切换筛选分类或清空搜索关键词查看更多广告灵感
            </p>
            <button
              type='button'
              onClick={() => {
                handleSelectIndustry('全部')
                handleSelectPlatform('全部')
                handleSearchChange('')
              }}
              className='bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-lg px-4 py-2 text-xs font-semibold transition-all'
            >
              重置筛选条件
            </button>
          </div>
        )}
      </Main>
    </>
  )
}

