import { useCallback, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  listVideoGenerations,
  type VideoGenerationTask,
} from '@/services/api/videoApi'
import {
  assetViewFilterKey,
  defaultAssetViewFilter,
  toVideoListViewParams,
  type AssetViewFilter,
} from '../types/assetViewFilter'

const PAGE_SIZE = 20

export type VideoGenerationsTimeFilter = {
  createdFrom?: number
  createdTo?: number
}

export function useVideoGenerationsInfinite(
  status: VideoGenerationTask['status'] | undefined,
  enabled = true,
  timeFilter: VideoGenerationsTimeFilter = {},
  viewFilter: AssetViewFilter = defaultAssetViewFilter()
) {
  const createdFrom = timeFilter.createdFrom ?? 0
  const createdTo = timeFilter.createdTo ?? 0
  const viewKey = assetViewFilterKey(viewFilter)
  const viewParams = toVideoListViewParams(viewFilter)

  const query = useInfiniteQuery({
    queryKey: [
      'video-generations',
      'infinite',
      status ?? 'all',
      createdFrom,
      createdTo,
      viewKey,
    ],
    queryFn: ({ pageParam }) =>
      listVideoGenerations({
        page: pageParam,
        page_size: PAGE_SIZE,
        status,
        ...(createdFrom > 0 ? { created_from: createdFrom } : {}),
        ...(createdTo > 0 ? { created_to: createdTo } : {}),
        ...viewParams,
      }),
    initialPageParam: 1,
    enabled,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0)
      if (loaded >= lastPage.total || lastPage.items.length === 0) {
        return undefined
      }
      return allPages.length + 1
    },
  })

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data]
  )

  const total = query.data?.pages[0]?.total ?? 0
  const hasMore = Boolean(query.hasNextPage)
  const isLoadingMore = query.isFetchingNextPage

  const loadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return
    void query.fetchNextPage()
  }, [query])

  return {
    ...query,
    items,
    total,
    hasMore,
    isLoadingMore,
    loadMore,
  }
}
