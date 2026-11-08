import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ImageUp,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  createDeliveryPlatform,
  deleteDeliveryPlatform,
  listAdminDeliveryPlatforms,
  updateDeliveryPlatform,
  uploadDeliveryPlatformAsset,
  DELIVERY_PLATFORM_RATIOS,
  type DeliveryPlatform,
  type DeliveryPlatformInput,
} from '@/services/api/deliveryPlatformApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

export const DeliveryPlatformAdmin = () => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<DeliveryPlatform | null | undefined>()
  const [deleting, setDeleting] = useState<DeliveryPlatform | null>(null)
  const query = useQuery({
    queryKey: ['admin-delivery-platforms'],
    queryFn: listAdminDeliveryPlatforms,
  })
  const items = query.data?.items ?? []
  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ['admin-delivery-platforms'],
    })
    void queryClient.invalidateQueries({ queryKey: ['delivery-platforms'] })
  }
  const deleteMutation = useMutation({
    mutationFn: deleteDeliveryPlatform,
    onSuccess: () => {
      toast.success('投放平台已删除')
      setDeleting(null)
      refresh()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '删除失败')),
  })

  return (
    <>
      <PageShell
        title='投放平台配置'
        description='维护可投放的渠道平台，配置图标、简称、归属地区、推荐视频比例与展示排序。'
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
              新增平台
            </Button>
          </>
        }
        surfaceClassName='space-y-6'
      >
      {query.isError && (
        <div className='border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-4 py-3 text-sm'>
          投放平台列表加载失败：{getApiErrorMessage(query.error)}
        </div>
      )}

      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>平台</TableHead>
              <TableHead>简称</TableHead>
              <TableHead>归属</TableHead>
              <TableHead>推荐视频比例</TableHead>
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
                    <PlatformIcon platform={item} />
                    <span className='font-medium'>{item.name}</span>
                  </div>
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {item.short_name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.region === 'domestic' ? 'default' : 'secondary'
                    }
                  >
                    {item.region === 'domestic' ? '国内' : '国外'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className='flex flex-wrap gap-1'>
                    {item.recommended_ratios.map((ratio) => (
                      <Badge key={ratio} variant='outline'>
                        {ratio}
                      </Badge>
                    ))}
                  </div>
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
                  colSpan={8}
                  className='text-muted-foreground h-28 text-center'
                >
                  暂无投放平台，请先新增。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </PageShell>

      {editing !== undefined && (
        <DeliveryPlatformDialog
          platform={editing}
          onClose={() => setEditing(undefined)}
          onSaved={refresh}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title='删除投放平台'
        desc={`确认删除“${deleting?.name ?? ''}”？已被引用的平台不能删除，可以编辑为停用。`}
        destructive
        confirmText='删除'
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </>
  )
}

/** 有图标时展示缩略图，没有图标时回退成简称首字符方块。 */
function PlatformIcon({ platform }: { platform: DeliveryPlatform }) {
  if (platform.icon_url) {
    return (
      <img
        src={platform.icon_url}
        alt={platform.name}
        className='size-9 rounded-md border object-cover'
      />
    )
  }
  return (
    <span className='bg-muted flex size-9 items-center justify-center rounded-md text-xs font-medium'>
      {platform.short_name.slice(0, 2) || <Megaphone className='size-4' />}
    </span>
  )
}

function DeliveryPlatformDialog({
  platform,
  onClose,
  onSaved,
}: {
  platform: DeliveryPlatform | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(platform?.name ?? '')
  const [shortName, setShortName] = useState(platform?.short_name ?? '')
  const [iconUrl, setIconUrl] = useState(platform?.icon_url ?? '')
  const [region, setRegion] = useState<'domestic' | 'overseas'>(
    platform?.region ?? 'domestic'
  )
  const [ratios, setRatios] = useState<string[]>(
    platform?.recommended_ratios ?? ['9:16']
  )
  const [sortOrder, setSortOrder] = useState(String(platform?.sort_order ?? 10))
  const [listed, setListed] = useState(platform?.status !== 'unlisted')

  const uploadMutation = useMutation({
    mutationFn: uploadDeliveryPlatformAsset,
    onSuccess: (asset) => {
      setIconUrl(asset.url)
      toast.success('图标上传成功')
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '图标上传失败')),
  })

  const mutation = useMutation({
    mutationFn: (input: DeliveryPlatformInput) =>
      platform
        ? updateDeliveryPlatform(platform.id, input)
        : createDeliveryPlatform(input),
    onSuccess: () => {
      toast.success(platform ? '投放平台已更新' : '投放平台已创建')
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, '保存失败')),
  })

  const toggleRatio = (ratio: string, checked: boolean) => {
    setRatios((current) =>
      checked ? [...current, ratio] : current.filter((value) => value !== ratio)
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalizedName = name.trim()
    const normalizedShortName = shortName.trim()
    if (!normalizedName) {
      toast.error('请输入平台名称')
      return
    }
    if (!normalizedShortName) {
      toast.error('请输入平台简称')
      return
    }
    if (ratios.length === 0) {
      toast.error('请至少选择一个推荐视频比例')
      return
    }
    mutation.mutate({
      name: normalizedName,
      short_name: normalizedShortName,
      icon_url: iconUrl.trim(),
      region,
      // 按固定顺序提交，与后端归一化结果保持一致。
      recommended_ratios: DELIVERY_PLATFORM_RATIOS.filter((ratio) =>
        ratios.includes(ratio)
      ),
      status: listed ? 'listed' : 'unlisted',
      sort_order: Number(sortOrder) || 0,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {platform ? '编辑投放平台' : '新增投放平台'}
          </DialogTitle>
          <DialogDescription>
            停用后不会出现在创建视频和发布环节的可选平台列表中。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <Field id='platform-name' label='平台名称'>
              <Input
                id='platform-name'
                value={name}
                maxLength={32}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field id='platform-short-name' label='平台简称'>
              <Input
                id='platform-short-name'
                value={shortName}
                maxLength={16}
                onChange={(event) => setShortName(event.target.value)}
                required
              />
            </Field>
          </div>

          <Field id='platform-icon' label='图标'>
            <div className='flex gap-2'>
              <Input
                id='platform-icon'
                value={iconUrl}
                onChange={(event) => setIconUrl(event.target.value)}
                placeholder='可填写外链地址，或点击右侧上传'
              />
              <label className='border-input hover:bg-accent inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-3 text-sm'>
                <ImageUp className='size-4' />
                上传
                <input
                  type='file'
                  accept='image/*'
                  className='hidden'
                  disabled={uploadMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) uploadMutation.mutate(file)
                    event.target.value = ''
                  }}
                />
              </label>
            </div>
            {iconUrl && (
              <img
                src={iconUrl}
                alt='图标预览'
                className='mt-2 size-16 rounded-md border object-cover'
              />
            )}
          </Field>

          <div className='grid grid-cols-2 gap-4'>
            <Field id='platform-region' label='归属地区'>
              <Select
                value={region}
                onValueChange={(value) =>
                  setRegion(value as 'domestic' | 'overseas')
                }
              >
                <SelectTrigger id='platform-region' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='domestic'>国内</SelectItem>
                  <SelectItem value='overseas'>国外</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field id='platform-sort' label='排序'>
              <Input
                id='platform-sort'
                type='number'
                min='0'
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </Field>
          </div>

          <div className='space-y-2'>
            <Label>推荐视频比例</Label>
            <div className='flex flex-wrap gap-4'>
              {DELIVERY_PLATFORM_RATIOS.map((ratio) => (
                <div key={ratio} className='flex items-center gap-2'>
                  <Checkbox
                    id={`platform-ratio-${ratio}`}
                    checked={ratios.includes(ratio)}
                    onCheckedChange={(checked) =>
                      toggleRatio(ratio, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`platform-ratio-${ratio}`}
                    className='font-normal'
                  >
                    {ratio}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <Switch
              id='platform-listed'
              checked={listed}
              onCheckedChange={setListed}
            />
            <Label htmlFor='platform-listed'>启用</Label>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button
              type='submit'
              disabled={mutation.isPending || uploadMutation.isPending}
            >
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
