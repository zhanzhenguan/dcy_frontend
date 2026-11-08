import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight,
  FileImage,
  Film,
  FolderClosed,
  FolderPlus,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createAssetDirectory,
  deleteAsset,
  deleteAssetDirectory,
  getAssetDirectoryTree,
  listAssets,
  updateAsset,
  uploadAsset,
  type Asset,
  type AssetDirectory,
  type AssetScope,
} from '@/services/api/assetLibraryApi'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import {
  ConfirmDialog,
  HoverVideoThumb,
  ThemeSwitch,
} from '@/components/common'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdownMenu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scrollArea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/business'

type Selection = {
  scope: AssetScope
  groupPublicId?: string
  directoryId?: string
  label: string
  canManage: boolean
  isGroupRoot?: boolean
}

const rootSelection: Selection = {
  scope: 'personal',
  label: '我的素材',
  canManage: true,
}

function formatSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(timestamp * 1000)
}

function toSelection(item: AssetDirectory): Selection {
  return {
    scope: item.scope,
    groupPublicId: item.group_public_id || undefined,
    directoryId: item.id || undefined,
    label: item.name,
    canManage: item.can_manage,
    isGroupRoot: item.is_group_root,
  }
}

function findParentSelection(
  items: AssetDirectory[],
  targetId: string,
  parent?: Selection
): Selection | undefined {
  for (const item of items) {
    if (item.id === targetId) return parent
    const found = findParentSelection(
      item.children,
      targetId,
      toSelection(item)
    )
    if (found) return found
  }
  return undefined
}

