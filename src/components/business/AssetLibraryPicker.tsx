import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, FileImage, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scrollArea'
import {
  getAssetDirectoryTree,
  listAssets,
  type Asset,
  type AssetDirectory,
  type AssetScope,
  type AssetType,
} from '@/services/api/assetLibraryApi'
import { cn } from '@/utils/utils'
import { HoverVideoThumb } from '@/components/common'

type Selection = { scope: AssetScope; directoryId?: string }

function directoryLabel(scope: AssetScope) {
  if (scope === 'personal') return '我的素材'
  if (scope === 'tenant') return '企业素材'
  return '分组素材'
}

function formatSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function TreeBranch({
  item,
  selected,
  onSelect,
  depth = 0,
}: {
  item: AssetDirectory
  selected: Selection
  onSelect: (value: Selection) => void
  depth?: number
}) {
  const isGroupContainer = item.scope === 'group' && !item.id
  if (isGroupContainer) {
    return (
      <div>
        {item.children.map((child) => (
          <TreeBranch
            key={child.id}
            item={child}
            selected={selected}
            onSelect={onSelect}
            depth={depth}
          />
        ))}
      </div>
    )
  }
  const value: Selection = {
    scope: item.scope,
    directoryId: item.id || undefined,
  }
  const active =
    selected.scope === value.scope &&
    selected.directoryId === value.directoryId
  return (
    <div>
      <button
        type='button'
        onClick={() => onSelect(value)}
        className={cn(
          'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs transition-colors',
          active
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <FileImage className='size-3.5' />
        <span className='truncate'>
          {item.id ? item.name : directoryLabel(item.scope)}
        </span>
      </button>
      {item.children.map((child) => (
        <TreeBranch
          key={child.id}
          item={child}
          selected={selected}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

function flattenRootTabs(roots: AssetDirectory[]) {
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
        } satisfies Selection,
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
          } satisfies Selection,
        },
      ]
    }
    // 有子目录时：根节点 + 各子目录都作为顶部 Tab
    return [
      {
        key: `${root.scope}:`,
        label: directoryLabel(root.scope),
        selection: {
          scope: root.scope,
          directoryId: undefined,
        } satisfies Selection,
      },
      ...root.children.map((child) => ({
        key: `${child.scope}:${child.id}`,
        label: child.name,
        selection: {
          scope: child.scope,
          directoryId: child.id || undefined,
        } satisfies Selection,
      })),
    ]
  })
}

export type AssetLibraryPickerPanelProps = {
  /** 为 false 时不请求接口（弹层未展示） */
  active?: boolean
  assetType?: AssetType
  maxSelection?: number
  onConfirm?: (assets: Asset[]) => void
  onCancel?: () => void
  /**
   * select：多选 + 底部确认（Dialog）
   * instant：顶部 Scope Tab，点击即插入，无底部操作
   */
  variant?: 'select' | 'instant'
  /** instant：已在参考内容中的素材 id，不可再插 */
  excludedAssetIds?: string[]
  /** instant：点击素材直接插入 */
  onInsertAsset?: (asset: Asset) => void
  /** instant：右上角关闭 */
  onClose?: () => void
  cancelLabel?: string
  className?: string
}

