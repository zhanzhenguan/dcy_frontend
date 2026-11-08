import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Music2, Pencil, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createBackgroundMusic,
  deleteBackgroundMusic,
  listAdminBackgroundMusics,
  updateBackgroundMusic,
  type BackgroundMusic,
  type BackgroundMusicInput,
} from '@/services/api/backgroundMusicApi'
import { uploadCreativeAsset } from '@/services/api/creativeApi'
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

export const BackgroundMusicAdmin = () => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<BackgroundMusic | null | undefined>()
  const [deleting, setDeleting] = useState<BackgroundMusic | null>(null)
  const query = useQuery({
    queryKey: ['admin-background-musics'],
    queryFn: listAdminBackgroundMusics,
  })
  const items = query.data?.items ?? []
  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ['admin-background-musics'],
    })
    void queryClient.invalidateQueries({ queryKey: ['background-musics'] })
  }
  const deleteMutation = useMutation({
    mutationFn: deleteBackgroundMusic,
    onSuccess: () => {
      toast.success('背景音乐已删除')
      setDeleting(null)
      refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '删除失败')),
  })

  return (
    <>
      <PageShell
        title='背景音乐维护'
        description='维护自主素材生成可选的系统背景音乐。'
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
              新增音乐
            </Button>
          </>
        }
      >
      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>音乐</TableHead>
              <TableHead>音频</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className='w-24 text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <span className='bg-muted flex size-9 items-center justify-center rounded-md'>
                      <Music2 className='size-4' />
                    </span>
                    <div>
                      <div className='font-medium'>{item.name}</div>
                      <div className='text-muted-foreground font-mono text-xs'>
                        {item.code}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <audio
                    controls
                    preload='none'
                    src={item.url}
                    className='h-8 max-w-56'
                  />
                </TableCell>
                <TableCell>{item.sort_order}</TableCell>
                <TableCell>
                  <Badge
                    variant={item.status === 'listed' ? 'default' : 'secondary'}
                  >
                    {item.status === 'listed' ? '上架' : '下架'}
                  </Badge>
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
                  colSpan={5}
                  className='text-muted-foreground h-28 text-center'
                >
                  暂无系统背景音乐，请先新增。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </PageShell>

      {editing !== undefined && (
        <BackgroundMusicDialog
          music={editing}
          onClose={() => setEditing(undefined)}
          onSaved={refresh}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title='删除背景音乐'
        desc={`确认删除“${deleting?.name ?? ''}”？删除后将不再出现在视频配置下拉框中。`}
        destructive
        confirmText='删除'
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </>
  )
}

function BackgroundMusicDialog({
  music,
  onClose,
  onSaved,
}: {
  music: BackgroundMusic | null
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(music?.code ?? '')
  const [name, setName] = useState(music?.name ?? '')
  const [url, setUrl] = useState(music?.url ?? '')
  const [contentType, setContentType] = useState(
    music?.content_type ?? 'audio/mpeg'
  )
  const [durationMs, setDurationMs] = useState(String(music?.duration_ms ?? 0))
  const [sortOrder, setSortOrder] = useState(String(music?.sort_order ?? 10))
  const [listed, setListed] = useState(music?.status !== 'unlisted')
  const [uploading, setUploading] = useState(false)
  const mutation = useMutation({
    mutationFn: (input: BackgroundMusicInput) =>
      music
        ? updateBackgroundMusic(music.id, input)
        : createBackgroundMusic(input),
    onSuccess: () => {
      toast.success(music ? '背景音乐已更新' : '背景音乐已创建')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '保存失败')),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate({
      code: code.trim(),
      name: name.trim(),
      url: url.trim(),
      content_type: contentType.trim() || 'audio/mpeg',
      duration_ms: Number(durationMs) || 0,
      status: listed ? 'listed' : 'unlisted',
      sort_order: Number(sortOrder) || 0,
    })
  }
  const upload = async (file: File) => {
    setUploading(true)
    try {
      const asset = await uploadCreativeAsset(file)
      if (asset.media_type !== 'audio') throw new Error('请选择音频文件')
      setUrl(asset.url)
      setContentType(asset.content_type || file.type || 'audio/mpeg')
      setName((current) => current || asset.name.replace(/\.[^.]+$/, ''))
      toast.success('音频上传成功')
    } catch (error) {
      toast.error(getApiErrorMessage(error, '音频上传失败'))
    } finally {
      setUploading(false)
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>{music ? '编辑背景音乐' : '新增背景音乐'}</DialogTitle>
          <DialogDescription>
            上传音频并设置在自主素材生成中的展示信息。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field id='bgm-code' label='音乐编码'>
              <Input
                id='bgm-code'
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder='dynamic-pop'
                required
              />
            </Field>
            <Field id='bgm-name' label='音乐名称'>
              <Input
                id='bgm-name'
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field id='bgm-sort' label='排序'>
              <Input
                id='bgm-sort'
                type='number'
                min='0'
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </Field>
            <div className='flex items-end pb-2'>
              <div className='flex items-center gap-3'>
                <Switch
                  id='bgm-listed'
                  checked={listed}
                  onCheckedChange={setListed}
                />
                <Label htmlFor='bgm-listed'>上架</Label>
              </div>
            </div>
          </div>
          <Field id='bgm-url' label='音频地址'>
            <div className='flex gap-2'>
              <Input
                id='bgm-url'
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder='https://...'
                required
              />
              <label className='border-input hover:bg-accent inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-3 text-sm'>
                <Upload className='size-4' />
                上传
                <input
                  type='file'
                  accept='audio/*'
                  className='hidden'
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void upload(file)
                    event.target.value = ''
                  }}
                />
              </label>
            </div>
          </Field>
          <Field id='bgm-type' label='音频类型'>
            <Input
              id='bgm-type'
              value={contentType}
              onChange={(event) => setContentType(event.target.value)}
            />
          </Field>
          <Field id='bgm-duration' label='时长（毫秒，可选）'>
            <Input
              id='bgm-duration'
              type='number'
              min='0'
              value={durationMs}
              onChange={(event) => setDurationMs(event.target.value)}
            />
          </Field>
          {url && (
            <audio controls preload='none' src={url} className='w-full' />
          )}
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button type='submit' disabled={mutation.isPending || uploading}>
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
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
