import { useCallback, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { listInAppMessages } from '@/services/api/messageApi'

export const IN_APP_MESSAGES_QUERY_KEY = ['in-app-messages', 'infinite'] as const

const PAGE_SIZE = 20

export function useInAppMessagesInfinite(enabled = true) {
  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    isFetching,
    refetch,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: IN_APP_MESSAGES_QUERY_KEY,
    queryFn: ({ pageParam }) =>
      listInAppMessages({
        page: pageParam,
        page_size: PAGE_SIZE,
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
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  )

  const total = data?.pages[0]?.total ?? 0
  const hasMore = Boolean(hasNextPage)
  const isLoadingMore = isFetchingNextPage

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return
    void fetchNextPage()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return {
    items,
    total,
    hasMore,
    isLoadingMore,
    loadMore,
    isLoading,
    isFetching,
    refetch,
    isError,
    error,
  }
}
