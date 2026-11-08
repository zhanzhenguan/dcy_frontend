import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Eye, Film, ListFilter, Plus, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  deleteCreativeAsset,
  listCreativeAssets,
  type CreativeAsset,
} from '@/services/api/creativeApi'
import {
  getAssetDirectoryTree,
  listAssets,
  type Asset,
  type AssetDirectory,
  type AssetScope,
  type AssetType,
} from '@/services/api/assetLibraryApi'
import { cn } from '@/utils/utils'
import { SignedCreativeImage } from '@/components/business'
import { AnimatedTabs, HoverVideoThumb } from '@/components/common'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scrollArea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const RECENT_ASSETS_QUERY_KEY = ['creative-assets', 'recent'] as const

export type MentionAssetKind = 'image' | 'video' | 'audio'

export type MentionAsset = {
  id: string
  url: string
  name: string
  kind: MentionAssetKind
  /** 视频封面（可选） */
  posterUrl?: string
  duration?: number
}

/** @deprecated 使用 MentionAsset */
export type MentionCurrentImage = MentionAsset

type LibrarySelection = { scope: AssetScope; directoryId?: string }

type PanelTab =
  | { kind: 'recent' }
  | { kind: 'library'; key: string; selection: LibrarySelection }

type MediaFilter = 'all' | AssetType

type MentionAssetsPanelProps = {
  onUpload: () => void
  /** 从「最近使用」插入到参考内容（图片/视频均会校验） */
  onSelectRecent?: (asset: CreativeAsset) => void | Promise<void>
  /** 从素材空间插入（点击即加入） */
  onSelectLibraryAssets: (assets: Asset[]) => void
  /** 查看大图 / 视频 */
  onPreview?: (target: {
    kind: 'image' | 'video'
    url: string
  }) => void
  /** 已在参考内容中的素材空间 id，禁止重复插入 */
  excludedLibraryAssetIds?: string[]
  /** 弹层是否展开 */
  active?: boolean
  /** 关闭面板（仅点 X / 再点 +） */
  onClose?: () => void
}

function directoryLabel(scope: AssetScope) {
  if (scope === 'personal') return '我的素材'
  if (scope === 'tenant') return '企业素材'
  return '分组素材'
}

function flattenLibraryTabs(roots: AssetDirectory[]) {
  return roots.flatMap((root) => {
    const isGroupContainer = root.scope === 'group' && !root.id

    // 「分组素材」只是容器名，不作为 Tab；有分组时只展示具体分组
    if (isGroupContainer) {
      return root.children.map((child) => ({
        key: `${child.scope}:${child.id}`,
        label: child.name,
        selection: {
          scope: child.scope,
          directoryId: child.id || undefined,
        } satisfies LibrarySelection,
      }))
    }

    if (root.children.length === 0) {
      return [
        {
          key: `${root.scope}:${root.id || ''}`,
          label: root.id ? root.name : directoryLabel(root.scope),
          selection: {
            scope: root.scope,
            directoryId: root.id || undefined,
          } satisfies LibrarySelection,
        },
      ]
    }
    return [
      {
        key: `${root.scope}:`,
        label: directoryLabel(root.scope),
        selection: {
          scope: root.scope,
          directoryId: undefined,
        } satisfies LibrarySelection,
      },
      ...root.children.map((child) => ({
        key: `${child.scope}:${child.id}`,
        label: child.name,
        selection: {
          scope: child.scope,
          directoryId: child.id || undefined,
        } satisfies LibrarySelection,
      })),
    ]
  })
}

