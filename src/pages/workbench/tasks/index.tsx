import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  CircleAlert,
  ExternalLink,
  Film,
  Folder,
  Loader2,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { VIDEO_TASK_RESYNC_EVENT, VIDEO_TASK_STATUS_EVENT } from '@/hooks/useMessageNotifications'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  getVideoGeneration,
  getVideoGenerationStats,
  deleteVideoDraft,
  deleteVideoGeneration,
  batchDeleteVideoGenerations,
  batchDownloadVideoGenerations,
  listVideoDrafts,
  type VideoDraft,
  type VideoGenerationTask,
} from '@/services/api/videoApi'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/business'
import { ConfirmDialog, ThemeSwitch } from '@/components/common'
import { cn } from '@/utils/utils'
import { isCurrentEnterpriseStaff } from '@/utils/tenantAccess'
import { useAuthStore } from '@/stores/authStore'
import { stashReusePrompt } from '@/pages/workbench/create-video/components/studioSession'
import { AssetBatchToolbar } from './components/AssetBatchToolbar'
import { AssetCreatorMeta } from './components/AssetCreatorMeta'
import {
  AssetFilterBar,
  resolveAssetTimeBounds,
  type AssetSortOrder,
  type AssetStatusFilter,
  type AssetTimeRange,
} from './components/AssetFilterBar'
import { AssetListByDate } from './components/AssetListByDate'
import { AssetProjectCard } from './components/AssetProjectCard'
import { VideoDetailModal } from './components/VideoDetailModal'
import { useVideoGenerationsInfinite } from './hooks/useVideoGenerationsInfinite'
import {
  sortAssetItemsAsc,
  sortAssetItemsDesc,
  mergeAssetItems,
  toDraftAssetItem,
  toTaskAssetItem,
  type AssetListItem,
} from './types'
import {
  assetViewFilterKey,
  defaultAssetViewFilter,
  shouldShowCreatorOnCards,
  shouldShowReactionControls,
  toVideoListViewParams,
  type AssetViewFilter,
} from './types/assetViewFilter'

const MAX_BATCH_SELECTION = 50

const route = getRouteApi('/_authenticated/(workbench)/tasks/')

