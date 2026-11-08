import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { SearchX, UserRound } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import { Pagination } from '@/components/common'
import { listDigitalHumans, type DigitalHuman as ApiDigitalHuman } from '@/services/api/digitalHumanApi'
import { DigitalHumanCard } from './components/DigiHumaCard'
import { DigitalHumanDetailModal } from './components/DigiHumaDetaModa'
import { DigitalHumanHeader } from './components/DigiHumaHead'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  type AvatarItem,
  type Region,
  type Style,
  type SortOption,
} from './types'
import {Badge} from "@/components/ui/badge.tsx";

type Gender = '全部' | '女' | '男' | '宠物'
type AvatarGenderLabel = '女' | '男' | '宠物'

const GENDER_LABEL: Record<ApiDigitalHuman['gender'], AvatarGenderLabel> = {
  female: '女',
  male: '男',
  pet: '宠物',
}

function toAvatar(item: ApiDigitalHuman): AvatarItem {
  const gender = (item.gender ?? 'female') as AvatarItem['gender']
  return {
    id: item.id,
    name: item.name,
    gender,
    genderLabel: GENDER_LABEL[item.gender] ?? '女',
    region: (item.region ?? '欧美') as AvatarItem['region'],
    ageGroup: item.age_group || '25-30',
    avatarUrl: item.avatar_url,
    assetId: item.asset_id,
    source: item.source,
    gradientBg: item.gradient_bg || 'from-pink-500 via-rose-500 to-purple-600',
    avatarInitial: item.avatar_initial || 'DH',
    styles: item.styles ?? [],
    languages: item.languages ?? [],
    isHot: item.is_hot,
    isPro: item.is_pro,
    isNew: item.is_new,
    description: item.description,
    useCount: item.use_count,
    rating: item.rating,
    sampleVoiceUrl: item.sample_voice_url,
    accessible: item.accessible,
    requiredPlanName: item.required_plan_name,
  }
}

export const DigitalHumanPage = () => {
  const navigate = useNavigate()
  const [selectedGender, setSelectedGender] = useState<Gender>('全部')
  const [selectedRegion, setSelectedRegion] = useState<Region>('全部')
  const [selectedStyle, setSelectedStyle] = useState<Style>('全部')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('hot')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  const [activeAvatar, setActiveAvatar] = useState<AvatarItem | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const query = useQuery({
    queryKey: [
      'digital-humans',
      selectedGender,
      selectedRegion,
      selectedStyle,
      searchQuery,
      sortBy,
      page,
      pageSize,
    ],
    queryFn: () =>
      listDigitalHumans({
        page,
        page_size: pageSize,
        gender: selectedGender === '全部' ? undefined : selectedGender,
        region: selectedRegion === '全部' ? undefined : selectedRegion,
        style: selectedStyle === '全部' ? undefined : selectedStyle,
        keyword: searchQuery.trim() || undefined,
        sort: sortBy,
      }),
  })
  const avatars = useMemo<AvatarItem[]>(
    () => (query.data?.items ?? []).map(toAvatar),
    [query.data]
  )

  const totalCount = query.data?.total ?? 0
  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const currentPage = Math.min(page, totalPages)

  const handleSelectGender = (g: Gender) => {
    setSelectedGender(g)
    setPage(1)
  }
  const handleSelectRegion = (r: Region) => {
    setSelectedRegion(r)
    setPage(1)
  }
  const handleSelectStyle = (s: Style) => {
    setSelectedStyle(s)
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

  const handleUseAvatar = (avatar: AvatarItem) => {
    // 需订阅的数字人先进入详情弹窗查看订阅门槛
    if (avatar.accessible === false) {
      setActiveAvatar(avatar)
      setDetailModalOpen(true)
      return
    }
    // 直接跳转创建视频页，并自动选中该数字人
    void navigate({
      to: '/create',
      search: { humanId: avatar.id },
    })
  }

  const handlePreviewAvatar = (avatar: AvatarItem) => {
    setActiveAvatar(avatar)
    setDetailModalOpen(true)
  }

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <UserRound className='text-primary size-5 shrink-0' />
          <span className='truncate font-medium'>数字人库</span>
          <Badge
              variant='outline'
              className='hidden sm:inline-flex text-[10px] bg-primary/5 text-primary border-primary/20 font-normal'
          >
            150+ 多国籍 AI 数字人
          </Badge>
        </div>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        <DigitalHumanHeader
          selectedGender={selectedGender}
          onSelectGender={handleSelectGender}
          selectedRegion={selectedRegion}
          onSelectRegion={handleSelectRegion}
          selectedStyle={selectedStyle}
          onSelectStyle={handleSelectStyle}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          totalCount={totalCount}
        />

        {query.isError && (
          <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm'>
            数字人加载失败：{getApiErrorMessage(query.error)}
          </div>
        )}

        {avatars.length > 0 ? (
          <>
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
              {avatars.map((avatar) => (
                <DigitalHumanCard
                  key={avatar.id}
                  avatar={avatar}
                  onUse={handleUseAvatar}
                  onPreview={handlePreviewAvatar}
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
          <div className='flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-2xl bg-muted/20 my-8'>
            <div className='flex h-16 w-16 items-center justify-center rounded-full bg-muted/80 text-muted-foreground mb-4'>
              <SearchX className='h-8 w-8' />
            </div>
            <h3 className='text-lg font-semibold text-foreground'>
              {query.isLoading ? '数字人加载中...' : '未匹配到符合条件的数字人'}
            </h3>
            <p className='mt-1 text-sm text-muted-foreground max-w-sm'>
              {query.isLoading
                ? '正在同步后端数字人目录，请稍候'
                : '请尝试调整性别、国籍或风格分类筛选条件，或清空搜索框中的关键词'}
            </p>
            {!query.isLoading && (
              <button
                type='button'
                onClick={() => {
                  handleSelectGender('全部')
                  handleSelectRegion('全部')
                  handleSelectStyle('全部')
                  handleSearchChange('')
                }}
                className='mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90'
              >
                重置所有筛选
              </button>
            )}
          </div>
        )}
      </Main>

      <DigitalHumanDetailModal
        avatar={activeAvatar}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </>
  )
}

