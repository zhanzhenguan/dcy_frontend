import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Sparkles, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { canViewCreditDetails } from '@/utils/tenantAccess'
import { getModelCatalog } from '@/services/api/modelApi'
import { getUserProfile } from '@/services/api/userProfileApi'
import { getVideoDraft, getVideoGeneration } from '@/services/api/videoApi'
import type { VideoDraft } from '@/services/api/videoApi'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import { CompetitiveAnalysisFlow } from './components/CompAnalFlow'
import { CustomMaterialFlow } from './components/cust-mate-flow'
import { CREATE_REENTER_EVENT } from './components/studioSession'

export type CreationMode = 'competitive' | 'custom'

type CreateVideoPageProps = {
  initialMode?: CreationMode
  draftId?: string
  taskId?: string
  createAsNew?: boolean
  initialHumanId?: string
}

export const CreateVideoPage = ({
  initialMode,
  draftId,
  taskId,
  createAsNew = false,
  initialHumanId,
}: CreateVideoPageProps) => {
  const navigate = useNavigate()
  const creditBalance = useAuthStore(
    (state) => state.auth.session?.credit_balance ?? 0
  )
  const canOpenCredits = useAuthStore((state) =>
    canViewCreditDetails(state.auth.session?.tenant)
  )
  const [studioRemountKey, setStudioRemountKey] = useState(0)

  // 显式草稿编辑走 draftId；成片再编辑/复制只走 taskId（向导数据来自任务 draft_data）
  const isDraftEdit = Boolean(draftId) && !createAsNew
  const isTaskBootstrap = Boolean(taskId) && createAsNew

  useEffect(() => {
    const onReenter = () => {
      void navigate({
        to: '/create',
        search: {
          mode: undefined,
          draftId: undefined,
          taskId: undefined,
          humanId: undefined,
        },
        replace: true,
      })
      setStudioRemountKey((value) => value + 1)
    }
    window.addEventListener(CREATE_REENTER_EVENT, onReenter)
    return () => window.removeEventListener(CREATE_REENTER_EVENT, onReenter)
  }, [navigate])

  const catalogQuery = useQuery({
    queryKey: ['model-catalog'],
    queryFn: getModelCatalog,
  })
  const profileQuery = useQuery({
    queryKey: ['user-profile'],
    queryFn: getUserProfile,
  })

  const draftQuery = useQuery({
    queryKey: ['video-draft', draftId],
    queryFn: () => getVideoDraft(draftId ?? ''),
    enabled: isDraftEdit,
  })

  const taskBootstrapQuery = useQuery({
    queryKey: ['video-generation-bootstrap', taskId],
    queryFn: () => getVideoGeneration(taskId ?? ''),
    enabled: isTaskBootstrap,
  })

  const bootstrappedDraft = useMemo((): VideoDraft | undefined => {
    if (isTaskBootstrap) {
      const task = taskBootstrapQuery.data
      if (!task?.draft_data?.trim()) return undefined
      return {
        creator_nickname: task.creator_nickname,
        id: `task-${task.id}`,
        mode: 'custom',
        current_step: 4,
        draft_data: task.draft_data,
        project_title: task.title || '',
        industry_name: task.industry || '',
        created_at: task.created_at,
        updated_at: task.updated_at,
      }
    }
    return draftQuery.data
  }, [isTaskBootstrap, taskBootstrapQuery.data, draftQuery.data])

  const isProjectEdit = isDraftEdit || isTaskBootstrap
  const projectLoading =
    (isDraftEdit && draftQuery.isLoading) ||
    (isTaskBootstrap && taskBootstrapQuery.isLoading)
  const projectError =
    (isDraftEdit && draftQuery.isError) ||
    (isTaskBootstrap &&
      (taskBootstrapQuery.isError || !taskBootstrapQuery.data?.draft_data?.trim()))

  const activeMode: CreationMode =
    (isProjectEdit ? bootstrappedDraft?.mode : undefined) ??
    initialMode ??
    'custom'

  const availableModels = useMemo(
    () =>
      (catalogQuery.data ?? []).flatMap((group) =>
        group.models
          .filter((item) => item.enabled && (item.weight ?? 1) > 0)
          .map((item) => ({
            ...item,
            providerCode: group.provider.code,
            provider_name: group.provider.name,
            generation_duration_min: group.generation_limits.generation_duration_min,
            generation_duration_max: group.generation_limits.generation_duration_max,
          }))
      ),
    [catalogQuery.data]
  )
  const userLocale = profileQuery.isPending
    ? undefined
    : (profileQuery.data?.locale ?? '')

  return (
    <div className='bg-background flex min-h-screen flex-col'>
      <Header className='border-b bg-surface' fixed>
        <Plus className='text-primary size-5 shrink-0' />
        <span className='truncate font-medium'>创建视频</span>
        <Badge
          variant='outline'
          className='bg-primary/5 text-primary border-primary/20 hidden text-[10px] font-normal sm:inline-flex'
        >
          默认自主素材创作
        </Badge>

        <div className='ms-auto flex items-center gap-2'>
          {canOpenCredits ? (
            <Link
              to='/credits'
              className='bg-muted hover:bg-muted/80 hidden cursor-pointer items-center gap-2 rounded-full px-3 py-1 text-sm transition-colors sm:flex'
              title='查看积分记录'
            >
              <Sparkles className='size-4 text-amber-500' />
              <span className='font-medium'>
                {creditBalance.toLocaleString('en-US')}
              </span>
              <span className='text-muted-foreground text-xs'>积分</span>
            </Link>
          ) : (
            <div
              className='bg-muted hidden items-center gap-2 rounded-full px-3 py-1 text-sm sm:flex'
              title='仅管理员可查看积分明细'
            >
              <Sparkles className='size-4 text-amber-500' />
              <span className='font-medium'>
                {creditBalance.toLocaleString('en-US')}
              </span>
              <span className='text-muted-foreground text-xs'>积分</span>
            </div>
          )}
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <main className='bg-background flex min-h-0 w-full flex-1 flex-col p-3 md:p-4 lg:p-5'>
        <div className='flex min-h-0 flex-1 flex-col'>
          {isProjectEdit && projectLoading ? (
            <div className='text-muted-foreground bg-card rounded-xl border p-8 text-center text-sm'>
              正在恢复项目...
            </div>
          ) : isProjectEdit && projectError ? (
            <div className='text-destructive border-destructive/40 bg-card rounded-xl border p-8 text-center text-sm'>
              项目加载失败，暂无法重新编辑
            </div>
          ) : activeMode === 'competitive' && isProjectEdit ? (
            <CompetitiveAnalysisFlow
              key={`${bootstrappedDraft?.id ?? taskId ?? 'competitive-new'}:${createAsNew ? 'copy' : 'edit'}`}
              availableModels={availableModels}
              creditBalance={creditBalance}
              initialDraft={bootstrappedDraft}
              existingTaskId={createAsNew ? undefined : taskId}
              createAsNew={createAsNew}
              initialHumanId={initialHumanId}
              userLocale={userLocale}
            />
          ) : (
            <CustomMaterialFlow
              key={
                isProjectEdit
                  ? `project-${draftId || taskId}:${createAsNew ? 'copy' : 'edit'}`
                  : `studio-${studioRemountKey}`
              }
              availableModels={availableModels}
              creditBalance={creditBalance}
              initialDraft={isProjectEdit ? bootstrappedDraft : undefined}
              existingTaskId={isDraftEdit && !createAsNew ? taskId : undefined}
              createAsNew={createAsNew}
              initialHumanId={initialHumanId}
              userLocale={userLocale}
            />
          )}
        </div>
      </main>
    </div>
  )
}