export const Tasks = () => {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const [deletingDraftID, setDeletingDraftID] = useState('')
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [batchDownloading, setBatchDownloading] = useState(false)
  const [downloadingTaskId, setDownloadingTaskId] = useState('')
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false)
  const [pendingDeleteTask, setPendingDeleteTask] =
    useState<VideoGenerationTask | null>(null)
  const [pendingDeleteDraft, setPendingDeleteDraft] =
    useState<VideoDraft | null>(null)
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null)
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    () => new Set()
  )
  /** 点「批量操作」时先展开多选 UI；勾选后由选中数量维持批量态 */
  const [forceSelectionMode, setForceSelectionMode] = useState(false)
  const batchMode = selectedAssetIds.size > 0
  const selectionMode = batchMode || forceSelectionMode
  const [sortOrder, setSortOrder] = useState<AssetSortOrder>('newest')
  const [viewFilter, setViewFilter] = useState<AssetViewFilter>(
    defaultAssetViewFilter
  )
  const [timeRange, setTimeRange] = useState<AssetTimeRange>({
    preset: 'all',
  })
  const tenant = useAuthStore((state) => state.auth.session?.tenant)
  const showViewScope = isCurrentEnterpriseStaff(tenant)
  const effectiveViewFilter = showViewScope
    ? viewFilter
    : defaultAssetViewFilter()
  const viewKey = assetViewFilterKey(effectiveViewFilter)
  const viewParams = toVideoListViewParams(effectiveViewFilter)
  const showCreatorOnCards =
    showViewScope && shouldShowCreatorOnCards(effectiveViewFilter)
  /** 赞踩仅在「仅自己」列表；分组/人员视角不展示。个人账号无切换时等同仅自己。 */
  const showReactionControls =
    !showViewScope || shouldShowReactionControls(effectiveViewFilter)

  useEffect(() => {
    const refreshLists = () => {
      void queryClient.invalidateQueries({ queryKey: ['video-generations'] })
      void queryClient.invalidateQueries({ queryKey: ['video-generation-stats'] })
    }
    window.addEventListener(VIDEO_TASK_STATUS_EVENT, refreshLists)
    window.addEventListener(VIDEO_TASK_RESYNC_EVENT, refreshLists)
    return () => {
      window.removeEventListener(VIDEO_TASK_STATUS_EVENT, refreshLists)
      window.removeEventListener(VIDEO_TASK_RESYNC_EVENT, refreshLists)
    }
  }, [queryClient])

  // 当前选中的 Tab 状态映射
  const currentTab: AssetStatusFilter = (function () {
    if (!search.status) return 'all'
    if (search.status === 'succeeded') return 'succeeded'
    if (search.status === 'running') return 'running'
    if (search.status === 'queued') return 'queued'
    if (search.status === 'failed') return 'failed'
    if (search.status === 'draft') return 'draft'
    return 'all'
  })()

  const generationStatusFilter: VideoGenerationTask['status'] | undefined =
    currentTab === 'all' || currentTab === 'draft'
      ? undefined
      : currentTab

  const timeBounds = useMemo(() => resolveAssetTimeBounds(timeRange), [timeRange])

  const generationsQuery = useVideoGenerationsInfinite(
    generationStatusFilter,
    currentTab !== 'draft',
    {
      createdFrom: timeBounds?.startSec,
      createdTo: timeBounds?.endSec,
    },
    effectiveViewFilter
  )

  const draftsQuery = useQuery({
    queryKey: ['video-drafts', viewKey, viewParams],
    queryFn: () => listVideoDrafts(viewParams),
  })

  const statsQuery = useQuery({
    queryKey: [
      'video-generation-stats',
      timeBounds?.startSec ?? 0,
      timeBounds?.endSec ?? 0,
      viewKey,
      viewParams,
    ],
    queryFn: () =>
      getVideoGenerationStats({
        ...(timeBounds?.startSec
          ? { created_from: timeBounds.startSec }
          : {}),
        ...(timeBounds?.endSec ? { created_to: timeBounds.endSec } : {}),
        ...viewParams,
      }),
  })

  const linkedTaskQuery = useQuery({
    queryKey: ['video-generation', search.task],
    queryFn: () => getVideoGeneration(search.task ?? ''),
    enabled: Boolean(search.task),
  })

  const draftCountInRange = useMemo(() => {
    const drafts = draftsQuery.data?.items ?? []
    if (!timeBounds) return drafts.length
    return drafts.filter(
      (item) =>
        item.created_at >= timeBounds.startSec &&
        item.created_at <= timeBounds.endSec
    ).length
  }, [draftsQuery.data?.items, timeBounds])

  const assetItems = useMemo(() => {
    const drafts =
      currentTab === 'all' || currentTab === 'draft'
        ? (draftsQuery.data?.items ?? []).map(toDraftAssetItem)
        : []
    const tasks =
      currentTab === 'draft'
        ? []
        : generationsQuery.items.map(toTaskAssetItem)
    // 任务时间条件已由接口过滤；草稿列表全量返回，仅在本地按时间筛
    const filteredDrafts = timeBounds
      ? drafts.filter(
          (item) =>
            item.createdAt >= timeBounds.startSec &&
            item.createdAt <= timeBounds.endSec
        )
      : drafts

    // 仅草稿 Tab：全量草稿按时间排序即可
    if (currentTab === 'draft') {
      return sortOrder === 'oldest'
        ? sortAssetItemsAsc(filteredDrafts)
        : sortAssetItemsDesc(filteredDrafts)
    }

    // 全部/状态 Tab：草稿只进入当前已加载视频的时间窗口，避免旧草稿抢在未加载视频前面
    return mergeAssetItems({
      drafts: filteredDrafts,
      tasks,
      sortOrder,
      hasMoreTasks: generationsQuery.hasMore,
    })
  }, [
    currentTab,
    draftsQuery.data?.items,
    generationsQuery.hasMore,
    generationsQuery.items,
    sortOrder,
    timeBounds,
  ])

  const updateSearch = (next: Partial<typeof search>) => {
    void navigate({ search: (current) => ({ ...current, ...next }) })
  }

  // 统计指标：随时间筛选走接口；状态筛选时卡片数字与列表范围对齐（排序不影响计数）
  const stats = statsQuery.data
  const { totalCount, completedCount, processingCount } = useMemo(() => {
    const succeeded = stats?.succeeded ?? 0
    const processing = stats?.processing ?? 0
    const taskTotal = stats?.total ?? 0

    switch (currentTab) {
      case 'draft':
        return {
          totalCount: draftCountInRange,
          completedCount: 0,
          processingCount: 0,
        }
      case 'succeeded':
        return {
          totalCount: succeeded,
          completedCount: succeeded,
          processingCount: 0,
        }
      case 'running':
      case 'queued':
        return {
          totalCount: generationsQuery.total,
          completedCount: 0,
          processingCount: generationsQuery.total,
        }
      case 'failed':
        return {
          totalCount: generationsQuery.total,
          completedCount: 0,
          processingCount: 0,
        }
      default:
        return {
          totalCount: taskTotal + draftCountInRange,
          completedCount: succeeded,
          processingCount: processing,
        }
    }
  }, [
    currentTab,
    draftCountInRange,
    generationsQuery.total,
    stats?.processing,
    stats?.succeeded,
    stats?.total,
  ])

  const handleTabChange = (tab: AssetStatusFilter) => {
    setSelectedAssetIds(new Set())
    setForceSelectionMode(false)
    let statusParam: VideoGenerationTask['status'] | 'draft' | undefined =
      undefined
    if (tab === 'succeeded') statusParam = 'succeeded'
    else if (tab === 'running') statusParam = 'running'
    else if (tab === 'queued') statusParam = 'queued'
    else if (tab === 'failed') statusParam = 'failed'
    else if (tab === 'draft') statusParam = 'draft'

    updateSearch({
      page: 1,
      status: statusParam,
    })
  }

  const handleEnterBatchMode = () => {
    setForceSelectionMode(true)
  }

  const handleCancelSelection = () => {
    setSelectedAssetIds(new Set())
    setForceSelectionMode(false)
  }

  const splitSelectedAssetIds = (ids: Iterable<string>) => {
    const taskIds: string[] = []
    const draftIds: string[] = []
    for (const key of ids) {
      if (key.startsWith('task-')) taskIds.push(key.slice('task-'.length))
      else if (key.startsWith('draft-')) draftIds.push(key.slice('draft-'.length))
    }
    return { taskIds, draftIds }
  }

  const selectedDownloadableTaskIds = useMemo(() => {
    const taskById = new Map(
      assetItems
        .filter(
          (item): item is Extract<AssetListItem, { kind: 'task' }> =>
            item.kind === 'task'
        )
        .map((item) => [item.task.id, item.task] as const)
    )
    const ids: string[] = []
    for (const key of selectedAssetIds) {
      if (!key.startsWith('task-')) continue
      const taskId = key.slice('task-'.length)
      const task = taskById.get(taskId)
      // 仅「已完成」且有可下载地址的视频可批量下载。
      if (
        task?.status === 'succeeded' &&
        (task.file_url || task.video_url)
      ) {
        ids.push(taskId)
      }
    }
    return ids
  }, [assetItems, selectedAssetIds])

  const handleAssetSelectedChange = (assetId: string, selected: boolean) => {
    if (
      selected &&
      !selectedAssetIds.has(assetId) &&
      selectedAssetIds.size >= MAX_BATCH_SELECTION
    ) {
      toast.error(`一次最多选择 ${MAX_BATCH_SELECTION} 项内容`)
      return
    }
    let nextSize = selectedAssetIds.size
    setSelectedAssetIds((previous) => {
      const next = new Set(previous)
      if (selected) next.add(assetId)
      else next.delete(assetId)
      nextSize = next.size
      return next
    })
    if (nextSize === 0) setForceSelectionMode(false)
  }

  const requestBatchDelete = () => {
    const keys = Array.from(selectedAssetIds)
    if (keys.length === 0) return
    if (keys.length > MAX_BATCH_SELECTION) {
      toast.error(`一次最多删除 ${MAX_BATCH_SELECTION} 项内容`)
      return
    }
    setBatchDeleteConfirmOpen(true)
  }

  const handleBatchDelete = async () => {
    const keys = Array.from(selectedAssetIds)
    if (keys.length === 0) {
      setBatchDeleteConfirmOpen(false)
      return
    }
    if (keys.length > MAX_BATCH_SELECTION) {
      toast.error(`一次最多删除 ${MAX_BATCH_SELECTION} 项内容`)
      setBatchDeleteConfirmOpen(false)
      return
    }
    setBatchDeleteConfirmOpen(false)
    const { taskIds, draftIds } = splitSelectedAssetIds(keys)

    setBatchDeleting(true)
    try {
      // 成片与草稿解耦：仅提交勾选的 ids / draft_ids，删成片不会级联清草稿。
      const result = await batchDeleteVideoGenerations({
        ids: taskIds,
        draft_ids: draftIds,
      })
      setSelectedAssetIds(new Set())
      setForceSelectionMode(false)
      await Promise.all([
        generationsQuery.refetch(),
        draftsQuery.refetch(),
        statsQuery.refetch(),
      ])
      const failed =
        (result.failed_ids?.length ?? 0) + (result.failed_draft_ids?.length ?? 0)
      if (failed > 0) {
        toast.error(`${failed} 项删除失败，已删除 ${result.deleted} 项`)
      } else {
        toast.success(`已删除 ${result.deleted} 项内容`)
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, '批量删除失败'))
    } finally {
      setBatchDeleting(false)
    }
  }

  const triggerVideoDownload = async (ids: string[]) => {
    const result = await batchDownloadVideoGenerations(ids)
    if (!result.download_url) {
      throw new Error('未获取到下载地址')
    }
    const anchor = document.createElement('a')
    anchor.href = result.download_url
    anchor.download = result.filename || ''
    anchor.target = '_blank'
    anchor.rel = 'noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    await generationsQuery.refetch()
    return result
  }

  const handleBatchDownload = async () => {
    const { taskIds, draftIds } = splitSelectedAssetIds(selectedAssetIds)
    const downloadableIds = selectedDownloadableTaskIds
    const nonDownloadableTaskCount = taskIds.length - downloadableIds.length

    if (downloadableIds.length === 0) {
      toast.error('仅已完成的视频支持下载，请重新选择')
      return
    }

    const excludedParts: string[] = []
    if (draftIds.length > 0) excludedParts.push(`${draftIds.length} 个草稿`)
    if (nonDownloadableTaskCount > 0) {
      excludedParts.push(`${nonDownloadableTaskCount} 个未完成视频`)
    }
    if (excludedParts.length > 0) {
      toast.warning(
        `未纳入下载：${excludedParts.join('、')}（仅已完成视频可下载），将下载 ${downloadableIds.length} 个视频`
      )
    }

    if (downloadableIds.length > MAX_BATCH_SELECTION) {
      toast.error(`一次最多下载 ${MAX_BATCH_SELECTION} 个视频`)
      return
    }
    setBatchDownloading(true)
    try {
      const result = await triggerVideoDownload(downloadableIds)
      const failed = result.failed_ids?.length ?? 0
      if (result.mode === 'zip') {
        if (failed > 0) {
          toast.success(`已开始下载压缩包（含 ${result.count} 个视频，${failed} 项未下载）`)
        } else {
          toast.success(`已开始下载压缩包（含 ${result.count} 个视频）`)
        }
      } else if (failed > 0) {
        toast.success(`已开始下载视频（${failed} 项未下载）`)
      } else {
        toast.success('已开始下载视频')
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, '批量下载失败'))
    } finally {
      setBatchDownloading(false)
    }
  }

  const handleDownloadTask = async (task: VideoGenerationTask) => {
    if (!(task.file_url || task.video_url)) {
      toast.error('该视频暂无可下载文件')
      return
    }
    setDownloadingTaskId(task.id)
    try {
      await triggerVideoDownload([task.id])
      toast.success('已开始下载视频')
    } catch (error) {
      toast.error(getApiErrorMessage(error, '下载失败'))
    } finally {
      setDownloadingTaskId('')
    }
  }

  const handleDeleteDraft = async (draft: VideoDraft) => {
    setDeletingDraftID(draft.id)
    try {
      await deleteVideoDraft(draft.id)
      setPendingDeleteDraft(null)
      await draftsQuery.refetch()
      toast.success('草稿已删除')
    } catch (error) {
      toast.error(getApiErrorMessage(error, '草稿删除失败'))
    } finally {
      setDeletingDraftID('')
    }
  }

  const handleDeleteTask = async (task: VideoGenerationTask) => {
    setDeletingDraftID(task.id)
    try {
      await deleteVideoGeneration(task.id)
      setPendingDeleteTask(null)
      toast.success('视频已删除')
      await Promise.all([
        generationsQuery.refetch(),
        draftsQuery.refetch(),
        statsQuery.refetch(),
      ])
    } catch (error) {
      toast.error(getApiErrorMessage(error, '项目删除失败'))
    } finally {
      setDeletingDraftID('')
    }
  }

  const handleEditTask = (task: VideoGenerationTask) => {
    if (task.status !== 'succeeded' && task.status !== 'failed') {
      return
    }
    void navigate({
      to: '/create',
      search: {
        taskId: task.id,
        duplicate: 'true',
      },
    })
  }

  const previewableTasks = useMemo(
    () =>
      assetItems
        .filter((item) => item.kind === 'task')
        .map((item) => item.task)
        .filter((task) => Boolean(task.file_url || task.video_url)),
    [assetItems]
  )

  const openTaskPreview = (task: VideoGenerationTask) => {
    if (!(task.file_url || task.video_url)) return
    setPreviewTaskId(task.id)
  }

  const renderAssetGroup = (items: AssetListItem[]) => {
    return (
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-7'>
        {items.map((item) =>
          item.kind === 'task' ? (
            <div
              key={item.id}
              className='animate-in fade-in-0 zoom-in-95 duration-300 fill-mode-both'
            >
              <AssetProjectCard
                task={item.task}
                selected={selectedAssetIds.has(item.id)}
                selectionMode={selectionMode}
                showCreator={showCreatorOnCards}
                showThumb={showReactionControls}
                onSelectedChange={(selected) => {
                  handleAssetSelectedChange(item.id, selected)
                }}
                onOpen={() => openTaskPreview(item.task)}
                onEdit={() => handleEditTask(item.task)}
                onDelete={() => setPendingDeleteTask(item.task)}
                onDownload={() => void handleDownloadTask(item.task)}
                downloading={downloadingTaskId === item.task.id}
              />
            </div>
          ) : (
            <div
              key={item.id}
              className='animate-in fade-in-0 zoom-in-95 duration-300 fill-mode-both'
            >
              <DraftProjectCard
                draft={item.draft}
                selected={selectedAssetIds.has(item.id)}
                selectionMode={selectionMode}
                showCreator={showCreatorOnCards}
                showTime={showReactionControls}
                onSelectedChange={(selected) => {
                  handleAssetSelectedChange(item.id, selected)
                }}
                onEdit={() =>
                  void navigate({
                    to: '/create',
                    search: { draftId: item.draft.id },
                  })
                }
                onDelete={() => setPendingDeleteDraft(item.draft)}
                deleting={deletingDraftID === item.draft.id}
              />
            </div>
          )
        )}
      </div>
    )
  }

  const listLoading =
    (currentTab !== 'draft' && generationsQuery.isLoading) ||
    ((currentTab === 'all' || currentTab === 'draft') &&
      draftsQuery.isLoading)
  const listError =
    (currentTab !== 'draft' && generationsQuery.isError
      ? generationsQuery.error
      : null) ??
    ((currentTab === 'all' || currentTab === 'draft') && draftsQuery.isError
      ? draftsQuery.error
      : null)

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <Folder className='text-primary size-5 shrink-0' />
          <span className='truncate font-semibold'>资产</span>
          <Badge
            variant='outline'
            className='bg-primary/5 text-primary border-primary/20 hidden text-[10px] font-normal sm:inline-flex'
          >
            管理你的所有视频资产
          </Badge>
        </div>
        <div className='ms-auto flex items-center gap-1.5'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        {/* 顶部4栏数据统计卡片 */}
        <div className='grid grid-cols-2 gap-4 md:grid-cols-3'>
          <Card className='bg-card border-border/60 hover:border-primary/30 shadow-xs backdrop-blur-sm transition-colors'>
            <CardContent className='p-4 text-center sm:text-left'>
              <div className='text-muted-foreground text-xs font-medium'>
                总项目数
              </div>
              <div className='text-foreground mt-1 text-2xl font-bold tracking-tight'>
                {totalCount}
              </div>
            </CardContent>
          </Card>
          <Card className='bg-card border-border/60 shadow-xs backdrop-blur-sm transition-colors hover:border-emerald-500/30'>
            <CardContent className='p-4 text-center sm:text-left'>
              <div className='text-muted-foreground text-xs font-medium'>
                已完成
              </div>
              <div className='mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400'>
                {completedCount}
              </div>
            </CardContent>
          </Card>
          <Card className='bg-card border-border/60 shadow-xs backdrop-blur-sm transition-colors hover:border-blue-500/30'>
            <CardContent className='p-4 text-center sm:text-left'>
              <div className='text-muted-foreground text-xs font-medium'>
                处理中
              </div>
              <div className='mt-1 text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400'>
                {processingCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选条 / 批量工具条互斥切换 */}
        {selectionMode ? (
          <AssetBatchToolbar
            selectedCount={selectedAssetIds.size}
            deleting={batchDeleting}
            downloading={batchDownloading}
            downloadDisabled={selectedDownloadableTaskIds.length === 0}
            onDelete={requestBatchDelete}
            onDownload={() => void handleBatchDownload()}
            onCancel={handleCancelSelection}
          />
        ) : (
          <AssetFilterBar
            status={currentTab}
            onStatusChange={handleTabChange}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            onEnterBatchMode={handleEnterBatchMode}
            showViewScope={showViewScope}
            viewFilter={viewFilter}
            onViewFilterChange={setViewFilter}
          />
        )}

        {/* 关联任务展示 */}
        {search.task && (
          <LinkedTask
            task={linkedTaskQuery.data}
            loading={linkedTaskQuery.isLoading}
            error={linkedTaskQuery.error}
            onClose={() => updateSearch({ task: undefined })}
            onEdit={() => {
              if (linkedTaskQuery.data) handleEditTask(linkedTaskQuery.data)
            }}
            onPlayPreview={(task) => openTaskPreview(task)}
          />
        )}

        {/* 主列表内容展示区 */}
        {listLoading ? (
          <LoadingState />
        ) : listError ? (
          <ErrorState error={listError} />
        ) : assetItems.length > 0 ? (
          <AssetListByDate
            items={assetItems}
            hasMore={currentTab !== 'draft' && generationsQuery.hasMore}
            isLoadingMore={generationsQuery.isLoadingMore}
            onLoadMore={generationsQuery.loadMore}
            noMoreHint={currentTab === 'draft' ? '' : '没有更多了'}
            disableLoadMore={currentTab === 'draft'}
            dateOrder={sortOrder === 'oldest' ? 'asc' : 'desc'}
            renderGroup={(group) => renderAssetGroup(group.items)}
          />
        ) : (
          <div className='text-muted-foreground border-border/60 bg-card/30 flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border text-sm'>
            <Film className='size-10 opacity-30' />
            当前筛选条件下暂无项目记录
          </div>
        )}
      </Main>

      <VideoDetailModal
        open={Boolean(previewTaskId)}
        taskId={previewTaskId}
        tasks={previewableTasks}
        showReaction={showReactionControls}
        onClose={() => setPreviewTaskId(null)}
        onNavigate={setPreviewTaskId}
        onRegenerate={(task) => {
          setPreviewTaskId(null)
          handleEditTask(task)
        }}
        onReusePrompt={(prompt) => {
          stashReusePrompt(prompt)
          setPreviewTaskId(null)
          void navigate({
            to: '/create',
            search: {
              mode: 'custom',
              draftId: undefined,
              taskId: undefined,
              duplicate: undefined,
              humanId: undefined,
            },
          })
        }}
        onGenerateAgainSuccess={() => {
          setPreviewTaskId(null)
          void Promise.all([
            generationsQuery.refetch(),
            statsQuery.refetch(),
          ])
        }}
        onDownload={(task) => void handleDownloadTask(task)}
        downloading={Boolean(previewTaskId) && downloadingTaskId === previewTaskId}
      />

      <ConfirmDialog
        open={batchDeleteConfirmOpen}
        onOpenChange={setBatchDeleteConfirmOpen}
        title='确认删除'
        desc='删除已选项，操作不可恢复。'
        cancelBtnText='取消'
        confirmText='删除'
        destructive
        isLoading={batchDeleting}
        handleConfirm={() => void handleBatchDelete()}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteTask)}
        onOpenChange={(open) => {
          if (!open && !deletingDraftID) setPendingDeleteTask(null)
        }}
        title='确认删除'
        desc='确定删除此视频？删除后不可在列表中查看。此操作不可恢复。'
        cancelBtnText='取消'
        confirmText='删除'
        destructive
        isLoading={Boolean(
          pendingDeleteTask && deletingDraftID === pendingDeleteTask.id
        )}
        handleConfirm={() => {
          if (pendingDeleteTask) void handleDeleteTask(pendingDeleteTask)
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteDraft)}
        onOpenChange={(open) => {
          if (!open && !deletingDraftID) setPendingDeleteDraft(null)
        }}
        title='确认删除'
        desc='确定删除此草稿？操作不可恢复。'
        cancelBtnText='取消'
        confirmText='删除'
        destructive
        isLoading={Boolean(
          pendingDeleteDraft && deletingDraftID === pendingDeleteDraft.id
        )}
        handleConfirm={() => {
          if (pendingDeleteDraft) void handleDeleteDraft(pendingDeleteDraft)
        }}
      />
    </>
  )
}

