import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/common'
import { PageShell } from '@/components/layout/PageShell'
import { listAdminUsers } from '@/services/api/adminUserApi'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  listManualMessages,
  previewManualMessageAudience,
  sendManualMessage,
  type ManualAudience,
  type ManualAudiencePreview,
} from '@/services/api/manualMessageApi'
import { searchAdminTenants } from '@/services/api/tenantApi'

const audienceLabels: Record<ManualAudience, string> = {
  USER: '指定用户',
  TENANT: '指定租户',
  GLOBAL: '全平台',
}

type PendingMessage = {
  audience_type: ManualAudience
  audience_id?: string
  title: string
  content: string
  preview: ManualAudiencePreview
}

export function ManualMessagesAdmin() {
  const queryClient = useQueryClient()
  const [audience, setAudience] = useState<ManualAudience>('GLOBAL')
  const [targetID, setTargetID] = useState('')
  const [targetKeyword, setTargetKeyword] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(
    null
  )
  const [historyAudience, setHistoryAudience] = useState<
    ManualAudience | 'ALL'
  >('ALL')
  const [senderUserID, setSenderUserID] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')

  const usersQuery = useQuery({
    queryKey: ['manual-message-users', targetKeyword],
    queryFn: () =>
      listAdminUsers({
        page_size: 50,
        status: 'active',
        keyword: targetKeyword.trim() || undefined,
      }),
    enabled: audience === 'USER',
  })
  const tenantsQuery = useQuery({
    queryKey: ['manual-message-tenants', targetKeyword],
    queryFn: () =>
      searchAdminTenants({
        page_size: 50,
        keyword: targetKeyword.trim() || undefined,
      }),
    enabled: audience === 'TENANT',
  })
  const historyQuery = useQuery({
    queryKey: [
      'manual-message-history',
      historyAudience,
      senderUserID,
      startAt,
      endAt,
    ],
    queryFn: () =>
      listManualMessages({
        audience_type: historyAudience === 'ALL' ? undefined : historyAudience,
        sender_user_id: senderUserID.trim() || undefined,
        start_at: startAt ? new Date(startAt).toISOString() : undefined,
        end_at: endAt ? new Date(endAt).toISOString() : undefined,
        page_size: 20,
      }),
  })
  const sendMutation = useMutation({
    mutationFn: sendManualMessage,
    onSuccess: () => {
      toast.success('人工站内信已发送')
      setTitle('')
      setContent('')
      setPendingMessage(null)
      void queryClient.invalidateQueries({
        queryKey: ['manual-message-history'],
      })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '发送失败')),
  })

  const changeAudience = (value: ManualAudience) => {
    setAudience(value)
    setTargetID('')
    setTargetKeyword('')
  }

  const requestConfirmation = async () => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    if (!trimmedTitle || !trimmedContent) {
      toast.error('请填写标题和内容')
      return
    }
    try {
      const preview = await previewManualMessageAudience({
        audience_type: audience,
        audience_id: audience === 'GLOBAL' ? undefined : targetID,
      })
      setPendingMessage({
        audience_type: audience,
        audience_id: audience === 'GLOBAL' ? undefined : targetID,
        title: trimmedTitle,
        content: trimmedContent,
        preview,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, '目标校验失败'))
    }
  }

  const confirmSend = () => {
    if (!pendingMessage) return
    sendMutation.mutate({
      audience_type: pendingMessage.audience_type,
      audience_id: pendingMessage.audience_id,
      title: pendingMessage.title,
      content: pendingMessage.content,
    })
  }

  return (
    <PageShell title='人工站内信' surfaceClassName='space-y-6'>
      <div className='grid gap-6 xl:grid-cols-2'>
        <section className='space-y-5 rounded-md border p-5'>
          <div className='space-y-2'>
            <Label htmlFor='manual-message-audience'>目标范围</Label>
            <Select
              value={audience}
              onValueChange={(value) => changeAudience(value as ManualAudience)}
            >
              <SelectTrigger id='manual-message-audience'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(audienceLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {audience !== 'GLOBAL' ? (
            <div className='space-y-2'>
              <Label htmlFor='manual-message-target-search'>
                {audience === 'USER' ? '用户' : '租户'}
              </Label>
              <Input
                id='manual-message-target-search'
                value={targetKeyword}
                onChange={(event) => setTargetKeyword(event.target.value)}
                placeholder={
                  audience === 'USER'
                    ? '搜索昵称或邮箱'
                    : '搜索租户名称或公开 ID'
                }
              />
              <Select value={targetID} onValueChange={setTargetID}>
                <SelectTrigger>
                  <SelectValue placeholder='选择有效目标' />
                </SelectTrigger>
                <SelectContent>
                  {audience === 'USER'
                    ? (usersQuery.data?.items ?? []).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.nickname} · {user.email}
                        </SelectItem>
                      ))
                    : (tenantsQuery.data?.items ?? [])
                        .filter((tenant) => tenant.status === 'active')
                        .map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.display_name} · {tenant.public_id}
                          </SelectItem>
                        ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className='space-y-2'>
            <Label htmlFor='manual-message-title'>标题</Label>
            <Input
              id='manual-message-title'
              maxLength={128}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='manual-message-content'>内容</Label>
            <Textarea
              id='manual-message-content'
              maxLength={1024}
              rows={5}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </div>
          <Button
            type='button'
            onClick={() => void requestConfirmation()}
            disabled={
              sendMutation.isPending || (audience !== 'GLOBAL' && !targetID)
            }
          >
            发送
          </Button>
        </section>

        <section className='overflow-hidden rounded-md border'>
          <div className='border-b px-4 py-3 font-medium'>发送历史</div>
          <div className='grid gap-3 border-b p-4 sm:grid-cols-2'>
            <Select
              value={historyAudience}
              onValueChange={(value) =>
                setHistoryAudience(value as ManualAudience | 'ALL')
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='全部目标范围' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>全部目标范围</SelectItem>
                {Object.entries(audienceLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={senderUserID}
              onChange={(event) => setSenderUserID(event.target.value)}
              placeholder='发送操作者 ID'
              inputMode='numeric'
            />
            <Input
              type='datetime-local'
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              aria-label='发送开始时间'
            />
            <Input
              type='datetime-local'
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
              aria-label='发送结束时间'
            />
          </div>
          <div className='divide-y'>
            {historyQuery.isLoading ? (
              <div className='text-muted-foreground px-4 py-10 text-center text-sm'>
                加载中...
              </div>
            ) : (historyQuery.data?.items.length ?? 0) === 0 ? (
              <div className='text-muted-foreground px-4 py-10 text-center text-sm'>
                暂无发送记录
              </div>
            ) : (
              historyQuery.data?.items.map((item) => (
                <div key={item.id} className='space-y-1 px-4 py-3 text-sm'>
                  <div className='flex justify-between gap-3'>
                    <span className='truncate font-medium'>{item.title}</span>
                    <span className='text-muted-foreground shrink-0'>
                      {audienceLabels[item.audience_type]}
                    </span>
                  </div>
                  <p className='text-muted-foreground line-clamp-2'>
                    {item.content}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    {item.target_name} · {item.estimated_recipients} 人 ·{' '}
                    {item.sender_name || item.sender_user_id} ·{' '}
                    {new Date(item.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(pendingMessage)}
        onOpenChange={(open) => {
          if (!open && !sendMutation.isPending) setPendingMessage(null)
        }}
        title='确认发送人工站内信'
        desc={
          <div className='space-y-1 text-sm'>
            <p>
              {pendingMessage
                ? audienceLabels[pendingMessage.audience_type]
                : ''}
              ：{pendingMessage?.preview.target_name}
            </p>
            <p>
              预计接收人数：
              {pendingMessage?.preview.estimated_recipients ?? 0}
            </p>
            <p>标题：{pendingMessage?.title}</p>
          </div>
        }
        confirmText='确认发送'
        handleConfirm={confirmSend}
        isLoading={sendMutation.isPending}
      />
    </PageShell>
  )
}
