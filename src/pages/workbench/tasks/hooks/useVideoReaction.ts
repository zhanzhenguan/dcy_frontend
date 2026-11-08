import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/api/apiError'
import {
  setVideoGenerationReaction,
  type VideoGenerationTask,
} from '@/services/api/videoApi'
import type { AssetThumbValue } from '../components/AssetThumbControl'

function toApiReaction(value: AssetThumbValue): 'up' | 'down' | '' {
  if (value === 'up' || value === 'down') return value
  return ''
}

function fromApiReaction(value?: string | null): AssetThumbValue {
  if (value === 'up' || value === 'down') return value
  return null
}

/** 资产列表/详情赞踩：写接口并回写列表缓存。 */
export function useVideoReaction(taskId: string | undefined) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (next: AssetThumbValue) =>
      setVideoGenerationReaction(taskId!, toApiReaction(next)),
    onSuccess: (updated) => {
      queryClient.setQueriesData(
        { queryKey: ['video-generations'] },
        (old: unknown) => patchGenerationsCache(old, updated)
      )
      queryClient.setQueryData(['video-generation-detail', updated.id], updated)
      queryClient.setQueryData(['video-generation', updated.id], updated)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, '评价失败，请稍后重试'))
    },
  })

  return {
    setReaction: (next: AssetThumbValue) => {
      if (!taskId) return
      mutation.mutate(next)
    },
    isPending: mutation.isPending,
    fromApiReaction,
  }
}

function patchGenerationsCache(old: unknown, updated: VideoGenerationTask) {
  if (!old || typeof old !== 'object') return old
  const data = old as {
    pages?: Array<{ items?: VideoGenerationTask[]; total?: number }>
  }
  if (!Array.isArray(data.pages)) return old
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: (page.items ?? []).map((item) =>
        item.id === updated.id
          ? {
              ...item,
              my_reaction: updated.my_reaction ?? '',
              is_own: updated.is_own ?? item.is_own,
            }
          : item
      ),
    })),
  }
}

export { fromApiReaction }
