import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useMessageNotifications } from '@/hooks/useMessageNotifications'
import { AnimatedTabs, InfiniteScrollLoadMore } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  markInAppMessageRead,
  type InAppMessage,
} from '@/services/api/messageApi'
import { cn } from '@/utils/utils'
import {
  IN_APP_MESSAGES_QUERY_KEY,
  useInAppMessagesInfinite,
} from './hooks/useInAppMessagesInfinite'

type MessageFilter = 'all' | 'unread' | 'read'

type MessagesInfiniteData = {
  pages: Array<{ total: number; items: InAppMessage[] }>
  pageParams: number[]
}

function isUnread(message: InAppMessage) {
  return !message.read_at
}

function patchMessageReadAt(
  data: MessagesInfiniteData | undefined,
  messageId: string,
  readAt: string
) {
  if (!data) return data
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.id === messageId ? { ...item, read_at: readAt } : item
      ),
    })),
  }
}

function patchAllMessagesRead(
  data: MessagesInfiniteData | undefined,
  readAt: string
) {
  if (!data) return data
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.read_at ? item : { ...item, read_at: readAt }
      ),
    })),
  }
}

export const SettingsNotifications = () => {
  const queryClient = useQueryClient()
  const { unreadCount, refresh } = useMessageNotifications()
  const {
    items,
    hasMore,
    isLoadingMore,
    loadMore,
    isLoading,
    isFetching,
    refetch,
  } = useInAppMessagesInfinite()
  const [markingAll, setMarkingAll] = useState(false)
  const [filter, setFilter] = useState<MessageFilter>('all')

  useEffect(() => {
    const handleMessagesChanged = () => {
      void refetch()
      void refresh()
    }
    window.addEventListener(
      'message-notifications-changed',
      handleMessagesChanged
    )
    return () =>
      window.removeEventListener(
        'message-notifications-changed',
        handleMessagesChanged
      )
  }, [refetch, refresh])

  const filteredItems = useMemo(() => {
    if (filter === 'unread') return items.filter(isUnread)
    if (filter === 'read') return items.filter((item) => !isUnread(item))
    return items
  }, [filter, items])

  const unreadInList = useMemo(() => items.filter(isUnread).length, [items])
  const showInitialLoading = isLoading && items.length === 0

  const markRead = async (message: InAppMessage) => {
    if (message.read_at) return
    const readAt = new Date().toISOString()
    try {
      await markInAppMessageRead(message.id)
      queryClient.setQueryData<MessagesInfiniteData>(
        IN_APP_MESSAGES_QUERY_KEY,
        (current) => patchMessageReadAt(current, message.id, readAt)
      )
      window.dispatchEvent(new Event('message-notifications-changed'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, '标记已读失败'))
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadInList === 0) return
    setMarkingAll(true)
    try {
      const unread = items.filter(isUnread)
      await Promise.all(unread.map((item) => markInAppMessageRead(item.id)))
      const now = new Date().toISOString()
      queryClient.setQueryData<MessagesInfiniteData>(
        IN_APP_MESSAGES_QUERY_KEY,
        (current) => patchAllMessagesRead(current, now)
      )
      window.dispatchEvent(new Event('message-notifications-changed'))
      toast.success('已全部标为已读')
    } catch (error) {
      toast.error(getApiErrorMessage(error, '全部已读失败'))
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <AnimatedTabs
          value={filter}
          onValueChange={(value) => setFilter(value as MessageFilter)}
          size='sm'
          variant='pill'
          items={[
            { value: 'all', label: '全部' },
            {
              value: 'unread',
              label: '未读',
              badge:
                unreadCount > 0 ? (
                  <span className='tabular-nums'>{unreadCount}</span>
                ) : undefined,
            },
            { value: 'read', label: '已读' },
          ]}
        />
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='gap-1.5'
          disabled={markingAll || unreadInList === 0}
          onClick={() => void handleMarkAllRead()}
        >
          {markingAll ? (
            <Loader2 className='size-3.5 animate-spin' />
          ) : (
            <CheckCheck className='size-3.5' />
          )}
          全部已读
        </Button>
      </div>

      {showInitialLoading ? (
        <div className='text-muted-foreground flex min-h-40 items-center justify-center text-sm'>
          加载中...
        </div>
      ) : filteredItems.length === 0 && !hasMore ? (
        <div className='text-muted-foreground border-border flex min-h-40 items-center justify-center rounded-xl border border-dashed text-sm'>
          {filter === 'unread'
            ? '暂无未读消息'
            : filter === 'read'
              ? '暂无已读消息'
              : '暂无消息'}
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          {filteredItems.length === 0 ? (
            <div className='text-muted-foreground border-border flex min-h-24 items-center justify-center rounded-xl border border-dashed text-sm'>
              {isFetching || isLoadingMore
                ? '加载中...'
                : filter === 'unread'
                  ? '当前已加载范围内暂无未读，继续下拉加载'
                  : filter === 'read'
                    ? '当前已加载范围内暂无已读，继续下拉加载'
                    : '暂无消息'}
            </div>
          ) : (
            filteredItems.map((message) => {
              const unread = isUnread(message)
              return (
                <Card
                  key={message.id}
                  className={cn(
                    'border-border/70 gap-0 py-0 shadow-xs transition-colors',
                    unread
                      ? 'border-primary/25 bg-primary/4'
                      : 'bg-card hover:bg-muted/30'
                  )}
                >
                  <div className='flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4'>
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full',
                        unread
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Bell className='size-4' />
                    </span>

                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-start justify-between gap-2'>
                        <div className='flex min-w-0 items-center gap-2'>
                          <p
                            className={cn(
                              'truncate text-sm font-semibold sm:text-base',
                              unread
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            )}
                          >
                            {message.title}
                          </p>
                          {unread ? (
                            <span className='shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400'>
                              未读
                            </span>
                          ) : (
                            <span className='shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400'>
                              已读
                            </span>
                          )}
                        </div>
                        <p className='text-muted-foreground shrink-0 text-xs tabular-nums'>
                          {new Date(message.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <p className='text-muted-foreground mt-2 text-sm leading-relaxed wrap-break-word'>
                        {message.content}
                      </p>
                      {unread ? (
                        <div className='mt-3 flex justify-end'>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-8 gap-1.5 px-2'
                            onClick={() => void markRead(message)}
                          >
                            <CheckCheck className='size-3.5' />
                            标为已读
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              )
            })
          )}

          <InfiniteScrollLoadMore
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
            noMoreHint={filteredItems.length > 0 ? '没有更多了' : ''}
          />
        </div>
      )}
    </div>
  )
}