export const AssetLibraryPickerPanel = ({
  active = true,
  assetType,
  maxSelection = 8,
  onConfirm,
  onCancel,
  variant = 'select',
  excludedAssetIds = [],
  onInsertAsset,
  onClose,
  cancelLabel = '取消',
  className,
}: AssetLibraryPickerPanelProps) => {
  const instant = variant === 'instant'
  const [selectionState, setSelection] = useState<Selection>({
    scope: 'personal',
  })
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<Asset[]>([])
  const treeQuery = useQuery({
    queryKey: ['asset-directory-tree'],
    queryFn: getAssetDirectoryTree,
    enabled: active,
  })

  const roots = useMemo(() => {
    const tree = treeQuery.data
    if (!tree) return []
    return tree.roots.filter((root) => {
      if (root.scope === 'group' && !root.id) {
        return root.children.length > 0
      }
      return true
    })
  }, [treeQuery.data])

  const topTabs = useMemo(() => flattenRootTabs(roots), [roots])

  const hasGroupDirectory = roots.some(
    (root) => root.scope === 'group' && !root.id
  )

  const selection =
    selectionState.scope === 'group' &&
    treeQuery.data &&
    !hasGroupDirectory
      ? ({ scope: 'personal' } satisfies Selection)
      : selectionState

  const assetQuery = useQuery({
    queryKey: ['asset-picker', selection, keyword, assetType],
    queryFn: () =>
      listAssets({
        scope: selection.scope,
        directory_id: selection.directoryId,
        keyword: keyword.trim() || undefined,
        asset_type: assetType,
        page: 1,
        page_size: 60,
      }),
    enabled: active,
  })

  const selectedIds = useMemo(
    () => new Set(selected.map((item) => item.id)),
    [selected]
  )
  const excludedIds = useMemo(
    () => new Set(excludedAssetIds),
    [excludedAssetIds]
  )

  const toggleAsset = (asset: Asset) => {
    if (selectedIds.has(asset.id)) {
      setSelected((current) => current.filter((item) => item.id !== asset.id))
      return
    }
    if (selected.length >= maxSelection) return
    setSelected((current) => [...current, asset])
  }

  const handleAssetClick = (asset: Asset) => {
    if (instant) {
      if (excludedIds.has(asset.id)) return
      onInsertAsset?.(asset)
      return
    }
    toggleAsset(asset)
  }

  const handleConfirm = () => {
    if (selected.length === 0) return
    onConfirm?.(selected)
    setSelected([])
  }

  const renderGrid = () => {
    if (assetQuery.isLoading) {
      return (
        <div className='text-muted-foreground py-12 text-center text-sm'>
          正在加载素材...
        </div>
      )
    }
    if (assetQuery.isError) {
      return (
        <div className='text-destructive py-12 text-center text-sm'>
          素材加载失败，请稍后重试
        </div>
      )
    }
    if ((assetQuery.data?.items.length ?? 0) === 0) {
      return (
        <div className='text-muted-foreground py-12 text-center text-sm'>
          当前目录没有可选素材
        </div>
      )
    }
    return (
      <div
        className={cn(
          'grid gap-2.5',
          instant
            ? 'grid-cols-2 sm:grid-cols-3'
            : 'grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'
        )}
      >
        {assetQuery.data?.items.map((asset) => {
          const isSelected = selectedIds.has(asset.id)
          const isExcluded = excludedIds.has(asset.id)
          const isActive = instant ? isExcluded : isSelected
          return (
            <button
              key={asset.id}
              type='button'
              disabled={instant && isExcluded}
              title={
                instant && isExcluded ? '已在参考内容中' : asset.name
              }
              onClick={() => handleAssetClick(asset)}
              className={cn(
                'group relative overflow-hidden rounded-lg border text-left transition-colors',
                isActive
                  ? 'border-primary ring-primary/20 ring-2'
                  : 'hover:border-primary/50',
                instant && isExcluded && 'cursor-not-allowed opacity-55'
              )}
            >
              <div className='bg-muted relative aspect-[4/3] overflow-hidden'>
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
                {isActive ? (
                  <span className='bg-primary text-primary-foreground absolute top-2 right-2 flex size-5 items-center justify-center rounded-full'>
                    <Check className='size-3.5' />
                  </span>
                ) : null}
              </div>
              <div className='p-2'>
                <div className='truncate text-xs font-medium'>{asset.name}</div>
                <div className='text-muted-foreground mt-1 text-[10px]'>
                  {asset.asset_type === 'video' ? '视频' : '图片'} ·{' '}
                  {formatSize(asset.file_size)}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  if (instant) {
    return (
      <div
        className={cn(
          'flex h-[min(26rem,70vh)] min-h-0 w-full flex-col',
          className
        )}
      >
        <div className='flex items-center gap-1.5 border-b px-2.5 py-2'>
          <div className='flex min-w-0 flex-1 items-center gap-1 overflow-x-auto'>
            {treeQuery.isLoading ? (
              <span className='text-muted-foreground px-1 text-xs'>
                加载目录…
              </span>
            ) : topTabs.length > 0 ? (
              topTabs.map((tab) => {
                const activeTab =
                  selection.scope === tab.selection.scope &&
                  selection.directoryId === tab.selection.directoryId
                return (
                  <button
                    key={tab.key}
                    type='button'
                    onClick={() => setSelection(tab.selection)}
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors',
                      activeTab
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {tab.label}
                  </button>
                )
              })
            ) : (
              <span className='text-muted-foreground px-1 text-xs'>
                目录不可用
              </span>
            )}
          </div>
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
        <div className='flex min-h-0 flex-1 flex-col p-2.5'>
          <div className='relative mb-2.5'>
            <Search className='text-muted-foreground absolute top-2.5 left-2.5 size-4' />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder='搜索素材名称'
              className='h-9 pl-8 text-xs'
            />
          </div>
          <ScrollArea className='min-h-0 flex-1 pr-1'>{renderGrid()}</ScrollArea>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className='grid min-h-0 flex-1 grid-cols-[180px_minmax(0,1fr)]'>
        <ScrollArea className='border-r p-2'>
          {treeQuery.isLoading ? (
            <div className='text-muted-foreground px-2 py-3 text-xs'>
              正在加载目录...
            </div>
          ) : roots.length > 0 ? (
            <div className='space-y-1'>
              {roots.map((root) => (
                <TreeBranch
                  key={root.scope}
                  item={root}
                  selected={selection}
                  onSelect={setSelection}
                />
              ))}
            </div>
          ) : (
            <div className='text-muted-foreground px-2 py-3 text-xs'>
              目录不可用
            </div>
          )}
        </ScrollArea>
        <div className='flex min-w-0 flex-col p-4'>
          <div className='relative mb-4'>
            <Search className='text-muted-foreground absolute top-2.5 left-2.5 size-4' />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder='搜索素材名称'
              className='h-9 pl-8 text-xs'
            />
          </div>
          <ScrollArea className='min-h-0 flex-1 pr-3'>{renderGrid()}</ScrollArea>
        </div>
      </div>
      <div className='flex items-center gap-2 border-t px-5 py-3'>
        <div className='text-muted-foreground mr-auto flex max-w-[45%] items-center gap-1 overflow-hidden text-xs'>
          {selected.map((asset) => (
            <span
              key={asset.id}
              className='bg-muted flex max-w-24 items-center gap-1 truncate rounded px-2 py-1'
            >
              {asset.name}
              <X className='size-3 shrink-0' />
            </span>
          ))}
        </div>
        {onCancel ? (
          <Button variant='outline' onClick={onCancel}>
            {cancelLabel}
          </Button>
        ) : null}
        <Button disabled={selected.length === 0} onClick={handleConfirm}>
          选取{selected.length ? ` ${selected.length} 个` : ''}素材
        </Button>
      </div>
    </div>
  )
}

type AssetLibraryPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetType?: AssetType
  maxSelection?: number
  onConfirm: (assets: Asset[]) => void
}

export const AssetLibraryPicker = ({
  open,
  onOpenChange,
  assetType,
  maxSelection = 8,
  onConfirm,
}: AssetLibraryPickerProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[min(720px,calc(100vh-2rem))] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[80vw]'>
        <DialogHeader className='border-b px-5 py-4 text-left'>
          <DialogTitle className='text-base'>从素材空间选择</DialogTitle>
          <DialogDescription className='text-xs'>
            选择当前有权限使用的素材
          </DialogDescription>
        </DialogHeader>
        <AssetLibraryPickerPanel
          key={open ? 'open' : 'closed'}
          active={open}
          assetType={assetType}
          maxSelection={maxSelection}
          variant='select'
          onCancel={() => onOpenChange(false)}
          onConfirm={(assets) => {
            onConfirm(assets)
            onOpenChange(false)
          }}
          className='min-h-0 flex-1'
        />
      </DialogContent>
    </Dialog>
  )
}