function TreeNode({
  item,
  selection,
  onSelect,
  depth = 0,
}: {
  item: AssetDirectory
  selection: Selection
  onSelect: (value: Selection) => void
  depth?: number
}) {
  const value = toSelection(item)
  const active =
    selection.scope === value.scope &&
    selection.directoryId === value.directoryId
  const isGroupContainer = item.scope === 'group' && !item.id
  // 「分组素材」容器名不展示，直接展示具体分组
  if (isGroupContainer) {
    return (
      <div>
        {item.children.map((child) => (
          <TreeNode
            key={child.id}
            item={child}
            selection={selection}
            onSelect={onSelect}
            depth={depth}
          />
        ))}
      </div>
    )
  }
  return (
    <div>
      <button
        type='button'
        onClick={() => onSelect(value)}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors',
          active
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <FolderClosed className='size-4 shrink-0' />
        <span className='truncate'>{item.name}</span>
        {item.children.length > 0 && (
          <ChevronRight className='ml-auto size-3.5 opacity-50' />
        )}
      </button>
      {item.children.map((child) => (
        <TreeNode
          key={child.id}
          item={child}
          selection={selection}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export const AssetLibraryPage = () => {
  const client = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [selectionState, setSelection] = useState<Selection>(rootSelection)
  const [keyword, setKeyword] = useState('')
  const [assetType, setAssetType] = useState<'all' | 'image' | 'video'>('all')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [createDirectoryOpen, setCreateDirectoryOpen] = useState(false)
  const [deleteDirectoryOpen, setDeleteDirectoryOpen] = useState(false)
  const [directoryName, setDirectoryName] = useState('')
  const [preview, setPreview] = useState<Asset | null>(null)

  const invalidate = () =>
    client.invalidateQueries({ queryKey: ['asset-library'] })
  const treeQuery = useQuery({
    queryKey: ['asset-library', 'tree'],
    queryFn: getAssetDirectoryTree,
  })

  const roots = useMemo(() => {
    const tree = treeQuery.data
    if (!tree) return []
    // 无分组时不展示「分组素材」
    return tree.roots.filter((root) => {
      if (root.scope === 'group' && !root.id) {
        return root.children.length > 0
      }
      return true
    })
  }, [treeQuery.data])

  const hasGroupDirectory = roots.some(
    (root) => root.scope === 'group' && !root.id
  )

  // 无分组时回退到「我的素材」，避免仍停留在已隐藏的分组节点
  const selection =
    selectionState.scope === 'group' &&
    treeQuery.data &&
    !hasGroupDirectory
      ? rootSelection
      : selectionState

  const assetsQuery = useQuery({
    queryKey: ['asset-library', 'assets', selection, keyword, assetType, sort],
    queryFn: () =>
      listAssets({
        scope: selection.scope,
        group_public_id: selection.groupPublicId,
        directory_id: selection.directoryId,
        keyword: keyword.trim() || undefined,
        asset_type: assetType === 'all' ? undefined : assetType,
        sort,
        page: 1,
        page_size: 100,
      }),
  })

  const createDirectoryMutation = useMutation({
    mutationFn: () =>
      createAssetDirectory({
        scope: selection.scope,
        group_public_id: selection.groupPublicId,
        parent_id: selection.directoryId,
        name: directoryName.trim(),
      }),
    onSuccess: () => {
      toast.success('目录已创建')
      setDirectoryName('')
      setCreateDirectoryOpen(false)
      void invalidate()
    },
    onError: () => toast.error('目录创建失败'),
  })
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) =>
      Promise.all(
        files.map((file) =>
          uploadAsset(file, {
            scope: selection.scope,
            group_public_id: selection.groupPublicId,
            directory_id: selection.directoryId,
          })
        )
      ),
    onSuccess: (assets) => {
      toast.success(`已上传 ${assets.length} 个素材`)
      void invalidate()
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : '素材上传失败'),
  })
  const deleteAssetMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      toast.success('素材已删除')
      void invalidate()
    },
    onError: () => toast.error('素材删除失败'),
  })
  const deleteDirectoryMutation = useMutation({
    mutationFn: deleteAssetDirectory,
    onSuccess: (_, directoryId) => {
      const parent = findParentSelection(
        treeQuery.data?.roots ?? [],
        directoryId
      )
      toast.success('目录已删除')
      setDeleteDirectoryOpen(false)
      setSelection(parent ?? rootSelection)
      void invalidate()
    },
    onError: () => toast.error('目录无法删除，请先清空目录内容'),
  })

  const canManage = selection.canManage

  return (
    <>
      <Header fixed>
        <FolderClosed className='text-primary size-5 shrink-0' />
        <span className='font-medium'>素材空间</span>
        <span className='text-muted-foreground hidden text-xs sm:inline'>
          可复用的产品、品牌和参考素材
        </span>
        <div className='ml-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex min-h-0 flex-1'>
        <div className='bg-surface grid min-h-0 w-full flex-1 overflow-hidden rounded-xl border shadow-sm grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]'>
          <aside className='border-b lg:border-r lg:border-b-0'>
            <div className='flex h-14 items-center justify-between border-b px-4'>
              <span className='text-sm font-semibold'>素材目录</span>
              {canManage && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  title='新建目录'
                  onClick={() => setCreateDirectoryOpen(true)}
                >
                  <FolderPlus className='size-4' />
                </Button>
              )}
            </div>
            <ScrollArea className='h-[calc(100vh-9rem)] p-3'>
              {treeQuery.isLoading ? (
                <div className='text-muted-foreground px-2 py-4 text-xs'>
                  正在加载目录...
                </div>
              ) : (
                roots.map((root) => (
                  <TreeNode
                    key={root.scope}
                    item={root}
                    selection={selection}
                    onSelect={setSelection}
                  />
                ))
              )}
            </ScrollArea>
          </aside>

          <section className='flex min-w-0 flex-col p-4 md:p-6'>
            <div className='mb-4 flex flex-wrap items-center gap-3'>
              <div className='relative min-w-0 max-w-md flex-1'>
                <Search className='text-muted-foreground absolute top-2.5 left-2.5 size-4' />
                <Input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder='搜索素材名称'
                  className='h-9 pl-8'
                />
              </div>
              <Select
                value={assetType}
                onValueChange={(value) =>
                  setAssetType(value as typeof assetType)
                }
              >
                <SelectTrigger className='w-[7.5rem]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>全部类型</SelectItem>
                  <SelectItem value='image'>图片</SelectItem>
                  <SelectItem value='video'>视频</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sort}
                onValueChange={(value) => setSort(value as typeof sort)}
              >
                <SelectTrigger className='w-[7.5rem]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='newest'>最新上传</SelectItem>
                  <SelectItem value='oldest'>最早上传</SelectItem>
                </SelectContent>
              </Select>
              {canManage && (
                <div className='ms-auto flex flex-wrap items-center gap-2'>
                  <Button
                    variant='outline'
                    className='gap-2'
                    onClick={() => setCreateDirectoryOpen(true)}
                  >
                    <FolderPlus className='size-4' />
                    新建目录
                  </Button>
                  <Button
                    className='gap-2'
                    onClick={() => fileInput.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    <Upload className='size-4' />
                    上传素材
                  </Button>
                  {selection.directoryId && !selection.isGroupRoot && (
                    <Button
                      variant='outline'
                      size='icon'
                      className='text-destructive hover:text-destructive size-9'
                      title='删除目录'
                      aria-label='删除目录'
                      onClick={() => setDeleteDirectoryOpen(true)}
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  )}
                </div>
              )}
              <input
                ref={fileInput}
                type='file'
                accept='image/jpeg,image/png,image/webp,video/mp4,video/quicktime,.jpg,.jpeg,.png,.webp,.mp4,.mov'
                multiple
                className='hidden'
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? [])
                  if (files.length) uploadMutation.mutate(files)
                  event.target.value = ''
                }}
              />
            </div>

            {assetsQuery.isLoading ? (
              <div className='text-muted-foreground py-24 text-center text-sm'>
                正在加载素材...
              </div>
            ) : assetsQuery.isError ? (
              <div className='text-destructive py-24 text-center text-sm'>
                素材加载失败，请稍后重试
              </div>
            ) : (assetsQuery.data?.items.length ?? 0) === 0 ? (
              <div className='border-border flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed text-center'>
                <ImageIcon className='text-muted-foreground size-9' />
                <div className='mt-3 text-sm font-medium'>
                  当前目录还没有素材
                </div>
                {canManage && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='mt-4 gap-2'
                    onClick={() => fileInput.current?.click()}
                  >
                    <Upload className='size-4' />
                    上传第一个素材
                  </Button>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'>
                {assetsQuery.data?.items.map((asset) => (
                  <article
                    key={asset.id}
                    className='group bg-card overflow-hidden rounded-lg border'
                  >
                    <button
                      type='button'
                      onClick={() => setPreview(asset)}
                      className='bg-muted relative block aspect-[4/3] w-full overflow-hidden'
                    >
                      {asset.asset_type === 'video' ? (
                        <HoverVideoThumb
                          src={asset.preview_url}
                          className='size-full'
                        />
                      ) : (
                        <img
                          src={asset.preview_url}
                          alt={asset.name}
                          className='size-full object-cover'
                        />
                      )}
                      <span className='bg-background/90 absolute bottom-2 left-2 flex items-center gap-1 rounded px-1.5 py-1 text-[10px]'>
                        <>
                          {asset.asset_type === 'video' ? (
                            <Film className='size-3' />
                          ) : (
                            <FileImage className='size-3' />
                          )}
                        </>
                        {asset.asset_type === 'video' && asset.duration_ms
                          ? `${Math.round(asset.duration_ms / 1000)}s`
                          : formatSize(asset.file_size)}
                      </span>
                    </button>
                    <div className='flex items-start gap-2 p-2.5'>
                      <div className='min-w-0 flex-1'>
                        <div className='truncate text-xs font-medium'>
                          {asset.name}
                        </div>
                        <div className='text-muted-foreground mt-1 text-[10px]'>
                          {asset.uploaded_by || '当前用户'} ·{' '}
                          {formatDate(asset.created_at)}
                        </div>
                      </div>
                      {asset.can_manage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='-mr-1 size-7'
                            >
                              <MoreHorizontal className='size-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem
                              onClick={() => {
                                const name = window.prompt(
                                  '素材名称',
                                  asset.name
                                )
                                if (name?.trim())
                                  void updateAsset(asset.id, name.trim())
                                    .then(() => {
                                      toast.success('素材已重命名')
                                      void invalidate()
                                    })
                                    .catch(() => toast.error('重命名失败'))
                              }}
                            >
                              <Pencil className='size-4' />
                              重命名
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-destructive focus:text-destructive'
                              onClick={() =>
                                deleteAssetMutation.mutate(asset.id)
                              }
                            >
                              <Trash2 className='size-4' />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </Main>

      <Dialog open={createDirectoryOpen} onOpenChange={setCreateDirectoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建目录</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={directoryName}
            onChange={(event) => setDirectoryName(event.target.value)}
            placeholder='请输入目录名称'
            onKeyDown={(event) => {
              if (event.key === 'Enter' && directoryName.trim())
                createDirectoryMutation.mutate()
            }}
          />
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setCreateDirectoryOpen(false)}
            >
              取消
            </Button>
            <Button
              disabled={
                !directoryName.trim() || createDirectoryMutation.isPending
              }
              onClick={() => createDirectoryMutation.mutate()}
            >
              创建目录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleteDirectoryOpen}
        onOpenChange={setDeleteDirectoryOpen}
        title='删除目录'
        desc={`确定删除目录“${selection.label}”吗？仅空目录可以删除。`}
        cancelBtnText='取消'
        confirmText='删除'
        destructive
        isLoading={deleteDirectoryMutation.isPending}
        handleConfirm={() => {
          if (selection.directoryId)
            deleteDirectoryMutation.mutate(selection.directoryId)
        }}
      />
      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent className='max-w-3xl overflow-hidden p-0'>
          <div className='max-h-[70vh] min-h-64 bg-black'>
            {preview?.asset_type === 'video' ? (
              <video
                src={preview.preview_url}
                controls
                autoPlay
                className='max-h-[70vh] w-full object-contain'
              />
            ) : (
              preview && (
                <img
                  src={preview.preview_url}
                  alt={preview.name}
                  className='max-h-[70vh] w-full object-contain'
                />
              )
            )}
          </div>
          {preview && (
            <div className='p-4'>
              <div className='text-sm font-medium'>{preview.name}</div>
              <div className='text-muted-foreground mt-1 text-xs'>
                {preview.asset_type === 'video' ? '视频' : '图片'} ·{' '}
                {formatSize(preview.file_size)} · {preview.uploaded_by}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
