import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Languages, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createVideoLanguage,
  deleteVideoLanguage,
  listAdminVideoLanguages,
  updateVideoLanguage,
  COMMON_FLAG_EMOJIS,
  type VideoLanguage,
  type VideoLanguageInput,
} from '@/services/api/videoLanguageApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common'
import { PageShell } from '@/components/layout/PageShell'

export const VideoLanguageAdmin = () => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<VideoLanguage | null | undefined>()
  const [deleting, setDeleting] = useState<VideoLanguage | null>(null)
  const query = useQuery({
    queryKey: ['admin-video-languages'],
    queryFn: listAdminVideoLanguages,
  })
  const items = query.data?.items ?? []
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-video-languages'] })
    void queryClient.invalidateQueries({ queryKey: ['video-languages'] })
  }
  const deleteMutation = useMutation({
    mutationFn: deleteVideoLanguage,
    onSuccess: () => {
      toast.success('视频语言已删除')
      setDeleting(null)
      refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '删除失败')),
  })

  return (
    <>
      <PageShell
        title='视频语言配置'
        description='维护创建视频时可选择的口播与字幕语言，配置语言代码、中英文名称与国旗图标。'
        actions={
          <>
            <Button
              variant='outline'
              size='icon'
              title='刷新'
              disabled={query.isFetching}
              onClick={refresh}
            >
              <RefreshCw className={query.isFetching ? 'animate-spin' : ''} />
            </Button>
            <Button onClick={() => setEditing(null)}>
              <Plus />
              新增语言
            </Button>
          </>
        }
        surfaceClassName='space-y-6'
      >
      {query.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-4 py-3 text-sm'>
          视频语言列表加载失败：{getApiErrorMessage(query.error)}
        </div>
      )}

      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>语言</TableHead>
              <TableHead>英文名</TableHead>
              <TableHead>语言代码</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className='w-24 text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <span className='bg-muted flex size-9 items-center justify-center rounded-md text-xl'>
                      {item.flag_emoji || <Languages className='size-4' />}
                    </span>
                    <span className='font-medium'>{item.name}</span>
                  </div>
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {item.english_name}
                </TableCell>
                <TableCell>
                  <code className='bg-muted rounded px-1.5 py-0.5 text-xs'>
                    {item.code}
                  </code>
                </TableCell>
                <TableCell>{item.sort_order}</TableCell>
                <TableCell>
                  <Badge
                    variant={item.status === 'listed' ? 'default' : 'secondary'}
                  >
                    {item.status === 'listed' ? '启用' : '停用'}
                  </Badge>
                </TableCell>
                <TableCell className='text-muted-foreground text-sm'>
                  {new Date(item.updated_at).toLocaleString('zh-CN')}
                </TableCell>
                <TableCell>
                  <div className='flex justify-end gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      title='编辑'
                      onClick={() => setEditing(item)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      title='删除'
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 className='text-destructive' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!query.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className='text-muted-foreground h-28 text-center'
                >
                  暂无视频语言，请先新增。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </PageShell>

      {editing !== undefined && (
        <VideoLanguageDialog
          language={editing}
          onClose={() => setEditing(undefined)}
          onSaved={refresh}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title='删除视频语言'
        desc={`确认删除“${deleting?.name ?? ''}”？已被引用的语言不能删除，可以编辑为停用。`}
        destructive
        confirmText='删除'
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </>
  )
}

function VideoLanguageDialog({
  language,
  onClose,
  onSaved,
}: {
  language: VideoLanguage | null
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(language?.code ?? '')
  const [name, setName] = useState(language?.name ?? '')
  const [englishName, setEnglishName] = useState(language?.english_name ?? '')
  const [flagEmoji, setFlagEmoji] = useState(language?.flag_emoji ?? '')
  const [sortOrder, setSortOrder] = useState(String(language?.sort_order ?? 10))
  const [listed, setListed] = useState(language?.status !== 'unlisted')

  const mutation = useMutation({
    mutationFn: (input: VideoLanguageInput) =>
      language
        ? updateVideoLanguage(language.id, input)
        : createVideoLanguage(input),
    onSuccess: () => {
      toast.success(language ? '视频语言已更新' : '视频语言已创建')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '保存失败')),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalizedCode = code.trim().toLowerCase()
    const normalizedName = name.trim()
    const normalizedEnglishName = englishName.trim()
    if (!normalizedCode) {
      toast.error('请输入语言代码')
      return
    }
    if (!normalizedName) {
      toast.error('请输入语言名称')
      return
    }
    if (!normalizedEnglishName) {
      toast.error('请输入语言英文名')
      return
    }
    mutation.mutate({
      code: normalizedCode,
      name: normalizedName,
      english_name: normalizedEnglishName,
      flag_emoji: flagEmoji.trim(),
      status: listed ? 'listed' : 'unlisted',
      sort_order: Number(sortOrder) || 0,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {language ? '编辑视频语言' : '新增视频语言'}
          </DialogTitle>
          <DialogDescription>
            停用后不会出现在创建视频的语言可选列表中。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <Field id='language-name' label='语言名称'>
              <Input
                id='language-name'
                value={name}
                maxLength={32}
                placeholder='中文'
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field id='language-english-name' label='语言英文名'>
              <Input
                id='language-english-name'
                value={englishName}
                maxLength={64}
                placeholder='Chinese'
                onChange={(event) => setEnglishName(event.target.value)}
                required
              />
            </Field>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <Field id='language-code' label='语言代码'>
              <Input
                id='language-code'
                value={code}
                maxLength={16}
                placeholder='zh'
                onChange={(event) => setCode(event.target.value)}
                required
              />
            </Field>
            <Field id='language-sort' label='排序'>
              <Input
                id='language-sort'
                type='number'
                min='0'
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </Field>
          </div>

          <Field id='language-flag' label='国旗图标'>
            <div className='flex items-center gap-2'>
              <Input
                id='language-flag'
                value={flagEmoji}
                maxLength={8}
                placeholder='🇨🇳'
                className='w-24 text-center text-xl'
                onChange={(event) => setFlagEmoji(event.target.value)}
              />
              <div className='flex flex-wrap gap-1'>
                {COMMON_FLAG_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type='button'
                    title={`使用 ${emoji}`}
                    onClick={() => setFlagEmoji(emoji)}
                    className={`hover:bg-accent rounded border px-1.5 py-0.5 text-lg transition-colors ${
                      flagEmoji === emoji ? 'border-primary' : 'border-input'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </Field>

          <div className='flex items-center gap-3'>
            <Switch
              id='language-listed'
              checked={listed}
              onCheckedChange={setListed}
            />
            <Label htmlFor='language-listed'>启用</Label>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? '保存中' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  children,
}: {
  id?: string
  label: string
  children: ReactNode
}) {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