function RecentAssetThumb({
  url,
  name,
  fileKey,
  mediaType,
  deleting,
  onSelect,
  onPreview,
  onDelete,
  onUrlChange,
}: {
  url: string
  name: string
  fileKey?: string
  mediaType?: CreativeAsset['media_type']
  deleting?: boolean
  onSelect?: () => void
  onPreview?: () => void
  onDelete?: () => void
  onUrlChange?: (nextUrl: string, previousUrl: string) => void
}) {
  const isVideo = mediaType === 'video'

  return (
    <div
      className={cn(
        'group relative aspect-square overflow-hidden rounded-xl border transition-all duration-200',
        'hover:border-primary/60 hover:shadow-sm',
        deleting && 'pointer-events-none opacity-60'
      )}
    >
      <button
        type='button'
        title={name}
        className='bg-muted relative size-full focus-visible:outline-none'
        onClick={() => void onSelect?.()}
      >
        {isVideo ? (
          <video
            src={url}
            muted
            playsInline
            preload='metadata'
            className='size-full object-cover transition-transform duration-200 group-hover:scale-105'
          />
        ) : (
          <SignedCreativeImage
            src={url}
            fileKey={fileKey}
            alt={name}
            className='size-full object-cover transition-transform duration-200 group-hover:scale-105'
            onUrlChange={onUrlChange}
          />
        )}
        {isVideo ? (
          <span className='absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-md bg-black/65 px-1 py-0.5 text-[9px] text-white'>
            <Film className='size-2.5' />
            视频
          </span>
        ) : null}
      </button>
      <div className='absolute top-1.5 right-1.5 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
        {onPreview ? (
          <button
            type='button'
            title='查看大图'
            aria-label='查看大图'
            className='flex size-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70'
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onPreview()
            }}
          >
            <Eye className='size-3.5' />
          </button>
        ) : null}
        {onDelete ? (
          <button
            type='button'
            title='删除'
            aria-label='从最近使用中删除'
            className='flex size-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70'
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className='size-3.5' />
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** 参考内容弹层：最近使用 / 我的素材 / 企业素材 同一套 Tab */
export const MentionAssetsPanel = ({
  onUpload,
  onSelectRecent,
  onSelectLibraryAssets,
  onPreview,
  excludedLibraryAssetIds = [],
  active = true,
  onClose,
}: MentionAssetsPanelProps) => {
  const [tab, setTab] = useState<PanelTab>({ kind: 'recent' })
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [keyword, setKeyword] = useState('')
  const queryClient = useQueryClient()

  const treeQuery = useQuery({
    queryKey: ['asset-directory-tree'],
    queryFn: getAssetDirectoryTree,
    enabled: active,
  })

  const libraryRoots = useMemo(() => {
    const tree = treeQuery.data
    if (!tree) return []
    return tree.roots.filter((root) => {
      if (root.scope === 'group' && !root.id) {
        return root.children.length > 0
      }
      return true
    })
  }, [treeQuery.data])

  const libraryTabs = useMemo(
    () => flattenLibraryTabs(libraryRoots),
    [libraryRoots]
  )

  const librarySelection =
    tab.kind === 'library' ? tab.selection : undefined

  const recentQuery = useQuery({
    queryKey: RECENT_ASSETS_QUERY_KEY,
    queryFn: () => listCreativeAssets(),
    enabled: active && tab.kind === 'recent',
  })

  const assetQuery = useQuery({
    queryKey: ['asset-picker', librarySelection, keyword, mediaFilter],
    queryFn: () =>
      listAssets({
        scope: librarySelection!.scope,
        directory_id: librarySelection!.directoryId,
        keyword: keyword.trim() || undefined,
        asset_type: mediaFilter === 'all' ? undefined : mediaFilter,
        page: 1,
        page_size: 60,
      }),
    enabled: active && tab.kind === 'library' && Boolean(librarySelection),
  })

  const deleteMutation = useMutation({
    mutationFn: (url: string) => deleteCreativeAsset(url),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: RECENT_ASSETS_QUERY_KEY })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const excludedIds = useMemo(
    () => new Set(excludedLibraryAssetIds),
    [excludedLibraryAssetIds]
  )

  const recentAssets = (recentQuery.data ?? []).filter((item) => {
    if (!item.url) return false
    const isVideo = item.media_type === 'video'
    const isImage =
      item.media_type === 'image' ||
      item.media_type === '' ||
      (item.content_type ?? '').startsWith('image/')
    if (!isVideo && !isImage) return false
    if (mediaFilter === 'image') return isImage && !isVideo
    if (mediaFilter === 'video') return isVideo
    return true
  })

  const isRecent = tab.kind === 'recent'

  const scopeTabItems = useMemo(
    () => [
      { value: 'recent', label: '最近使用' },
      ...libraryTabs.map((item) => ({
        value: item.key,
        label: item.label,
      })),
    ],
    [libraryTabs]
  )

  const scopeTabValue = tab.kind === 'recent' ? 'recent' : tab.key

  return (
    <div className='relative flex h-[min(24rem,70vh)] w-[min(28rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl bg-linear-to-br from-slate-100 via-zinc-100 to-stone-100/90 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.7),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(148,163,184,0.25),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.06),transparent_55%)]'
      />
      <div className='relative flex min-h-0 flex-1 flex-col'>
      <div className='flex items-center gap-2 border-b border-black/5 px-3 py-2.5 dark:border-white/10'>
        <div className='min-w-0 flex-1'>
          {treeQuery.isLoading && libraryTabs.length === 0 ? (
            <span className='text-muted-foreground px-1 text-xs'>
              加载目录…
            </span>
          ) : (
            <AnimatedTabs
              variant='pill'
              size='sm'
              value={scopeTabValue}
              onValueChange={(value) => {
                if (value === 'recent') {
                  setTab({ kind: 'recent' })
                  return
                }
                const item = libraryTabs.find((tabItem) => tabItem.key === value)
                if (!item) return
                setKeyword('')
                setTab({
                  kind: 'library',
                  key: item.key,
                  selection: item.selection,
                })
              }}
              items={scopeTabItems}
              className='max-w-full'
            />
          )}
        </div>
        <Select
          value={mediaFilter}
          onValueChange={(value) => setMediaFilter(value as MediaFilter)}
        >
          <SelectTrigger
            size='sm'
            hideIcon
            className='text-muted-foreground hover:text-foreground data-[state=open]:text-foreground data-[state=open]:bg-transparent data-[state=open]:ring-0 h-7 w-auto shrink-0 gap-1.5 rounded-full border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0'
          >
            <ListFilter className='size-3.5 opacity-80' />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className='z-60'>
            <SelectItem value='all'>全部</SelectItem>
            <SelectItem value='image'>图片</SelectItem>
            <SelectItem value='video'>视频</SelectItem>
          </SelectContent>
        </Select>
        {onClose ? (
          <button
            type='button'
            title='关闭'
            aria-label='关闭'
            className='text-muted-foreground hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors'
            onClick={onClose}
          >
            <X className='size-4' />
          </button>
        ) : null}
      </div>

      <div className='flex min-h-0 flex-1 flex-col p-3'>
        {!isRecent ? (
          <div className='relative mb-3'>
            <Search className='text-muted-foreground absolute top-2.5 left-2.5 size-4' />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder='搜索素材名称'
              className='bg-background h-9 pl-8 text-xs'
            />
          </div>
        ) : null}

        <ScrollArea className='min-h-0 flex-1 rounded-xl border border-white/70 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md backdrop-saturate-150 dark:border-white/10 dark:bg-zinc-950/45 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'>
          <div className='p-3'>
          {isRecent ? (
            recentQuery.isLoading ? (
              <div className='text-muted-foreground flex h-28 items-center justify-center text-xs'>
                正在加载最近使用...
              </div>
            ) : (
              <div className='grid grid-cols-4 gap-2.5'>
                <button
                  type='button'
                  title='上传本地文件'
                  onClick={onUpload}
                  className={cn(
                    'group bg-background text-muted-foreground relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-all duration-200',
                    'hover:border-primary hover:bg-primary/5 hover:text-primary'
                  )}
                >
                  <span className='bg-muted text-foreground group-hover:bg-background group-hover:text-primary flex size-8 items-center justify-center rounded-full shadow-sm ring-1 ring-black/5 transition-colors'>
                    <Plus className='size-4' strokeWidth={2} />
                  </span>
                  <span className='text-xs font-medium tracking-wide'>上传</span>
                </button>
                {recentAssets.map((asset) => {
                  const deleting =
                    deleteMutation.isPending &&
                    deleteMutation.variables === asset.url

                  return (
                    <RecentAssetThumb
                      key={asset.file_key || `${asset.url}-${asset.name}`}
                      url={asset.url}
                      fileKey={asset.file_key}
                      name={asset.name}
                      mediaType={asset.media_type}
                      deleting={deleting}
                      onSelect={() => onSelectRecent?.(asset)}
                      onPreview={
                        onPreview
                          ? () =>
                              onPreview({
                                kind:
                                  asset.media_type === 'video'
                                    ? 'video'
                                    : 'image',
                                url: asset.url,
                              })
                          : undefined
                      }
                      onDelete={() => deleteMutation.mutate(asset.url)}
                      onUrlChange={(nextUrl, previousUrl) => {
                        queryClient.setQueryData<CreativeAsset[]>(
                          RECENT_ASSETS_QUERY_KEY,
                          (previous) =>
                            (previous ?? []).map((item) =>
                              item.url === previousUrl ||
                              (asset.file_key &&
                                item.file_key === asset.file_key)
                                ? { ...item, url: nextUrl }
                                : item
                            )
                        )
                      }}
                    />
                  )
                })}
              </div>
            )
          ) : assetQuery.isLoading ? (
            <div className='text-muted-foreground py-12 text-center text-sm'>
              正在加载素材...
            </div>
          ) : assetQuery.isError ? (
            <div className='text-destructive py-12 text-center text-sm'>
              素材加载失败，请稍后重试
            </div>
          ) : (assetQuery.data?.items.length ?? 0) === 0 ? (
            <div className='text-muted-foreground py-12 text-center text-sm'>
              当前目录没有可选素材
            </div>
          ) : (
            <div className='grid grid-cols-4 gap-2.5'>
              {assetQuery.data?.items.map((asset) => {
                const excluded = excludedIds.has(asset.id)
                const kind =
                  asset.asset_type === 'video' ? 'video' : 'image'
                return (
                  <div
                    key={asset.id}
                    className={cn(
                      'group relative aspect-square overflow-hidden rounded-xl border transition-all duration-200',
                      excluded
                        ? 'border-primary/40 opacity-50'
                        : 'hover:border-primary/60 hover:shadow-sm'
                    )}
                  >
                    <button
                      type='button'
                      disabled={excluded}
                      title={excluded ? '已在参考内容中' : asset.name}
                      onClick={() => onSelectLibraryAssets([asset])}
                      className={cn(
                        'bg-muted size-full text-left',
                        excluded && 'cursor-not-allowed'
                      )}
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
                          className='size-full object-cover transition-transform duration-200 group-hover:scale-105'
                        />
                      )}
                      {asset.asset_type === 'video' ? (
                        <span className='absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-md bg-black/65 px-1 py-0.5 text-[9px] text-white'>
                          <Film className='size-2.5' />
                          视频
                        </span>
                      ) : null}
                    </button>
                    <div className='absolute top-1.5 right-1.5 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
                      {onPreview ? (
                        <button
                          type='button'
                          title='查看大图'
                          aria-label='查看大图'
                          className='flex size-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70'
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            onPreview({
                              kind,
                              url: asset.preview_url,
                            })
                          }}
                        >
                          <Eye className='size-3.5' />
                        </button>
                      ) : null}
                      {excluded ? (
                        <span className='bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full'>
                          <Check className='size-3' />
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </div>
        </ScrollArea>
      </div>
      </div>
    </div>
  )
}