function DraftProjectCard({
  draft,
  selected,
  selectionMode = false,
  showCreator = false,
  showTime = false,
  onSelectedChange,
  onEdit,
  onDelete,
  deleting,
}: {
  draft: VideoDraft
  selected: boolean
  selectionMode?: boolean
  showCreator?: boolean
  /** 「仅自己」时展示 HH:mm，无头像昵称 */
  showTime?: boolean
  onSelectedChange: (selected: boolean) => void
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const modeLabel =
    draft.mode === 'competitive' ? '竞品分析生成' : '自主素材生成'
  const showToolbar = !selectionMode
  const creatorName = draft.creator_nickname?.trim() || '未知用户'

  return (
    <Card
      className={cn(
        'group border-primary/40 bg-card hover:border-primary relative gap-0 overflow-hidden rounded-xl border-dashed py-0 shadow-xs transition-all duration-200 hover:shadow-md',
        selected && 'border-primary ring-primary/30 ring-2'
      )}
    >
      <div
        className='bg-muted/50 relative aspect-square w-full cursor-pointer overflow-hidden'
        onClick={() => {
          if (selectionMode) {
            onSelectedChange(!selected)
            return
          }
          onEdit()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          if (selectionMode) {
            onSelectedChange(!selected)
            return
          }
          onEdit()
        }}
        role='button'
        tabIndex={0}
      >
        <div className='flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center'>
          <div className='bg-primary/10 text-primary flex size-12 items-center justify-center rounded-lg'>
            <Folder className='size-6' />
          </div>
          <p className='text-muted-foreground line-clamp-2 text-[11px] leading-tight'>
            {modeLabel}
          </p>
        </div>

        <div
          className={cn(
            'absolute top-2 left-2 z-30 transition-opacity',
            selected || selectionMode
              ? 'opacity-100'
              : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'
          )}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(value) => onSelectedChange(value === true)}
            aria-label={`选择草稿 ${modeLabel}`}
            className='size-5 rounded-full border-white/80 bg-black/35 shadow-sm data-[state=checked]:border-primary'
          />
        </div>

        <div className='absolute top-2 right-2 z-10'>
          <span className='inline-flex rounded-full border border-zinc-500/30 bg-zinc-500/15 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 backdrop-blur-xs dark:text-zinc-400'>
            草稿
          </span>
        </div>

        {showToolbar ? (
          <div className='absolute inset-x-0 bottom-0 z-30 translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100'>
            <div className='flex items-center justify-center gap-1 bg-linear-to-t from-black/80 via-black/60 to-transparent px-2 pt-6 pb-2'>
              <Button
                size='icon'
                variant='secondary'
                className='size-8 rounded-full bg-white/90 text-zinc-900 hover:bg-white'
                title='编辑草稿'
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
              >
                <Pencil className='size-3.5' />
              </Button>
              <Button
                size='icon'
                variant='secondary'
                className='size-8 rounded-full bg-white/90 text-zinc-900 hover:bg-white hover:text-red-600'
                title='删除草稿'
                disabled={deleting}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                {deleting ? (
                  <Loader2 className='size-3.5 animate-spin' />
                ) : (
                  <Trash2 className='size-3.5' />
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      {showCreator || showTime ? (
        <AssetCreatorMeta
          name={creatorName}
          avatarUrl={draft.creator_avatar_url}
          createdAt={draft.created_at}
          showCreator={showCreator}
          className='border-border/50 border-t px-2.5'
        />
      ) : null}
    </Card>
  )
}

/** 状态 Badge/Pill 组件 */
function StatusPill({ status }: { status: VideoGenerationTask['status'] }) {
  switch (status) {
    case 'succeeded':
      return (
        <span className='inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 backdrop-blur-xs dark:text-emerald-400'>
          已完成
        </span>
      )
    case 'running':
      return (
        <span className='inline-flex animate-pulse items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-600 backdrop-blur-xs dark:text-blue-400'>
          渲染中
        </span>
      )
    case 'queued':
      return (
        <span className='inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 backdrop-blur-xs dark:text-amber-400'>
          生成中
        </span>
      )
    case 'failed':
      return (
        <span className='inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-600 backdrop-blur-xs dark:text-red-400'>
          失败
        </span>
      )
    case 'cancelled':
    case 'expired':
    default:
      return (
        <span className='inline-flex items-center gap-1 rounded-full border border-zinc-500/30 bg-zinc-500/15 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 backdrop-blur-xs dark:text-zinc-400'>
          草稿
        </span>
      )
  }
}

function LinkedTask({
  task,
  loading,
  error,
  onClose,
  onEdit,
  onPlayPreview,
}: {
  task?: VideoGenerationTask
  loading: boolean
  error: unknown
  onClose: () => void
  onEdit: () => void
  onPlayPreview?: (task: VideoGenerationTask) => void
}) {
  return (
    <section className='bg-muted/40 flex min-h-20 items-center gap-4 rounded-xl border p-4'>
      {loading ? (
        <Loader2 className='text-muted-foreground animate-spin' />
      ) : error || !task ? (
        <div className='text-destructive flex items-center gap-2 text-sm'>
          <CircleAlert />
          {getApiErrorMessage(error, '关联项目加载失败')}
        </div>
      ) : (
        <>
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='font-semibold'>关联项目记录</span>
              <StatusPill status={task.status} />
            </div>
            <div className='text-muted-foreground mt-1 truncate text-sm'>
              {task.model} · {formatSpec(task)} · {formatCredits(task)} 积分
            </div>
          </div>
          <div className='flex items-center gap-1.5'>
            {(task.status === 'succeeded' || task.status === 'failed') && (
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-8 gap-1 text-xs'
                  title='重新生成'
                  onClick={onEdit}
                >
                  <RotateCcw className='size-3.5' />
                  重新生成
                </Button>
              )}
            <TaskOutput task={task} onPlayPreview={onPlayPreview} />
          </div>
        </>
      )}
      <Button
        variant='ghost'
        size='icon'
        title='关闭关联记录'
        onClick={onClose}
      >
        <X />
      </Button>
    </section>
  )
}

function TaskOutput({
  task,
  onPlayPreview,
}: {
  task: VideoGenerationTask
  onPlayPreview?: (task: VideoGenerationTask) => void
}) {
  const url = task.file_url || task.video_url
  if (url) {
    return (
      <div className='flex items-center gap-1.5'>
        {task.status === 'succeeded' && onPlayPreview && (
          <Button
            variant='secondary'
            size='sm'
            className='h-8 gap-1 px-2.5 text-xs font-medium'
            onClick={() => onPlayPreview(task)}
          >
            <Play className='size-3 fill-current' />
            查看详情
          </Button>
        )}
        <Button
          asChild
          variant='outline'
          size='sm'
          className='h-8 gap-1 text-xs'
        >
          <a href={url} target='_blank' rel='noreferrer'>
            <ExternalLink className='size-3' />
            查看视频
          </a>
        </Button>
      </div>
    )
  }
  if (task.error_message) {
    return (
      <span
        className='block max-w-48 truncate text-xs text-red-600 dark:text-red-400'
        title={task.error_message}
      >
        {task.error_message}
      </span>
    )
  }
  return <span className='text-muted-foreground text-xs'>暂无输出</span>
}

function LoadingState() {
  return (
    <div className='text-muted-foreground flex min-h-72 items-center justify-center gap-2 text-sm'>
      <Loader2 className='animate-spin' />
      正在加载我的项目数据...
    </div>
  )
}

function ErrorState({ error }: { error: unknown }) {
  return (
    <div className='border-destructive/40 text-destructive mt-6 rounded-lg border p-4 text-sm'>
      {getApiErrorMessage(error, '项目加载失败')}
    </div>
  )
}

function formatSpec(task: VideoGenerationTask) {
  return (
    [task.resolution, task.ratio, task.duration ? `${task.duration}s` : '']
      .filter(Boolean)
      .join(' · ') || '-'
  )
}

function formatCredits(task: VideoGenerationTask) {
  return (task.charged_credits || task.estimated_credits || 0).toLocaleString()
}
