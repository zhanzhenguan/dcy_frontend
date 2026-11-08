import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useMessageNotifications } from '@/hooks/useMessageNotifications'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  listInAppMessages,
  markInAppMessageRead,
  type InAppMessage,
} from '@/services/api/messageApi'

const PREVIEW_PAGE_SIZE = 5

/** 顶栏消息入口：预览最新 5 条，查看全部进入消息列表 */
export const MessageNotificationBell = () => {
  const { unreadCount, refresh } = useMessageNotifications()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<InAppMessage[]>([])
  const [loading, setLoading] = useState(false)
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount)

  useEffect(() => {
    if (!open) return
    let active = true
    const refreshRecentMessages = async () => {
      setLoading(true)
      try {
        const result = await listInAppMessages({
          page: 1,
          page_size: PREVIEW_PAGE_SIZE,
        })
        if (active) setItems(result.items)
      } finally {
        if (active) setLoading(false)
      }
    }
    const handleMessagesChanged = () => {
      void refreshRecentMessages()
    }
    void refreshRecentMessages()
    window.addEventListener(
      'message-notifications-changed',
      handleMessagesChanged
    )
    return () => {
      active = false
      window.removeEventListener(
        'message-notifications-changed',
        handleMessagesChanged
      )
    }
  }, [open])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) void refresh()
  }

  const markRead = async (message: InAppMessage) => {
    if (message.read_at) return
    try {
      await markInAppMessageRead(message.id)
      setItems((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      )
      window.dispatchEvent(new Event('message-notifications-changed'))
    } catch {
      // 保留未读状态，避免请求失败时错误消除提醒。
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary relative size-9 overflow-visible rounded-full'
          aria-label='消息'
          title='消息'
        >
          <Bell className='size-4' />
          {unreadCount > 0 ? (
            <span className='bg-destructive absolute -top-0.5 -right-0.5 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 text-white tabular-nums'>
              {unreadLabel}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-96 p-0'>
        <div className='border-b px-4 py-3 text-sm font-semibold'>消息</div>
        <div className='divide-y'>
          {loading ? (
            <div className='text-muted-foreground px-4 py-8 text-center text-sm'>
              加载中...
            </div>
          ) : items.length === 0 ? (
            <div className='text-muted-foreground px-4 py-8 text-center text-sm'>
              暂无消息
            </div>
          ) : (
            items.map((message) => (
              <button
                key={message.id}
                type='button'
                className='hover:bg-muted/60 block w-full px-4 py-3 text-start transition-colors'
                onClick={() => void markRead(message)}
              >
                <div className='flex items-center gap-2'>
                  <span className='truncate text-sm font-medium'>
                    {message.title}
                  </span>
                  {!message.read_at ? (
                    <span className='bg-destructive size-1.5 shrink-0 rounded-full' />
                  ) : null}
                </div>
                <p className='text-muted-foreground mt-1 line-clamp-2 text-xs'>
                  {message.content}
                </p>
                <p className='text-muted-foreground mt-1 text-xs'>
                  {new Date(message.created_at).toLocaleString('zh-CN')}
                </p>
              </button>
            ))
          )}
        </div>
        <div className='border-t p-2'>
          <Button asChild variant='ghost' size='sm' className='w-full'>
            <Link to='/settings/notifications' onClick={() => setOpen(false)}>
              查看全部
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
